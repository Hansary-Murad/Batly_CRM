const pool = require('../config/db');
const logger = require('../utils/logger');

exports.getShipments = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT s.*, c.company_name as client_name, o.id as order_id, o.status as order_status
            FROM shipments s
            LEFT JOIN orders o ON s.order_id = o.id
            LEFT JOIN clients c ON o.client_id = c.id
            ORDER BY s.expected_arrival ASC NULLS LAST
        `);
        res.json(rows);
    } catch (err) {
        logger.error(`Get shipments error: ${err.message}`);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

exports.createShipment = async (req, res) => {
    try {
        const { order_id, supplier_name, purchase_cost, logistics_cost = 0, customs_fee = 0, 
                expected_arrival, tracking_number, currency = 'TMT' } = req.body;

        logger.info(`Attempting to create shipment for order ID: ${order_id}`);

        if (!order_id) return res.status(400).json({ error: 'Не указан ID заказа (order_id)' });
        if (!supplier_name) return res.status(400).json({ error: 'Не указан поставщик' });
        if (purchase_cost === undefined || purchase_cost === null) return res.status(400).json({ error: 'Не указана стоимость закупки' });

        const orderCheck = await pool.query('SELECT id, status FROM orders WHERE id = $1', [order_id]);
        if (orderCheck.rows.length === 0) {
            return res.status(404).json({ error: `Заказ с ID ${order_id} не найден в базе данных` });
        }

        const validCurrency = ['TMT', 'USD'].includes(currency) ? currency : 'TMT';
        
        const pCost = parseFloat(purchase_cost);
        const lCost = parseFloat(logistics_cost) || 0;
        const cFee = parseFloat(customs_fee) || 0;

        const query = `
            INSERT INTO shipments 
            (order_id, supplier_name, purchase_cost, logistics_cost, customs_fee, 
             expected_arrival, tracking_number, status, currency) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'ordered', $8) RETURNING *
        `;
        
        const values = [
            order_id, 
            supplier_name, 
            pCost, 
            lCost, 
            cFee, 
            expected_arrival || null, 
            tracking_number || null, 
            validCurrency
        ];

        const { rows } = await pool.query(query, values);
        logger.info(`Shipment #${rows[0].id} created successfully`);

        try {
            await pool.query("UPDATE orders SET status = 'processing' WHERE id = $1", [order_id]);
        } catch (updateErr) {
            logger.warn(`Failed to update order status after shipment creation: ${updateErr.message}`);
        }

        res.status(201).json(rows[0]);

    } catch (err) {
        logger.error(`CRITICAL Shipment Error: ${err.message}`);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера при создании поставки', 
            details: err.message 
        });
    }
};

exports.updateShipmentStatus = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['ordered', 'in_transit', 'customs', 'arrived'];
        if (!validStatuses.includes(status)) throw new Error('Недопустимый статус');

        const { rows: currentRows } = await client.query('SELECT * FROM shipments WHERE id = $1', [id]);
        if (!currentRows.length) throw new Error('Поставка не найдена');

        const current = currentRows[0];
        let actualArrivalDate = current.actual_arrival;

        if (status === 'arrived' && !current.actual_arrival) {
            actualArrivalDate = new Date().toISOString().split('T')[0];
        } else if (status !== 'arrived') {
            actualArrivalDate = null;
        }

        await client.query(
            'UPDATE shipments SET status = $1, actual_arrival = $2 WHERE id = $3',
            [status, actualArrivalDate, id]
        );

        if (status === 'arrived' && current.order_id) {
            await client.query("UPDATE orders SET status = 'shipped' WHERE id = $1", [current.order_id]);
        }

        await client.query('COMMIT');
        logger.info(`Shipment #${id} status updated to '${status}'`);
        
        const { rows } = await client.query('SELECT * FROM shipments WHERE id = $1', [id]);
        res.json(rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Update shipment error: ${err.message}`);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

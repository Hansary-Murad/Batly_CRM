const pool = require('../config/db');
const logger = require('../utils/logger');

exports.createOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const { client_id, items, notes, currency = "USD" } = req.body;

        if (!client_id) throw new Error("Client is required");
        if (!items?.length) throw new Error("Add at least one item");

        let preCheckTotal = 0;
        for (const item of items) {
            preCheckTotal +=
                (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
        }

        const clientData = await client.query(
            `SELECT c.credit_limit, COALESCE(SUM(i.amount - i.paid_amount), 0) as current_debt
             FROM clients c
             LEFT JOIN orders o ON c.id = o.client_id
             LEFT JOIN invoices i ON o.id = i.order_id AND i.status != 'paid'
             WHERE c.id = $1
             GROUP BY c.id, c.credit_limit`,
            [client_id]
        );

        if (clientData.rows.length > 0) {
            const { credit_limit, current_debt } = clientData.rows[0];
            if (
                credit_limit > 0 &&
                parseFloat(current_debt) + preCheckTotal > credit_limit
            ) {
                throw new Error(
                    `Превышен кредитный лимит. Доступно: ${credit_limit - parseFloat(current_debt)}, Требуется: ${preCheckTotal}`
                );
            }
        }

        const { rows } = await client.query(
            `INSERT INTO orders (client_id, notes, currency, created_by, total_amount, status) 
             VALUES ($1, $2, $3, $4, 0, 'pending') RETURNING *`,
            [client_id, notes || null, currency, req.user.id]
        );
        const orderId = rows[0].id;

        let totalAmount = 0;
        for (const item of items) {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unit_price) || 0;
            const itemTotal = qty * price;
            totalAmount += itemTotal;

            const productId = item.product_id || null;
            const unit = item.unit || "pcs";

            let productName = item.name && item.name.trim() !== "" ? item.name : null;

            if (!productName && productId) {
                const prodRes = await client.query(
                    "SELECT name FROM products WHERE id = $1",
                    [productId]
                );
                if (prodRes.rows.length > 0) productName = prodRes.rows[0].name;
            }

            if (!productName) {
                productName = productId ? `Товар #${productId}` : "Без названия";
            }

            await client.query(
                `INSERT INTO order_items (order_id, product_id, name, quantity, unit, unit_price, total_price) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [orderId, productId, productName, qty, unit, price, itemTotal]
            );

            if (productId) {
                const stockCheck = await client.query(
                    "SELECT quantity FROM products WHERE id = $1",
                    [productId]
                );
                if (stockCheck.rows.length === 0)
                    throw new Error(`Товар с ID ${productId} не найден`);

                await client.query(
                    "UPDATE products SET quantity = quantity - $1 WHERE id = $2",
                    [qty, productId]
                );

                await client.query(
                    `INSERT INTO stock_movements (product_id, company_id, quantity_change, reason, reference_id, created_by) 
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [productId, req.user.company_id, -qty, "sale", orderId, req.user.id]
                );
            }
        }

        await client.query("UPDATE orders SET total_amount = $1 WHERE id = $2", [
            totalAmount,
            orderId,
        ]);

        await client.query(
            `INSERT INTO invoices (order_id, amount, currency, status, due_date, issue_date, paid_amount) 
             VALUES ($1, $2, $3, 'pending', NOW() + INTERVAL '30 days', NOW(), 0)`,
            [orderId, totalAmount, currency]
        );

        await client.query("COMMIT");

        res.status(201).json({
            message: "Order and invoice created",
            order: { ...rows[0], total_amount: totalAmount },
        });
    } catch (err) {
        await client.query("ROLLBACK");
        logger.error(`Create order error: ${err.message}`);
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
};

exports.getOrders = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT o.id, o.order_date, o.total_amount, o.currency, o.status, o.notes,
                   c.company_name as client_name, c.id as client_id,
                   COALESCE(i.status, 'no_invoice') as invoice_status,
                   COALESCE(i.paid_amount, 0) as paid_amount
            FROM orders o 
            JOIN clients c ON o.client_id = c.id
            LEFT JOIN invoices i ON o.id = i.order_id
            ORDER BY o.order_date DESC NULLS LAST, o.id DESC
        `);
        res.json(rows);
    } catch (err) {
        logger.error(`Get orders error: ${err.message}`);
        res.status(500).json({ error: "Server error" });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query(
            `
            SELECT o.*, c.company_name as client_name, c.contact_person, c.phone, c.address, c.tax_id,
                   json_agg(json_build_object(
                       'id', oi.id, 'name', COALESCE(oi.name, p.name, 'Product'),
                       'quantity', oi.quantity, 'unit', oi.unit,
                       'unit_price', oi.unit_price, 'total_price', oi.total_price
                   )) as items
            FROM orders o
            JOIN clients c ON o.client_id = c.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.id = $1 GROUP BY o.id, c.id
        `,
            [id]
        );

        if (!rows.length) return res.status(404).json({ error: "Order not found" });
        res.json(rows[0]);
    } catch (err) {
        logger.error(`Get order by ID error: ${err.message}`);
        res.status(500).json({ error: "Server error" });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = [
            "pending",
            "processing",
            "shipped",
            "completed",
            "cancelled",
        ];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const { rows } = await pool.query(
            "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
            [status, id]
        );

        if (!rows.length) return res.status(404).json({ error: "Order not found" });
        res.json(rows[0]);
    } catch (err) {
        logger.error(`Update order status error: ${err.message}`);
        res.status(500).json({ error: "Server error" });
    }
};

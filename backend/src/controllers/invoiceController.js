const pool = require('../config/db');
const logger = require('../utils/logger');

exports.getInvoices = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT 
                i.id,
                i.amount,
                i.paid_amount,
                i.currency,
                i.status,
                i.due_date,
                i.issue_date,
                i.payment_date,
                c.company_name as client_name,
                o.id as order_id
            FROM invoices i
            JOIN orders o ON i.order_id = o.id
            JOIN clients c ON o.client_id = c.id
            ORDER BY i.due_date ASC
        `);
        res.json(rows);
    } catch (err) {
        logger.error(`Get invoices error: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createInvoice = async (req, res) => {
    try {
        const { order_id, amount, currency = 'USD', due_date } = req.body;
        
        if (!order_id || !amount || !due_date) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const { rows } = await pool.query(
            `INSERT INTO invoices (order_id, amount, currency, due_date, status, paid_amount) 
             VALUES ($1, $2, $3, $4, 'pending', 0) RETURNING *`,
            [order_id, amount, currency, due_date]
        );
        logger.info(`Invoice created for order #${order_id}`);
        res.status(201).json(rows[0]);
    } catch (err) {
        logger.error(`Create invoice error: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.payInvoice = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { paid_amount } = req.body;

        if (!paid_amount || parseFloat(paid_amount) <= 0) {
            throw new Error('Invalid payment amount');
        }

        const { rows } = await client.query('SELECT * FROM invoices WHERE id = $1', [id]);
        if (!rows.length) throw new Error('Invoice not found');

        const invoice = rows[0];
        const newPaidTotal = parseFloat(invoice.paid_amount || 0) + parseFloat(paid_amount);
        const totalAmount = parseFloat(invoice.amount);

        let newStatus = 'partial';
        let paymentDate = invoice.payment_date;

        if (newPaidTotal >= totalAmount) {
            newStatus = 'paid';
            paymentDate = new Date().toISOString().split('T')[0];
        } else if (invoice.due_date && new Date() > new Date(invoice.due_date)) {
            newStatus = 'overdue';
        }

        await client.query(
            `UPDATE invoices 
             SET paid_amount = $1, status = $2, payment_date = $3 
             WHERE id = $4`,
            [newPaidTotal, newStatus, paymentDate, id]
        );

        await client.query('COMMIT');
        logger.info(`Payment registered for invoice #${id}: ${paid_amount} (${newStatus})`);
        res.json({ message: 'Payment registered', status: newStatus });
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Pay invoice error: ${err.message}`);
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
};

exports.deleteInvoice = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;

        const { rows } = await client.query('SELECT * FROM invoices WHERE id = $1', [id]);
        if (!rows.length) {
            throw new Error('Invoice not found');
        }

        const invoice = rows[0];

        if (invoice.status === 'paid') {
            throw new Error('Cannot delete paid invoice');
        }

        await client.query('DELETE FROM invoices WHERE id = $1', [id]);

        await client.query('COMMIT');
        logger.info(`Invoice #${id} deleted`);
        res.json({ message: 'Invoice deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Delete invoice error: ${err.message}`);
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
};

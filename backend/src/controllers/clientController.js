const pool = require('../config/db');
const logger = require('../utils/logger');

exports.getClients = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT c.*, COALESCE(SUM(i.amount - i.paid_amount), 0) as current_debt
            FROM clients c
            LEFT JOIN orders o ON c.id = o.client_id
            LEFT JOIN invoices i ON o.id = i.order_id AND i.status IN ('pending', 'overdue')
            WHERE c.is_active = TRUE
            GROUP BY c.id
            ORDER BY c.company_name ASC
        `);
        res.json(rows);
    } catch (err) {
        logger.error(`Get clients error: ${err.message}`);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

exports.createClient = async (req, res) => {
    try {
        const { company_name, contact_person, phone, email, tax_id, credit_limit } = req.body;
        if (!company_name) return res.status(400).json({ error: 'Название обязательно' });

        const { rows } = await pool.query(
            `INSERT INTO clients (company_name, contact_person, phone, email, tax_id, credit_limit) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [company_name, contact_person, phone, email, tax_id, credit_limit || 0]
        );
        logger.info(`Client created: ${company_name}`);
        res.status(201).json(rows[0]);
    } catch (err) {
        logger.error(`Create client error: ${err.message}`);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

exports.updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const { company_name, contact_person, phone, email, tax_id, credit_limit } = req.body;

        const { rows } = await pool.query(
            `UPDATE clients SET company_name=$1, contact_person=$2, phone=$3, 
             email=$4, tax_id=$5, credit_limit=$6 WHERE id=$7 RETURNING *`,
            [company_name, contact_person, phone, email, tax_id, credit_limit, id]
        );

        if (!rows.length) return res.status(404).json({ error: 'Клиент не найден' });
        logger.info(`Client updated: ${id}`);
        res.json(rows[0]);
    } catch (err) {
        logger.error(`Update client error: ${err.message}`);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

exports.deleteClient = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;

        const { rows: debtCheck } = await client.query(
            `SELECT COALESCE(SUM(amount - paid_amount), 0) as debt 
             FROM invoices i JOIN orders o ON i.order_id = o.id 
             WHERE o.client_id = $1 AND i.status != 'paid'`,
            [id]
        );

        if (parseFloat(debtCheck[0].debt) > 0) {
            throw new Error('Нельзя удалить клиента с долгами');
        }

        const { rows } = await client.query('UPDATE clients SET is_active = FALSE WHERE id = $1 RETURNING *', [id]);
        if (!rows.length) throw new Error('Клиент не найден');

        await client.query('COMMIT');
        logger.info(`Client deactivated: ${id}`);
        res.json({ message: 'Клиент скрыт' });
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Delete client error: ${err.message}`);
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
};

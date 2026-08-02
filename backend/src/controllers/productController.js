const pool = require('../config/db');
const logger = require('../utils/logger');

exports.getProducts = async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const result = await pool.query(
            'SELECT * FROM products WHERE company_id = $1 AND is_active = TRUE ORDER BY name ASC',
            [companyId]
        );
        res.json(result.rows);
    } catch (err) {
        logger.error(`Get products error: ${err.message}`);
        res.status(500).json({ error: 'Ошибка получения списка товаров' });
    }
};

exports.upsertProduct = async (req, res) => {
    try {
        const { name, quantity, price } = req.body;
        const companyId = req.user.company_id;

        if (!name || price === undefined) {
            return res.status(400).json({ error: 'Название и цена обязательны' });
        }

        const existingProduct = await pool.query(
            'SELECT * FROM products WHERE company_id = $1 AND LOWER(name) = LOWER($2)',
            [companyId, name]
        );

        let result;
        if (existingProduct.rows.length > 0) {
            const product = existingProduct.rows[0];
            const newQty = product.quantity + parseInt(quantity || 0);
            result = await pool.query(
                'UPDATE products SET quantity = $1, price = $2, is_active = TRUE WHERE id = $3 RETURNING *',
                [newQty, price, product.id]
            );
            logger.info(`Product updated: ${name} (qty: ${newQty}, price: ${price})`);
        } else {
            result = await pool.query(
                `INSERT INTO products (company_id, name, quantity, price, is_active) 
                 VALUES ($1, $2, $3, $4, TRUE) RETURNING *`,
                [companyId, name, quantity || 0, price]
            );
            logger.info(`New product created: ${name}`);
        }

        res.status(201).json(result.rows[0]);
    } catch (err) {
        logger.error(`Upsert product error: ${err.message}`);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

exports.hideProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const companyId = req.user.company_id;

        const result = await pool.query(
            'UPDATE products SET is_active = FALSE WHERE id = $1 AND company_id = $2 RETURNING *',
            [productId, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        logger.info(`Product hidden: ID ${productId}`);
        res.json({ message: 'Товар скрыт из списка' });
    } catch (err) {
        logger.error(`Hide product error: ${err.message}`);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'batly-enterprise-secret-key-2026';

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (!rows.length) return res.status(400).json({ error: 'Пользователь не найден' });

        const user = rows[0];
        if (!await bcrypt.compare(password, user.password_hash)) {
            return res.status(400).json({ error: 'Неверный пароль' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, position: user.position },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        logger.info(`User logged in: ${user.email}`);
        res.json({ token, user: { id: user.id, email: user.email, role: user.role, position: user.position } });
    } catch (err) {
        logger.error('Login error:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

exports.register = async (req, res) => {
    try {
        const { email, password, role, position } = req.body;
        
        const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.length) return res.status(400).json({ error: 'Email уже занят' });

        const passwordHash = await bcrypt.hash(password, 10);
        const { rows } = await pool.query(
            `INSERT INTO users (email, password_hash, role, position) 
             VALUES ($1, $2, $3, $4) RETURNING id, email, role, position`,
            [email, passwordHash, role || 'manager', position || 'Сотрудник']
        );

        logger.info(`New user registered: ${email}`);
        res.status(201).json(rows[0]);
    } catch (err) {
        logger.error('Register error:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

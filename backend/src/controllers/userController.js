const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const logger = require('../utils/logger');

exports.getUsers = async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, email, role, position FROM users ORDER BY id ASC'
        );
        res.json(rows);
    } catch (err) {
        logger.error(`Get users error: ${err.message}`);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { email, password, role = 'manager', position = 'Сотрудник' } = req.body;
        
        const validRoles = ['admin', 'manager', 'viewer'];
        const normalizedRole = validRoles.includes(role) ? role : 'manager';
        
        if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });

        const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.length) return res.status(400).json({ error: 'Email уже занят' });

        const passwordHash = await bcrypt.hash(password, 10);
        const { rows } = await pool.query(
            `INSERT INTO users (email, password_hash, role, position) 
             VALUES ($1, $2, $3, $4) RETURNING id, email, role, position`,
            [email, passwordHash, normalizedRole, position]
        );
        
        logger.info(`New user created: ${email} (${normalizedRole})`);
        res.status(201).json(rows[0]);
    } catch (err) {
        logger.error(`Create user error: ${err.message}`);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, position } = req.body;

        const validRoles = ['admin', 'manager', 'viewer'];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({ error: 'Недопустимая роль' });
        }

        const { rows } = await pool.query(
            `UPDATE users SET role = COALESCE($1, role), position = COALESCE($2, position) 
             WHERE id = $3 RETURNING id, email, role, position`,
            [role, position, id]
        );

        if (!rows.length) return res.status(404).json({ error: 'Пользователь не найден' });
        
        logger.info(`User #${id} updated: role=${role || 'unchanged'}, position=${position || 'unchanged'}`);
        res.json(rows[0]);
    } catch (err) {
        logger.error(`Update user error: ${err.message}`);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Нельзя удалить свой аккаунт' });
        }

        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        logger.info(`User #${userId} deleted by admin #${req.user.id}`);
        res.json({ message: 'Сотрудник удален' });
    } catch (err) {
        logger.error(`Delete user error: ${err.message}`);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

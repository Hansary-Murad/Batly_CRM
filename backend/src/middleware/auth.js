const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'batly-enterprise-secret-key-2026';

module.exports = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        logger.error(`Auth error: ${err.message}`);
        res.status(401).json({ error: 'Невалидный токен' });
    }
};

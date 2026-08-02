const logger = require('../utils/logger');

module.exports = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        logger.warn(`RBAC denied: ${req.user?.role || 'unauthorized'} → [${roles.join(',')}]`);
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    next();
};

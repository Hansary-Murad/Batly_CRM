const express = require('express');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const { validate, schemas } = require('../middleware/validation');
const { createOrder, getOrders, getOrderById, updateOrderStatus } = require('../controllers/orderController');

const router = express.Router();

router.use(auth);

router.get('/', getOrders);
router.post('/', rbac('admin', 'manager'), validate(schemas.order), createOrder);
router.get('/:id', getOrderById);
router.put('/:id/status', rbac('admin', 'manager'), updateOrderStatus);

module.exports = router;

const express = require('express');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const { getShipments, createShipment, updateShipmentStatus } = require('../controllers/shipmentController');
const router = express.Router();

router.use(auth);
router.get('/', getShipments);
router.post('/', rbac('admin', 'manager'), createShipment);
router.put('/:id/status', rbac('admin', 'manager'), updateShipmentStatus);

module.exports = router;

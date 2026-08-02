const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const clientRoutes = require('./clientRoutes');
const orderRoutes = require('./orderRoutes');
const productRoutes = require('./productRoutes');
const shipmentRoutes = require('./shipmentRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const documentRoutes = require('./documentRoutes');
const userRoutes = require('./userRoutes');

router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);
router.use('/orders', orderRoutes);
router.use('/products', productRoutes);
router.use('/shipments', shipmentRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/documents', documentRoutes);
router.use('/users', userRoutes);

module.exports = router;

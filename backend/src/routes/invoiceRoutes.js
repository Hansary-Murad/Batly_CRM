const express = require('express');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const { getInvoices, createInvoice, payInvoice, deleteInvoice } = require('../controllers/invoiceController');
const router = express.Router();

router.use(auth);

router.get('/', getInvoices);
router.post('/', rbac('admin', 'manager'), createInvoice);
router.put('/pay/:id', rbac('admin', 'manager'), payInvoice);
router.delete('/:id', rbac('admin'), deleteInvoice);

module.exports = router;

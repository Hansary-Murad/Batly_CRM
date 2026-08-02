const express = require('express');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const { 
    generateInvoicePDF, 
    generateDeliveryActPDF, 
    exportInvoicesToExcel 
} = require('../controllers/documentController');
const router = express.Router();

router.use(auth);

router.get('/invoice/:id', generateInvoicePDF);
router.get('/act/:id', generateDeliveryActPDF);
router.get('/export-excel', rbac('admin', 'manager'), exportInvoicesToExcel);

module.exports = router;
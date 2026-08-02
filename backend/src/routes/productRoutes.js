const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const { getProducts, upsertProduct, hideProduct } = require('../controllers/productController');

router.use(auth);

router.get('/', getProducts);
router.post('/', rbac('admin', 'manager'), upsertProduct);
router.delete('/:id', rbac('admin'), hideProduct);

module.exports = router;

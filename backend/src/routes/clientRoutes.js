const express = require('express');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const { validate, schemas } = require('../middleware/validation');
const { getClients, createClient, updateClient, deleteClient } = require('../controllers/clientController');
const router = express.Router();

router.use(auth);
router.get('/', getClients);
router.post('/', rbac('admin', 'manager'), validate(schemas.client), createClient);
router.put('/:id', rbac('admin', 'manager'), validate(schemas.client), updateClient);
router.delete('/:id', rbac('admin'), deleteClient);

module.exports = router;

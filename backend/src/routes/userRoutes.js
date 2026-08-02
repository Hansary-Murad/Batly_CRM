const express = require('express');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');
const router = express.Router();

router.use(auth);
router.get('/', rbac('admin'), getUsers);
router.post('/', rbac('admin'), createUser);
router.put('/:id', rbac('admin'), updateUser);
router.delete('/:id', rbac('admin'), deleteUser);

module.exports = router;

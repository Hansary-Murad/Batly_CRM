const express = require('express');
const auth = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/dashboardController');
const router = express.Router();

router.use(auth);
router.get('/', getDashboardStats);

module.exports = router;

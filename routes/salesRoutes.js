const express = require('express');
const router = express.Router();
const { getRecentSales,getTotalSales } = require('../controllers/salesController');

// Route to get recent sales
router.get('/recent-sales/:user_id', getRecentSales);
router.get('/total-sales/:user_id', getTotalSales);

module.exports = router;

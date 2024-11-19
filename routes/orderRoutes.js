// orderRoutes.js
const express = require('express');
const router = express.Router();
const { createOrder, getOrders, updateOrderStatus, getOrderWithItems, getOrdersByUserId, getOrderDetails, cancelOrder  } = require('../controllers/orderController');


router.post('/addOrders', createOrder);
router.get('/pending/:user_id', getOrders);
router.put('/:orderId/status', updateOrderStatus);
router.get('/orders/:orderId', getOrderWithItems);
router.get('/user/:userId', getOrdersByUserId);
router.get('/detailed/:orderId/details', getOrderDetails);
router.post('/cancel/:orderId', cancelOrder);
module.exports = router;

const express = require('express');
const router = express.Router();
const { getAllProductsWithUserDetails, getAllUsers,updateProductStatus,getNewUsers,getNewProducts } = require('../controllers/adminController');

// Route to get all products with user details
router.get('/products', getAllProductsWithUserDetails);

// Route to get all users
router.get('/users', getAllUsers);

router.put('/update/:productId/status', updateProductStatus);

router.get('/new-products', getNewProducts);
router.get('/new-users', getNewUsers);


module.exports = router;

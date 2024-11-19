const express = require('express');
const router = express.Router();


const { getProducts, addProduct, getProductById, updateProduct, deleteProduct, getProductsByUserId,getDetailsProducts } = require('../controllers/productController');

// Define product routes
router.get('/', getProducts);                     // GET all products
router.post('/', addProduct);                     // POST a new product          
router.get('/user/:user_id', getProductsByUserId); // GET products by user ID
router.get('/:id', getProductById);                 // GET a product by ID
router.put('/:id', updateProduct);                 // PUT to update a product by ID
router.delete('/:id', deleteProduct);
router.get('/details/:id', getDetailsProducts); 

module.exports = router;

const express = require('express');
const router = express.Router();
const basketController = require('../controllers/basketController');

// Route to add a product to the basket
router.post('/add', basketController.addToBasket);

// Route to get all basket items for a specific user
router.get('/:user_id', basketController.userIdBasket);

// Route to update the quantity of a product in the basket
router.put('/update/:id', basketController.updateQuantity);

// Route to remove a product from the basket
router.delete('/delete/:id', basketController.removeItem);

module.exports = router;

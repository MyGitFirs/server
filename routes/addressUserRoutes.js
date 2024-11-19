
const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');

// GET address by user_id
router.get('/get_user/:user_id', addressController.getAddressByUserId);

router.post('/add/:user_id', addressController.addAddressByUserId);
// PUT update an address by user_id
router.put('/update/:user_id', addressController.updateAddressByUserId);

router.delete('/delete/:id', addressController.deleteAddress);

module.exports = router;

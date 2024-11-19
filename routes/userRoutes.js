// /routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');


router.put('/update-user/:user_id', userController.updateUser);
router.put('/change-pass/:user_id', userController.changePassword);


module.exports = router;

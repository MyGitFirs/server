const express = require('express');
const { getReviewId, postReview,getReviewSummary } = require('../controllers/reviewController');

const router = express.Router();

// Route to get reviews for a product
router.get('/list/:productId', getReviewId);
router.get('/summary/:productId', getReviewSummary);
// Route to post a new review
router.post('/add', postReview);

module.exports = router;

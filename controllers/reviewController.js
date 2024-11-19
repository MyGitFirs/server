const sql = require('mssql'); 
const config = require('../db');

const getReviewId = async (req, res) => {
  const productId = parseInt(req.params.productId, 10); // Ensure productId is an integer
  console.log('Product ID:', productId);

  try {
    const pool = await sql.connect(config);
    // Modify the query to join the users table and get the user's name
    const result = await pool.request()
      .input('productId', sql.Int, productId) // Use sql.Int to handle productId correctly
      .query(`
        SELECT 
          r.review_id, 
          r.product_id, 
          r.user_id, 
          r.rating, 
          r.review_title, 
          r.review_text, 
          r.would_recommend, 
          r.created_at, 
          u.name AS reviewer_name 
        FROM reviews r
        INNER JOIN users u ON r.user_id = u.user_id
        WHERE r.product_id = @productId
      `);

    console.log('Query Result:', result.recordset); // Log the result for debugging

    // Return an empty array if no reviews are found
    res.json(result.recordset.length > 0 ? result.recordset : []);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).send('Error fetching reviews');
  }
};

  

// API to submit a review
const postReview = async (req, res) => {
    const { productId, userId, rating, reviewTitle, reviewText, wouldRecommend } = req.body;
    console.log(req.body);
  
    try {
      await sql.query`INSERT INTO reviews (product_id, user_id, rating, review_title, review_text, would_recommend, created_at)
                      VALUES (${productId}, ${userId}, ${rating}, ${reviewTitle}, ${reviewText}, ${wouldRecommend}, GETDATE())`;
      res.status(200).send('Review added successfully');
    } catch (err) {
      console.error('Error adding review:', err);
      res.status(500).send('Error adding review');
    }
  };
  const getReviewSummary = async (req, res) => {
    const productId = parseInt(req.params.productId, 10); // Ensure productId is an integer
    console.log('Product ID for summary:', productId);
  
    try {
      const pool = await sql.connect(config);
  
      // Query to calculate the total number of reviews, average rating, and count of each star rating
      const result = await pool.request()
        .input('productId', sql.Int, productId)
        .query(`
          SELECT 
            COUNT(*) AS total_reviews, 
            ISNULL(AVG(CAST(rating AS FLOAT)), 0) AS average_rating,
            SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS numOfFiveStar,
            SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS numOfFourStar,
            SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS numOfThreeStar,
            SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS numOfTwoStar,
            SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS numOfOneStar
          FROM reviews
          WHERE product_id = @productId
        `);
  
      // Check if any reviews are found and send the result
      if (result.recordset.length === 0) {
        console.log('No reviews found for the given product ID.');
        res.status(404).json({ message: 'No reviews found for the given product ID' });
      } else {
        res.json(result.recordset[0]); // Return the summary with all the counts
      }
    } catch (err) {
      console.error('Error fetching review summary:', err);
      res.status(500).send('Error fetching review summary');
    }
  };

module.exports = {
    getReviewId,
    postReview,
    getReviewSummary
};
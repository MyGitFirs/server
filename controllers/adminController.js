const sql = require('mssql'); // Ensure you have mssql imported
const config = require('../db'); // Import your database configuration

// Function to get all products with user details
const getAllProductsWithUserDetails = async (req, res) => {
  try {
    // Connect to the database
    const pool = await sql.connect(config);

    // SQL query to get all products and join with users table
    const result = await pool.request().query(`
      SELECT 
        p.product_id, 
        p.name AS product_name, 
        p.price, 
        p.description, 
        p.image_url, 
        p.discount_percentage, 
        p.discount_price,
        p.created_at,
        p.status,
        s.quantity, 
        u.user_id, 
        u.name AS user_name, 
        u.email AS user_email, 
        u.address AS user_address
      FROM products p
      INNER JOIN stock s ON p.product_id = s.product_id
      INNER JOIN users u ON p.user_id = u.user_id
      ORDER BY p.product_id DESC
    `);

    // Check if products are found
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'No products found' });
    }

    // Return the products along with user details
    res.status(200).json({ products: result.recordset });
  } catch (err) {
    console.error("Error fetching products with user details:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Function to get all users
const getAllUsers = async (req, res) => {
  try {
    // Connect to the database
    const pool = await sql.connect(config);

    // SQL query to get all users
    const result = await pool.request().query(`
      SELECT 
        user_id, 
        name, 
        email, 
        user_role, 
        address, 
        created_at 
      FROM users
      ORDER BY created_at DESC
    `);

    // Check if users are found
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    // Return the users in the response
    res.status(200).json({ users: result.recordset });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
const updateProductStatus = async (req, res) => {
    const { productId } = req.params; // Get the product ID from the request parameters
    const { status } = req.body; // Get the status from the request body
    // Validate the input status
    const validStatuses = ['approve', 'pending', 'denied'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid status provided' });
    }
  
    try {
      // Connect to the database
      const pool = await sql.connect(config);
  
      // Update the product status
      const result = await pool.request()
        .input('productId', sql.Int, productId)
        .input('status', sql.NVarChar, status)
        .query(`
          UPDATE products 
          SET status = @status, updated_at = GETDATE() 
          WHERE product_id = @productId
        `);
  
      // Check if the product was updated
      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ message: 'Product not found or status not updated' });
      }
  
      res.status(200).json({ message: 'Product status updated successfully' });
    } catch (err) {
      console.error("Error updating product status:", err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };
  const getNewUsers = async (req, res) => {
    const { lastChecked } = req.query; 
    
  
    if (!lastChecked) {
      return res.status(400).json({ message: 'lastChecked query parameter is required' });
    }
  
    try {
      // Connect to the database
      const pool = await sql.connect(config);
  
      // Fetch only necessary user details created after lastChecked
      const result = await pool.request()
        .input('lastChecked', sql.DateTime, new Date(lastChecked))
        .query(`
          SELECT 
            user_id, 
            name, 
            email, 
            created_at 
          FROM users
          WHERE created_at > @lastChecked
          ORDER BY created_at ASC
        `);
  
      // Return the new users or an empty array
      res.status(200).json({ newUsers: result.recordset });
    } catch (err) {
      console.error("Error fetching new users:", err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };
  const getNewProducts = async (req, res) => {
    const { lastChecked } = req.query;
    
  
    if (!lastChecked) {
      return res.status(400).json({ message: 'lastChecked query parameter is required' });
    }
  
    try {
      // Connect to the database
      const pool = await sql.connect(config);
  
      // Fetch only necessary product details created after lastChecked
      const result = await pool.request()
        .input('lastChecked', sql.DateTime, new Date(lastChecked))
        .query(`
          SELECT 
            p.product_id, 
            p.name AS product_name, 
            p.price, 
            p.created_at,
            p.status
          FROM products p
          WHERE p.created_at > @lastChecked
          ORDER BY p.created_at ASC
        `);
  
      // Return the new products or an empty array
      res.status(200).json({ newProducts: result.recordset });
    } catch (err) {
      console.error("Error fetching new products:", err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };
  
module.exports = {
  getAllProductsWithUserDetails,
  getAllUsers, // Export the new function
  updateProductStatus,
  getNewUsers,
  getNewProducts
};

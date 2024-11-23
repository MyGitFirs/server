const sql = require('mssql'); // Ensure you have mssql imported
const config = require('../db');

const getProducts = async (req, res) => {
  try {
    const pool = await sql.connect(config);

    // Get page and pageSize from query parameters (with default values)
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;
    const offset = (page - 1) * pageSize;

    // Modified query to include user name, join with users table, and filter by status
    const result = await pool.request()
      .query(`
        SELECT p.product_id, p.name, p.price, p.image_url, p.description, p.discount_percentage, p.discount_price, 
               s.quantity, u.user_id, u.name AS user_name
        FROM products p
        INNER JOIN stock s ON p.product_id = s.product_id
        INNER JOIN users u ON p.user_id = u.user_id
        WHERE p.status = 'approve'  -- Filter to only include products with status 'approve'
        ORDER BY p.product_id DESC  
        OFFSET ${offset} ROWS
        FETCH NEXT ${pageSize} ROWS ONLY
      `);

    // If no products are found, return a 404 response
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'No products found' });
    }

    // Return the products in the response
    res.status(200).json({
      page,
      pageSize,
      products: result.recordset
    });

  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



const getDetailsProducts = async (req, res) => {
  try {
    const { id } = req.params; // Extract the product ID from the request parameters
    const pool = await sql.connect(config);

    // Query to select product details where product_id matches the given id
    const result = await pool.request()
      .input('id', sql.Int, id) // Use a parameterized query to prevent SQL injection
      .query(`
        SELECT p.product_id, p.name, p.price, p.description, p.discount_percentage, s.quantity, 
               p.discount_price, u.user_id, u.name AS user_name, 
               u.address AS farm_address
        FROM products p
        INNER JOIN stock s ON p.product_id = s.product_id
        INNER JOIN users u ON p.user_id = u.user_id
        WHERE p.product_id = @id
      `);

    // If no product is found, return a 404 response
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Return the product details in the response
    res.status(200).json({
      product: result.recordset[0]
    });

  } catch (err) {
    console.error("Error fetching product details:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



// Get a product by ID
const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await sql.connect(config);

    const result = await pool.request()
      .input('product_id', sql.Int, id) // Ensure `id` is properly typed
      .query(`
        SELECT 
          p.product_id, 
          p.name, 
          p.description, 
          p.price, 
          p.harvest_date, 
          p.updated_at,
          p.image_url,
          s.quantity
        FROM products p
        LEFT JOIN stock s ON p.product_id = s.product_id
        WHERE p.product_id = @product_id
      `);

    // Handle empty result set
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Internal server error' }); // Avoid exposing sensitive details
  }
};


// Get products by user ID
const getProductsByUserId = async (req, res) => {
  const { user_id } = req.params;
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('user_id', sql.Int, user_id) // Adjust type based on your database
      .query(`
        SELECT p.*, s.quantity
        FROM products p
        LEFT JOIN stock s ON p.product_id = s.product_id
        WHERE p.user_id = @user_id
      `);
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
};


// Add a new product
const addProduct = async (req, res) => {
  const { 
    name, 
    description, 
    price, 
    image_url, 
    harvest_date, 
    freshness_rating, 
    user_id, 
    discount_percentage, 
    discount_price, 
    stock_quantity 
  } = req.body;

  if (!stock_quantity) {
    return res.status(400).json({ message: "Stock quantity is required" });
  }

  let transaction;

  try {
    const pool = await sql.connect(config);

    // Start transaction
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Insert product (including status as 'pending')
    const productResult = await transaction.request()
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description)
      .input('price', sql.Decimal, price)
      .input('image_url', sql.NVarChar, image_url)
      .input('harvest_date', sql.DateTime, harvest_date)
      .input('freshness_rating', sql.Int, freshness_rating)
      .input('user_id', sql.Int, user_id)
      .input('discount_percentage', sql.Int, discount_percentage)
      .input('discount_price', sql.Decimal, discount_price)
      .query(`
        INSERT INTO products 
        (name, description, price, image_url, harvest_date, freshness_rating, user_id, created_at, updated_at, discount_percentage, discount_price, status) 
        OUTPUT inserted.product_id
        VALUES 
        (@name, @description, @price, @image_url, @harvest_date, @freshness_rating, @user_id, GETDATE(), GETDATE(), @discount_percentage, @discount_price, 'pending')
      `);

    const productId = productResult.recordset[0].product_id;

    // Insert stock details for the product into the stocks table
    await transaction.request()
      .input('product_id', sql.Int, productId)
      .input('stock_quantity', sql.Int, stock_quantity)
      .query(`
        INSERT INTO stock (product_id, quantity, created_at, updated_at) 
        VALUES (@product_id, @stock_quantity, GETDATE(), GETDATE())
      `);

    // Commit transaction
    await transaction.commit();

    res.status(200).json({ message: 'Product and stock added successfully', productId });
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }
    res.status(500).send({ message: 'Failed to add product and stock', error: err.message });
  }
};

// Update a product by ID
const updateProduct = async (req, res) => {
  const productId = req.params.id;
  const { name, description, price, stock_quantity, image_url, harvest_date, freshness_rating, user_id } = req.body;

  try {
      // Dynamically build the update query and parameters
      let updateFields = [];
      let parameters = {};

      if (name) {
          updateFields.push('name = @name');
          parameters.name = name;
      }
      if (description) {
          updateFields.push('description = @description');
          parameters.description = description;
      }
      if (price !== undefined && price !== null) {
          updateFields.push('price = @price');
          parameters.price = price;
      }
      if (stock_quantity !== undefined && stock_quantity !== null) {
          updateFields.push('stock_quantity = @stock_quantity');
          parameters.stock_quantity = stock_quantity;
      }
      if (image_url) {
          updateFields.push('image_url = @image_url');
          parameters.image_url = image_url;
      }
      if (harvest_date) {
          updateFields.push('harvest_date = @harvest_date');
          parameters.harvest_date = harvest_date;
      }
      if (freshness_rating !== undefined && freshness_rating !== null) {
          updateFields.push('freshness_rating = @freshness_rating');
          parameters.freshness_rating = freshness_rating;
      }
      if (user_id) {
          updateFields.push('user_id = @user_id');
          parameters.user_id = user_id;
      }

      // Check if there are fields to update
      if (updateFields.length === 0) {
          return res.status(400).json({
              success: false,
              error: 'No fields to update.',
          });
      }

      // Construct the dynamic SQL query
      const query = `
          UPDATE Products
          SET ${updateFields.join(', ')}, updated_at = GETDATE()
          WHERE product_id = @product_id
      `;

      const request = new sql.Request();
      Object.keys(parameters).forEach(param => {
          request.input(param, sql.VarChar, parameters[param]);
      });
      request.input('product_id', sql.Int, productId);

      // Execute the query
      const result = await request.query(query);

      if (result.rowsAffected[0] > 0) {
          return res.status(200).json({
              success: true,
              message: 'Product updated successfully!',
          });
      } else {
          return res.status(404).json({
              success: false,
              error: 'Product not found or no changes were made.',
          });
      }
  } catch (error) {
      console.error('Error updating product:', error);
      return res.status(500).json({
          success: false,
          error: 'Internal server error. Please try again later.',
      });
  }
};

// Delete a product by ID
const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await sql.connect(config);

    // Delete associated records in other tables first
    await pool.request()
      .input('product_id', sql.Int, id)
      .query('DELETE FROM stock WHERE product_id = @product_id');
    
    await pool.request()
      .input('product_id', sql.Int, id)
      .query('DELETE FROM sales WHERE product_id = @product_id');
    
    await pool.request()
      .input('product_id', sql.Int, id)
      .query('DELETE FROM orderItems WHERE product_id = @product_id');
    
    await pool.request()
      .input('product_id', sql.Int, id)
      .query('DELETE FROM reviews WHERE product_id = @product_id');
    
    // Finally, delete the product itself
    await pool.request()
      .input('product_id', sql.Int, id)
      .query('DELETE FROM products WHERE product_id = @product_id');

    res.status(200).json({ success: true, message: 'Product and associated records deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



module.exports = { getProducts, getProductById, getProductsByUserId, addProduct, updateProduct, deleteProduct, getDetailsProducts };

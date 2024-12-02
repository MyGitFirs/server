const sql = require('mssql');
const config = require('../db'); // Ensure db.js exports the configuration to connect to SQL Server
const moment = require('moment-timezone');
// Function to record sales
async function recordSale(orderId, cartItems) {
  let transaction;

  try {
    const pool = await sql.connect(config);
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    for (const item of cartItems) {
      const saleRequest = new sql.Request(transaction);

      const saleDate = moment().tz('Asia/Manila').toDate();

      await saleRequest
        .input('orderId', sql.Int, orderId)
        .input('productId', sql.Int, item.productId)
        .input('quantitySold', sql.Int, item.quantity)
        .input('salePrice', sql.Decimal(10, 2), item.price)
        .input('totalAmount', sql.Decimal(10, 2), item.price * item.quantity)
        .input('saleDate', sql.DateTime, saleDate)
        .query(
          `INSERT INTO sales (order_id, product_id, quantity_sold, sale_price, total_amount, sale_date) 
           VALUES (@orderId, @productId, @quantitySold, @salePrice, @totalAmount, @saleDate)`
        );
    }

    await transaction.commit();
    console.log('Sales recorded successfully');
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('Error recording sales:', err);
  }
}
  
  async function getRecentSales(req, res) {
    const { user_id } = req.params; 
    try {
      const pool = await sql.connect(config);
      const request = new sql.Request(pool);
  
      // Query to fetch the 10 most recent sales for the given user_id in the products table
      const result = await request
        .input('user_id', sql.Int, user_id)
        .query(`
          SELECT 
            p.name AS productName,
            s.sale_date AS saleDate,
            s.quantity_sold AS quantitySold
          FROM sales s
          JOIN products p ON s.product_id = p.product_id
          WHERE p.user_id = @user_id
          ORDER BY s.sale_date DESC
          OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
        `);
  
      res.status(200).json(result.recordset);
    } catch (err) {
      console.error("Error fetching recent sales:", err);
      res.status(500).json({ success: false, error: "Failed to fetch recent sales" });
    }
  }
  
  async function getTotalSales(req, res) {
    const { user_id } = req.params; // Get user_id from the request parameters
    try {
      const pool = await sql.connect(config);
      const request = new sql.Request(pool);
  
      // Query to calculate total sales amount and quantity sold for each product for the given user_id in the products table
      const result = await request
        .input('user_id', sql.Int, user_id)
        .query(`
          SELECT 
            p.name AS productName,
            p.product_id AS productId,
            SUM(s.total_amount) AS totalSalesAmount,
            SUM(s.quantity_sold) AS totalQuantitySold
          FROM sales s
          JOIN products p ON s.product_id = p.product_id
          WHERE p.user_id = @user_id
          GROUP BY p.product_id, p.name
        `);
  
      res.status(200).json(result.recordset);
    } catch (err) {
      console.error("Error fetching total sales by product:", err);
      res.status(500).json({ success: false, error: "Failed to fetch total sales by product" });
    }
  }
  
  

module.exports = { recordSale,getRecentSales,getTotalSales };

const sql = require('mssql');
const config = require('../db'); 
const { recordSale } = require('./salesController');

async function generateUniqueOrderId(pool) {
  let orderId;
  let isUnique = false;

  while (!isUnique) {
    orderId = Math.floor(100000 + Math.random() * 900000); // Generate random 6-digit number

    // Check if the generated orderId is unique
    const checkRequest = new sql.Request(pool);
    const result = await checkRequest
      .input("orderId", sql.Int, orderId)
      .query("SELECT COUNT(*) AS count FROM orders WHERE order_id = @orderId");

    if (result.recordset[0].count === 0) {
      isUnique = true; // The generated orderId is unique
    }
  }

  return orderId;
}

async function createOrder(req, res) {
  const { userId, totalAmount, paymentMethod, address_id, cartItems } = req.body;
  console.log(address_id);
  let transaction;

  try {
    let pool = await sql.connect(config); // Ensure the pool connection is available
    transaction = new sql.Transaction(pool); // Initialize the transaction

    await transaction.begin(); // Begin the transaction

    // Generate a unique 6-digit order ID
    const orderId = await generateUniqueOrderId(pool);

    // Use the transaction for the requests
    const request = new sql.Request(transaction);

    // Insert into Orders table with the generated orderId
    await request
      .input("orderId", sql.Int, orderId)
      .input("userId", sql.Int, userId)
      .input("totalAmount", sql.Decimal(10, 2), totalAmount)
      .input("paymentMethod", sql.VarChar(50), paymentMethod)
      .input("address_id", sql.Int, address_id)
      .query(
        "INSERT INTO orders (order_id, user_id, totalAmount, paymentMethod, address_id) VALUES (@orderId, @userId, @totalAmount, @paymentMethod, @address_id)"
      );

    // Insert each item in cartItems into OrderItems table
    for (const item of cartItems) {
      const itemRequest = new sql.Request(transaction); // New request instance for each item
      await itemRequest
        .input("orderId", sql.Int, orderId)
        .input("productId", sql.Int, item.productId)
        .input("quantity", sql.Int, item.quantity)
        .input("price", sql.Decimal(10, 2), item.price)
        .query(
          "INSERT INTO orderItems (order_id, product_id, quantity, price) VALUES (@orderId, @productId, @quantity, @price)"
        );
    }

    // Commit the transaction
    await transaction.commit();
    await recordSale(orderId, cartItems);

    res.status(201).json({ success: true, orderId });
  } catch (err) {
    // Rollback the transaction if it was started
    if (transaction) await transaction.rollback();
    res.status(500).json({
      success: false,
      error: "Failed to create order",
      details: err.message,
    });
  }
}

async function getOrders(req, res) {
  const { user_id } = req.params; 
  console.log(user_id);

  try {
    const pool = await sql.connect(config);
    const request = pool.request();

    // Query to fetch orders based on user_id from the products table
    const result = await request
      .input('user_id', sql.Int, user_id)
      .query(`
        SELECT o.*, oi.product_id, oi.quantity, oi.price,
               (oi.quantity * oi.price) AS total_sales
        FROM orders o
        INNER JOIN orderItems oi ON o.order_id = oi.order_id
        INNER JOIN products p ON oi.product_id = p.product_id
        WHERE p.user_id = @user_id
        ORDER BY o.orderDate DESC
      `);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
}



// Controller to update order status
async function updateOrderStatus(req, res) {
  const { orderId } = req.params;
  const { status } = req.body;
  console.log(orderId);

  try {
    const pool = await sql.connect(config);

    // Create a request to update the order status
    const updateRequest = pool.request();
    await updateRequest
      .input('orderId', sql.Int, orderId)
      .input('status', sql.VarChar(50), status)
      .query('UPDATE orders SET orderStatus = @status WHERE order_id = @orderId');

    // If the status is 'confirmed', update the stock quantities
    if (status.toLowerCase() === 'confirmed') {
      // Create a new request to fetch order items
      const fetchRequest = pool.request();
      const orderItemsResult = await fetchRequest
        .input('orderId', sql.Int, orderId)
        .query(`
          SELECT oi.product_id, oi.quantity, s.quantity AS stock_quantity, s.stock_id
          FROM orderItems oi
          INNER JOIN stock s ON oi.product_id = s.product_id
          WHERE oi.order_id = @orderId
        `);

      const orderItems = orderItemsResult.recordset;

      // Loop through the order items to update stock quantities
      for (const item of orderItems) {
        const newQuantity = item.stock_quantity - item.quantity;

        // Ensure the stock quantity does not go negative
        if (newQuantity < 0) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for product ID: ${item.product_id}`
          });
        }

        // Create a new request to update stock quantities
        const updateStockRequest = pool.request();
        await updateStockRequest
          .input('stockId', sql.Int, item.stock_id)
          .input('newQuantity', sql.Int, newQuantity)
          .query('UPDATE stock SET quantity = @newQuantity WHERE stock_id = @stockId');
      }
    }

    res.status(200).json({ success: true, message: 'Order status updated' });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
}


async function getOrderWithItems(req, res) {
  const { orderId } = req.params; 
  
  try {
    const pool = await sql.connect(config);
    const request = new sql.Request(pool);

    request.input('orderId', sql.Int, orderId);

    // Fetch the order details along with address details
    const orderResult = await request.query(
      `SELECT 
        o.order_id, 
        o.user_id, 
        o.totalAmount, 
        o.paymentMethod,
        o.orderStatus, 
        o.orderDate,
        a.name AS customer_name,
        a.contact AS customer_contact,
        a.address AS customer_address
      FROM orders o
      JOIN addresses a ON o.address_id = a.address_id
      WHERE o.order_id = @orderId`
    );

    // Check if the order exists
    if (orderResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderResult.recordset[0];

    // Fetch the items for the given order
    const itemsResult = await request.query(
      `SELECT 
        oi.product_id, 
        p.name AS product_name, 
        oi.quantity, 
        oi.price 
      FROM orderItems oi
      JOIN products p ON oi.product_id = p.product_id
      WHERE oi.order_id = @orderId`
    );

    // Attach items to the order object
    order.items = itemsResult.recordset;

    // Send the order with its items and address details as the response
    res.status(200).json({ success: true, order });
  } catch (err) {
    console.error('Error fetching order with items:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch order with items' });
  }
}

async function getOrdersByUserId(req, res) {
  const { userId } = req.params; // Get the user ID from the request parameters
  console.log(userId);
  
  try {
    const pool = await sql.connect(config);
    const request = new sql.Request(pool);

    // Query to fetch orders based on user ID
    const ordersResult = await request
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 
          o.order_id, 
          o.totalAmount, 
          o.paymentMethod, 
          o.orderStatus, 
          o.orderDate,
          a.address AS shipping_address
        FROM orders o
        JOIN addresses a ON o.address_id = a.address_id
        WHERE o.user_id = @userId
        ORDER BY o.orderDate DESC
      `);

    if (ordersResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'No orders found for this user' });
    }

    // Return only the orders without items
    res.status(200).json({ success: true, orders: ordersResult.recordset });
  } catch (err) {
    console.error('Error fetching orders by user ID:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
}


async function getOrderDetails(req, res) {
  const { orderId } = req.params;

  try {
    const pool = await sql.connect(config);

    // First request to fetch the main order details
    const orderRequest = new sql.Request(pool);
    const orderResult = await orderRequest
      .input('orderId', sql.Int, orderId)
      .query(`
        SELECT 
          o.order_id, 
          o.user_id, 
          o.totalAmount, 
          o.paymentMethod, 
          o.orderStatus, 
          o.orderDate,
          a.address AS shipping_address
        FROM orders o
        JOIN addresses a ON o.address_id = a.address_id
        WHERE o.order_id = @orderId
      `);

    if (orderResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderResult.recordset[0];

    // Second request to fetch the items for the specific order
    const itemsRequest = new sql.Request(pool);
    const itemsResult = await itemsRequest
      .input('orderId', sql.Int, orderId)
      .query(`
        SELECT 
          oi.product_id,
          p.name AS product_name,
          oi.quantity,
          oi.price
        FROM orderItems oi
        JOIN products p ON oi.product_id = p.product_id
        WHERE oi.order_id = @orderId
      `);

    // Attach items to the order object
    order.items = itemsResult.recordset;

    // Return the order with its items
    res.status(200).json({ success: true, order });
  } catch (err) {
    console.error('Error fetching order details:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch order details' });
  }
}
async function cancelOrder(req, res) {
  const { orderId } = req.params;

  try {
    const pool = await sql.connect(config);

    // Check the current order status
    const checkRequest = new sql.Request(pool);
    const result = await checkRequest
      .input('orderId', sql.Int, orderId)
      .query('SELECT orderStatus FROM orders WHERE order_id = @orderId');

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentStatus = result.recordset[0].orderStatus;

    // Only allow cancellation if the status is 'Pending'
    if (currentStatus.toLowerCase() !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only orders with status "Pending" can be cancelled.',
      });
    }

    // Update the order status to 'Cancelled'
    const updateRequest = new sql.Request(pool);
    await updateRequest
      .input('orderId', sql.Int, orderId)
      .input('status', sql.VarChar(50), 'Cancelled')
      .query('UPDATE orders SET orderStatus = @status WHERE order_id = @orderId');

    res.status(200).json({ success: true, message: 'Order successfully cancelled.' });
  } catch (err) {
    console.error('Error cancelling order:', err);
    res.status(500).json({ success: false, error: 'Failed to cancel the order.' });
  }
}



module.exports = { createOrder, getOrders, updateOrderStatus, getOrderWithItems, getOrdersByUserId,getOrderDetails, cancelOrder };
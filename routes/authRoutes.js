const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql } = require('../db');
const { authenticateToken } = require('../middleware/middleware'); 
const router = express.Router();

// Secret for JWT token
const JWT_SECRET = 'your-secret-key';

// Signup route
router.post('/signup', async (req, res) => {
  const { name, email, password, address, phone_number, user_role, gender, dob } = req.body;
  console.log(req.body);
  try {
    // Check if the user already exists
    const result = await sql.query`SELECT * FROM users WHERE email = ${email}`;
    if (result.recordset.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert the new user into the database and retrieve the inserted user ID and fields
    const newUserResult = await sql.query`
      INSERT INTO users (name, email, password_hash, address, phone_number, user_role, gender, date_of_birth, created_at, updated_at) 
      OUTPUT inserted.user_id, inserted.name, inserted.email, inserted.user_role
      VALUES (${name}, ${email}, ${password_hash}, ${address}, ${phone_number}, ${user_role},${gender},${dob}, GETDATE(), GETDATE())`;

    // Retrieve the inserted user details
    const newUser = newUserResult.recordset[0];

    // Generate token and send response
    const token = jwt.sign({ user_id: newUser.user_id, email: newUser.email, role: newUser.user_role }, JWT_SECRET, {
      expiresIn: '1h',
    });
    res.status(201).json({ user: newUser, token, message: 'User created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/customer-login', async (req, res) => {
  console.log('Customer login request received:', req.body);
  const { email, password } = req.body;

  try {
    const result = await sql.query`SELECT * FROM users WHERE email = ${email} AND user_role = 'customer'`;
    if (result.recordset.length === 0) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ user_id: user.user_id, email: user.email, role: user.user_role }, JWT_SECRET, {
      expiresIn: '1h',
    });
    res.json({ user, token, message: 'Customer login successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Farmer login route
router.post('/farmer-login', async (req, res) => {
  console.log('Login request received:', req.body);
  const { email, password } = req.body;

  try {
    // Query the database for the user with the given email
    const result = await sql.query`SELECT * FROM users WHERE email = ${email}`;
    if (result.recordset.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = result.recordset[0];

    // Check if the user role is 'customer' and disallow login
    if (user.user_role === 'customer') {
      return res.status(403).json({ error: 'Access denied for customer role' });
    }

    // Validate the password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.user_role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Return the user, role, and token
    res.json({ user, role: user.user_role, token, message: 'Login successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User profile route
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.user;

    // Retrieve the user details from the database based on the user ID
    const result = await sql.query`SELECT user_id, name, email, address, phone_number, user_role FROM users WHERE user_id = ${user_id}`;
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userProfile = result.recordset[0];
    res.json({ user: userProfile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.get('/details', async (req, res) => {
  try {
    const userId = req.query.user_id; // Extract user_id from query parameters

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await sql.query`SELECT user_id, name, email, address, phone_number, user_role, date_of_birth
                                   FROM users 
                                   WHERE user_id = ${userId}`;
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userProfile = result.recordset[0];
    res.json({ user: userProfile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;

// middleware.js

const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your-secret-key';


function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied, token missing!' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next(); // Pass control to the next middleware
  } catch (err) {
    res.status(401).json({ error: 'Invalid Token' });
  }
}

module.exports = { authenticateToken };

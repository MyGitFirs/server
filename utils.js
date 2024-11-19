// utils.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your-secret-key'; // Keep your secret key safe and secure

function generateTokenAndResponse(user) {
  const token = jwt.sign(
    { user_id: user.user_id, user_role: user.user_role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  return {
    token,
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    user_role: user.user_role,
  };
}

module.exports = { generateTokenAndResponse };

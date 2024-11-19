const sql = require('mssql'); // Ensure you have mssql installed
const config = require('../db'); // Import your DB config
const bcrypt = require('bcryptjs');

const updateUser = async (req, res) => {
  console.log('Received user_id:', req.params.user_id);
  const userId = parseInt(req.params.user_id, 10);
  console.log('Updating user with ID:', userId); 

  const {
    name,
    email,
    password_hash,
    address,
    phone_number,
    gender,
    date_of_birth,
  } = req.body;

  try {
    const pool = await sql.connect(config);

    // Check if the user exists
    const userCheck = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`SELECT * FROM users WHERE user_id = @userId`);

    if (userCheck.recordset.length === 0) {
      return res.status(404).send('User not found');
    }

    // Initialize queryParts and input parameters
    let query = 'UPDATE users SET';
    const inputParams = [];
    
    // Dynamically build the query based on the fields provided
    if (name) {
      query += ' name = @name,';
      inputParams.push({ key: 'name', value: name, type: sql.VarChar(255) });
    }
    if (email) {
      query += ' email = @email,';
      inputParams.push({ key: 'email', value: email, type: sql.VarChar(255) });
    }
    if (address) {
      query += ' address = @address,';
      inputParams.push({ key: 'address', value: address, type: sql.Text });
    }
    if (phone_number) {
      query += ' phone_number = @phone_number,';
      inputParams.push({ key: 'phone_number', value: phone_number, type: sql.VarChar(20) });
    }
    if (gender) {
      query += ' gender = @gender,';
      inputParams.push({ key: 'gender', value: gender, type: sql.VarChar(10) });
    }
    if (date_of_birth) {
      query += ' date_of_birth = @date_of_birth,';
      inputParams.push({ key: 'date_of_birth', value: date_of_birth, type: sql.Date });
    }
    if (password_hash) {
      query += ' password_hash = @password_hash,';
      inputParams.push({ key: 'password_hash', value: password_hash, type: sql.VarChar(255) });
    }

    // Remove trailing comma and add WHERE clause
    query = query.slice(0, -1) + ' WHERE user_id = @userId';

    console.log('Generated Query:', query); // Log the generated query

    // Prepare the SQL request
    const request = pool.request();

    // Add all input parameters to the request
    inputParams.forEach(param => {
      request.input(param.key, param.type, param.value);
    });

    // Add userId input separately
    request.input('userId', sql.Int, userId);

    // Execute the query
    const result = await request.query(query);

    if (result.rowsAffected[0] > 0) {
      res.send('User updated successfully');
    } else {
      res.status(404).send('User not found');
    }

  } catch (err) {
    console.error('Error updating user:', err.message);
    res.status(500).send('Error updating user');
  }
};

const changePassword = async (req, res) => {
  const userId = parseInt(req.params.user_id, 10);
  const { currentPassword, newPassword } = req.body;

  try {
    const pool = await sql.connect(config);

    // Fetch the current password hash from the database
    const userCheck = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`SELECT password_hash FROM users WHERE user_id = @userId`);

    if (userCheck.recordset.length === 0) {
      return res.status(404).send('User not found');
    }

    const existingPasswordHash = userCheck.recordset[0].password_hash;

    // Verify the current password by comparing it with the stored hash
    const isMatch = await bcrypt.compare(currentPassword, existingPasswordHash);
    if (!isMatch) {
      return res.status(403).send('Current password is incorrect');
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update the password hash in the database
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('newPasswordHash', sql.VarChar(255), newPasswordHash)
      .query(`UPDATE users SET password_hash = @newPasswordHash WHERE user_id = @userId`);

    if (result.rowsAffected[0] > 0) {
      res.send('Password changed successfully');
    } else {
      res.status(500).send('Failed to change password');
    }

  } catch (err) {
    console.error('Error changing password:', err.message);
    res.status(500).send('Error changing password');
  }
};

module.exports = {
  updateUser, 
  changePassword
};

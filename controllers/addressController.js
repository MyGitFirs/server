const sql = require('mssql');
const config = require('../db');

// Get address by user_id
const getAddressByUserId = async (req, res) => {
  const { user_id } = req.params;
  console.log("User ID:", user_id);
  try {
    await sql.connect(config);
    const result = await sql.query`SELECT * FROM addresses WHERE user_id = ${user_id}`;
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset);
    } else {
      res.status(404).json({ error: 'Address not found for this user' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch address by user_id' });
  }
};

// Update address by user_id
const updateAddressByUserId = async (req, res) => {
  const { user_id } = req.params;
  const { name, address, phone, label } = req.body;
  try {
    await sql.connect(config);
    const result = await sql.query`UPDATE addresses 
                                   SET name = ${name}, address = ${address}, phone = ${phone}, label = ${label} 
                                   WHERE user_id = ${user_id}`;
    if (result.rowsAffected[0] > 0) {
      res.status(200).json({ message: 'Address updated successfully' });
    } else {
      res.status(404).json({ error: 'Address not found for this user' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update address by user_id' });
  }
};
const deleteAddress = async (req, res) => {
    const addressId = req.params.id;
  
    // Log the addressId to ensure it is not null
    console.log('Attempting to delete address with ID:', addressId);
  
    if (!addressId) {
      return res.status(400).json({ message: 'Address ID is required' });
    }
  
    try {
      await sql.connect(config);
      const result = await sql.query`DELETE FROM addresses WHERE address_id = ${addressId}`;
  
      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ message: 'Address not found' });
      }
  
      res.status(200).json({ message: 'Address deleted successfully' });
    } catch (error) {
      console.error('Error deleting address:', error);
      res.status(500).json({ message: 'Failed to delete address' });
    }
  };
  

// Add address by user_id
const addAddressByUserId = async (req, res) => {
    console.log(req.body);
    
  const { user_id } = req.params;
  const { name, address, phone, label} = req.body;
  console.log("User ID:", user_id);

  try {
    await sql.connect(config);
    await sql.query`INSERT INTO addresses (user_id, name, address, contact, label) 
                    VALUES (${user_id}, ${name}, ${address}, ${phone}, ${label})`;
    res.status(201).json({ message: 'Address added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add address for this user' });
  }
};

module.exports = {
  addAddressByUserId,
  updateAddressByUserId,
  getAddressByUserId,
  deleteAddress
};

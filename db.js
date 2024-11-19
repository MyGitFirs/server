const sql = require('mssql');

// Database configuration
const config = {
  user: 'admin@2536',
  password: 'Timothy@23',
  server: 'shopp.database.windows.net',
  database: 'ShopDB',
  port: 1433,
  options: {
    encrypt: true, // For Azure
    enableArithAbort: true,
    trustServerCertificate: false
  }
};

// Connect to the database
async function connectDB() {
  try {
    await sql.connect(config);
    console.log('Connected to database');
  } catch (err) {
    console.log('Database connection failed:', err);
  }
}

module.exports = {
  sql,
  connectDB
};

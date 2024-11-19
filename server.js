const express = require('express');
const { connectDB } = require('./db');
const { authenticateToken } = require('./middleware/middleware'); 
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes'); 
const userRoutes = require('./routes/userRoutes'); 
const cors = require('cors');
const reviewRoutes = require('./routes/reviewRoutes');
const basketRoutes = require('./routes/basketRoutes');
const orderRoutes = require('./routes/orderRoutes');
const addressRoutes = require('./routes/addressRoutes');
const addUserRoutes = require('./routes/addressUserRoutes');
const salesRoutes = require('./routes/salesRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// Connect to the database
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/user', userRoutes);    
app.use('/api/review', reviewRoutes);
app.use('/api/basket', basketRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/address', addUserRoutes);
app.use('/api', addressRoutes);
app.use('/api/sales',salesRoutes);
app.use('/api/admin',adminRoutes);



// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

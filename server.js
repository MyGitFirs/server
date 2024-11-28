const express = require('express');
const http = require('http'); // Import the http module
const { Server } = require('socket.io'); // Import the Socket.IO server
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
const server = http.createServer(app); // Wrap Express app with HTTP server
const io = new Server(server); // Initialize Socket.IO server

// Middleware
app.use(express.json());

// WebSocket connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", (userId) => {
    socket.join(userId); // User joins a room based on their userId
    console.log(`User ${userId} joined room.`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Make WebSocket server available to routes and controllers
app.set("io", io);

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
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

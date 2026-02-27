// 📁 backend/index.js (FIXED WITH PROPER CORS)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// Import routes
const authRoutes = require('./routes/auth.js');
const activityRoutes = require('./routes/activity.js');
const adminRoutes = require('./routes/admin.js');
const institutionRoutes = require('./routes/institution.js');
const testRoutes = require('./routes/testRoutes.js');

// Import middleware
const { startCronJobs } = require('./middleware/cronjob.js');

const app = express();

// ✅ FIXED: CORS configuration for both local and production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000',
  'https://scheduleevent.vercel.app', // Your Vercel frontend URL
  'https://www.scheduleevent.vercel.app',
  'https://scheduleeventbackend.onrender.com' // Your backend itself
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('❌ Blocked origin:', origin);
      return callback(new Error('CORS policy violation'), false);
    }
    console.log('✅ Allowed origin:', origin);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Origin: ${req.get('origin') || 'No origin'}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/test', testRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Running ✅',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.get('/test', (req, res) => {
  res.json({ 
    message: 'Test route working!',
    cors: 'enabled',
    allowedOrigins: allowedOrigins
  });
});

// Debug route to check CORS configuration
app.get('/debug-cors', (req, res) => {
  res.json({
    message: 'CORS Debug Info',
    allowedOrigins: allowedOrigins,
    currentOrigin: req.get('origin'),
    headers: req.headers
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.url} not found`,
    requestedUrl: req.url
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ 
    success: false, 
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    startCronJobs();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Local Test: http://localhost:${PORT}/test`);
      console.log(`📍 Debug CORS: http://localhost:${PORT}/debug-cors`);
      console.log(`✅ Allowed Origins:`, allowedOrigins);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB error:', err);
    process.exit(1);
  });
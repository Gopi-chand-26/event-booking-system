const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');

dotenv.config();

// Check required environment variables
if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET is not defined in .env file');
  console.error('Please check your backend/.env file');
}

if (!process.env.MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not defined in .env file');
  console.error('Please check your backend/.env file');
} else {
  // Log connection string (masked for security)
  const uri = process.env.MONGODB_URI;
  const maskedUri = uri.replace(/:[^:@]+@/, ':****@'); // Mask password
  console.log('MongoDB URI:', maskedUri);
  console.log('Node.js version:', process.version);
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB Connection with retry logic
let isConnected = false;
let reconnectAttempts = 0;
let reconnectTimer = null;

const connectDB = async () => {
  try {
    // Clear any existing reconnect timer
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    // Don't reconnect if already connected or connecting
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
      if (mongoose.connection.readyState === 1) {
        isConnected = true;
      }
      return;
    }

    console.log('Attempting to connect to MongoDB...');
    console.log('Node.js version:', process.version);

    // MongoDB connection options - try different approaches for SSL issues
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      maxPoolSize: 3,
      minPoolSize: 1,
      retryWrites: true,
      connectTimeoutMS: 30000,
      heartbeatFrequencyMS: 20000,
      // Try to handle SSL more explicitly
      tls: true,
      tlsAllowInvalidCertificates: false,
      // Additional stability options
      directConnection: false, // Use replica set
    };

    // Try connection with detailed error handling
    try {
      await mongoose.connect(process.env.MONGODB_URI, options);
    } catch (connectError) {
      // If connection fails, try without some options
      console.log('First connection attempt failed, trying alternative configuration...');
      const altOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 60000,
        maxPoolSize: 1, // Minimal pool
        retryWrites: true,
      };
      await mongoose.connect(process.env.MONGODB_URI, altOptions);
    }
    
    isConnected = true;
    reconnectAttempts = 0;
    console.log('✓ MongoDB Connected successfully');
  } catch (err) {
    isConnected = false;
    reconnectAttempts++;
    
    // Log error details for debugging
    const errorMsg = err.message || err.toString();
    const errorName = err.name || 'Unknown';
    
    console.error(`\n=== MongoDB Connection Error (Attempt ${reconnectAttempts}) ===`);
    console.error('Error Type:', errorName);
    console.error('Error Message:', errorMsg);
    
    if (errorMsg.includes('SSL') || errorMsg.includes('TLS') || errorName.includes('SSL')) {
      console.error('\n⚠️  SSL/TLS Error Detected');
      console.error('Possible causes:');
      console.error('  1. MongoDB Atlas Network Access - IP not whitelisted');
      console.error('  2. Firewall/Antivirus blocking SSL connection');
      console.error('  3. MongoDB Atlas cluster SSL configuration');
      console.error('\nSolutions:');
      console.error('  1. Check MongoDB Atlas → Network Access → Add your IP (or 0.0.0.0/0)');
      console.error('  2. Temporarily disable firewall/antivirus to test');
      console.error('  3. Try from different network (mobile hotspot)');
    } else if (errorMsg.includes('authentication') || errorMsg.includes('credentials')) {
      console.error('\n⚠️  Authentication Error');
      console.error('Check your MongoDB connection string credentials');
    } else if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('DNS')) {
      console.error('\n⚠️  DNS/Network Error');
      console.error('Check your internet connection and MongoDB cluster URL');
    }
    console.error('==========================================\n');
    
    // Exponential backoff for reconnection
    const delay = Math.min(10000 * Math.pow(1.5, reconnectAttempts), 60000);
    
    if (reconnectAttempts <= 3 || reconnectAttempts % 5 === 0) {
      console.log(`MongoDB connection failed. Retrying in ${Math.round(delay/1000)}s... (Attempt ${reconnectAttempts})`);
    }
    
    // Retry connection with exponential backoff
    reconnectTimer = setTimeout(connectDB, delay);
  }
};

connectDB();

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  isConnected = true;
  reconnectAttempts = 0;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  // Only log if it was a reconnection
  if (reconnectAttempts > 0) {
    console.log('MongoDB reconnected successfully');
  }
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  // Suppress SSL error spam
  if (err.message && err.message.includes('SSL')) {
    // Only log occasionally
    if (Math.random() < 0.05) { // Log 5% of SSL errors
      console.warn('MongoDB SSL issue detected. Connection will auto-retry...');
    }
  } else if (!err.message.includes('buffering')) {
    // Don't log buffering errors
    console.error('MongoDB connection error:', err.message);
  }
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  // Only log if we're not already trying to reconnect
  if (!reconnectTimer && reconnectAttempts === 0) {
    console.log('MongoDB disconnected. Will attempt reconnection...');
  }
  // Don't immediately reconnect - let the error handler do it with backoff
  // But if we're not already trying, start a reconnection attempt
  if (!reconnectTimer) {
    reconnectTimer = setTimeout(connectDB, 5000);
  }
});

// Handle process termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

// Middleware to check database connection
const checkDBConnection = (req, res, next) => {
  if (!isConnected && mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      message: 'Database connection unavailable. Please try again in a moment.',
      error: 'DB_CONNECTION_ERROR'
    });
  }
  next();
};

// Apply DB check to all API routes
app.use('/api', checkDBConnection);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));

// Schedule daily reminder check
const { sendEventReminders, sendPaymentReminders } = require('./utils/notifications');

// Daily event reminders at 9 AM
cron.schedule('0 9 * * *', () => {
  console.log('Running daily reminder check...');
  sendEventReminders();
});

// Payment reminder check - runs every 15 minutes for real-time notifications
cron.schedule('*/15 * * * *', () => {
  console.log('Running payment reminder check (every 15 minutes)...');
  sendPaymentReminders();
});

// Also run payment reminders on server start (after 2 minutes to allow DB connection)
setTimeout(() => {
  console.log('Running initial payment reminder check...');
  sendPaymentReminders();
}, 2 * 60 * 1000); // 2 minutes

// Run payment reminders every 15 minutes using setInterval as backup
setInterval(() => {
  sendPaymentReminders();
}, 15 * 60 * 1000); // 15 minutes in milliseconds

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


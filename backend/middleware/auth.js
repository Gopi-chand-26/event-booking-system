const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    // First authenticate the user
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    // Debug logging (remove in production)
    console.log('Admin check - User ID:', user._id);
    console.log('Admin check - User email:', user.email);
    console.log('Admin check - User role:', user.role);
    console.log('Admin check - Role type:', typeof user.role);
    console.log('Admin check - Is admin?', user.role === 'admin');

    // Check if user is admin
    if (user.role !== 'admin') {
      console.log('Access denied - User role is:', user.role, 'Expected: admin');
      return res.status(403).json({ 
        message: 'Access denied. Admin only.',
        userRole: user.role,
        userId: user._id
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    res.status(401).json({ message: 'Authorization failed', error: error.message });
  }
};

module.exports = { auth, adminAuth };


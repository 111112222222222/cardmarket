const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// MongoDB connection
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Vercel API handler
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await connectDB();

    // Check authentication for all admin routes
    await authenticate(req, res, () => {});
    if (res.headersSent) return;

    // GET request - get all users
    if (req.method === 'GET') {
      const { page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const users = await User.find({})
        .select('-password') // Exclude password from response
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await User.countDocuments({});
      const totalPages = Math.ceil(total / parseInt(limit));

      res.json({
        users,
        totalPages,
        currentPage: parseInt(page),
        total
      });
    }

    // PUT request - update user permissions
    else if (req.method === 'PUT') {
      const { userId, canTrade, isAdmin } = req.body;

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent admin from removing their own admin status
      if (user._id.toString() === req.user._id.toString() && isAdmin === false) {
        return res.status(400).json({ message: 'Cannot remove your own admin privileges' });
      }

      const updates = {};
      if (canTrade !== undefined) updates.canTrade = canTrade;
      if (isAdmin !== undefined) updates.isAdmin = isAdmin;

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updates,
        { new: true, runValidators: true }
      ).select('-password');

      res.json({
        message: 'User permissions updated successfully',
        user: updatedUser
      });
    }

    // Method not allowed
    else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Admin API error:', error);
    res.status(500).json({ message: 'Error processing request' });
  }
};

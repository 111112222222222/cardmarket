const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// MongoDB connection
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
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

    // POST request - send verification email
    if (req.method === 'POST') {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.isVerified) {
        return res.status(400).json({ message: 'Email already verified' });
      }

      // Generate verification token
      const verificationToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Send verification email using Resend
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

      const { data, error } = await resend.emails.send({
        from: 'Pokemon Marketplace <noreply@pokemonmarketplace.com>',
        to: [email],
        subject: 'Verify Your Email - Pokemon Card Marketplace',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Verify Your Email Address</h2>
            <p>Hello ${user.firstName},</p>
            <p>Thank you for registering with Pokemon Card Marketplace! To enable trading on your account, please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email Address</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account with us, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">Pokemon Card Marketplace</p>
          </div>
        `
      });

      if (error) {
        console.error('Email sending error:', error);
        return res.status(500).json({ message: 'Failed to send verification email' });
      }

      res.json({
        message: 'Verification email sent successfully',
        emailId: data.id
      });
    }

    // GET request - verify email with token
    else if (req.method === 'GET') {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({ message: 'Verification token is required' });
      }

      try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { userId } = decoded;

        // Find and update user
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
          return res.status(400).json({ message: 'Email already verified' });
        }

        // Mark email as verified
        user.isVerified = true;
        await user.save();

        res.json({
          message: 'Email verified successfully',
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isVerified: user.isVerified,
            canTrade: user.canTrade
          }
        });

      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          return res.status(400).json({ message: 'Verification token has expired' });
        }
        return res.status(400).json({ message: 'Invalid verification token' });
      }
    }

    // Method not allowed
    else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Error processing request' });
  }
};

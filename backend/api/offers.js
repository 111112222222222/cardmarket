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

// Card Schema (for validation)
const cardSchema = new mongoose.Schema({
  isRFQ: Boolean,
  minPrice: Number,
  startingPrice: Number,
  auctionEndTime: Date,
  highestBid: {
    amount: Number
  },
  totalOffers: Number,
  status: String
});

const Card = mongoose.models.Card || mongoose.model('Card', cardSchema);

// Offer Schema
const offerSchema = new mongoose.Schema({
  cardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card',
    required: true
  },
  bidderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending'
  },
  message: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Offer = mongoose.models.Offer || mongoose.model('Offer', offerSchema);

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

    // GET request - fetch offers
    if (req.method === 'GET') {
      const { page = 1, limit = 12, bidderId, cardId } = req.query;
      
      let query = {};
      if (bidderId) query.bidderId = bidderId;
      if (cardId) query.cardId = cardId;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const offers = await Offer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('cardId', 'cardName startingPrice')
        .populate('bidderId', 'firstName lastName');

      const total = await Offer.countDocuments(query);
      const totalPages = Math.ceil(total / parseInt(limit));

      res.json({
        offers,
        totalPages,
        currentPage: parseInt(page),
        total
      });
    }

    // POST request - create new offer
    else if (req.method === 'POST') {
      // Check authentication first
      await authenticate(req, res, () => {});
      if (res.headersSent) return;

      // Check trading permission
      if (!req.user.canTrade) {
        return res.status(403).json({ 
          message: 'Trading permission required. Please contact an administrator to enable trading for your account.' 
        });
      }

      const { cardId, amount, message } = req.body;
      const bidderId = req.user._id; // Use authenticated user's ID

      // Validate required fields
      if (!cardId || !bidderId || !amount) {
        return res.status(400).json({ 
          message: 'Missing required fields',
          required: ['cardId', 'bidderId', 'amount']
        });
      }

      // Check if card exists and is active
      const card = await Card.findById(cardId);
      if (!card) {
        return res.status(404).json({ message: 'Card not found' });
      }
      if (card.status !== 'active') {
        return res.status(400).json({ message: 'Card is not available for offers' });
      }

      // Validate offer amount based on card type
      if (card.isRFQ) {
        // For RFQ, amount must meet or exceed minimum price
        if (amount < card.minPrice) {
          return res.status(400).json({ 
            message: `Offer must be at least $${card.minPrice} for this RFQ listing` 
          });
        }
      } else {
        // For auctions, amount must be higher than current highest bid or starting price
        const minBid = Math.max(card.startingPrice, card.highestBid?.amount || 0);
        if (amount <= minBid) {
          return res.status(400).json({ 
            message: `Bid must be higher than $${minBid}` 
          });
        }

        // Check if auction is still active
        if (new Date() > card.auctionEndTime) {
          return res.status(400).json({ message: 'Auction has ended' });
        }
      }

      // Create new offer
      const offer = new Offer({
        cardId,
        bidderId,
        amount: parseFloat(amount),
        message,
        status: 'pending'
      });

      await offer.save();

      // Update card with new highest bid if it's an auction
      if (!card.isRFQ) {
        card.highestBid = {
          amount: parseFloat(amount),
          bidderId: bidderId,
          bidTime: new Date()
        };
        card.totalOffers += 1;
        await card.save();
      } else {
        // For RFQ, just increment total offers
        card.totalOffers += 1;
        await card.save();
      }

      res.status(201).json({
        message: 'Offer submitted successfully',
        offer: {
          id: offer._id,
          cardId: offer.cardId,
          bidderId: offer.bidderId,
          amount: offer.amount,
          status: offer.status
        }
      });
    }

    // Method not allowed
    else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Offers API error:', error);
    res.status(500).json({ message: 'Error processing request' });
  }
};

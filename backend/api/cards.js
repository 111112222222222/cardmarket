const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

// Card Schema
const cardSchema = new mongoose.Schema({
  cardName: {
    type: String,
    required: true,
    trim: true
  },
  set: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true
  },
  condition: {
    type: String,
    enum: ['mint', 'near-mint', 'excellent', 'good', 'light-played', 'played', 'poor'],
    required: true
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'holo-rare', 'ultra-rare', 'secret-rare'],
    required: true
  },
  startingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  auctionEndTime: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  frontImage: {
    type: String,
    required: true
  },
  backImage: {
    type: String
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'sold', 'draft', 'pending'],
    default: 'active'
  },
  totalOffers: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// User Schema (needed for populate)
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
    match: /^[a-zA-Z0-9_]+$/
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  canTrade: {
    type: Boolean,
    default: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  userType: {
    type: String,
    enum: ['customer', 'vendor', 'admin'],
    default: 'customer'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure the models are properly registered
if (!mongoose.models.Card) {
  mongoose.model('Card', cardSchema);
}
if (!mongoose.models.User) {
  mongoose.model('User', userSchema);
}

const Card = mongoose.model('Card');
const User = mongoose.model('User');

// Extract user ID from JWT token
const getUserIdFromToken = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    return null;
  }
};

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

    // GET request - fetch cards
    if (req.method === 'GET') {
      console.log('GET cards request received');
      const { page = 1, limit = 12, id } = req.query;
      console.log('Query params:', { page, limit, id });
      
      // If ID is provided, fetch single card
      if (id) {
        const card = await Card.findById(id).populate('sellerId', 'firstName lastName username');
        if (!card) {
          return res.status(404).json({ message: 'Card not found' });
        }
        return res.json(card);
      }

      // Fetch paginated cards
      console.log('Fetching paginated cards');
      const skip = (parseInt(page) - 1) * parseInt(limit);
      console.log('Skip:', skip, 'Limit:', parseInt(limit));
      
      try {
        const cards = await Card.find({ status: 'active' })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate('sellerId', 'firstName lastName username')
          .select('cardName set year condition rarity startingPrice auctionEndTime totalOffers createdAt sellerId frontImage backImage description');

        console.log('Found cards:', cards.length);

        const total = await Card.countDocuments({ status: 'active' });
        const totalPages = Math.ceil(total / parseInt(limit));

        console.log('Total cards:', total, 'Total pages:', totalPages);

        return res.json({
          cards,
          totalPages,
          currentPage: parseInt(page),
          total
        });
      } catch (dbError) {
        console.error('Database query error:', dbError);
        return res.status(500).json({ 
          message: 'Database query error', 
          error: dbError.message 
        });
      }
    }

    // POST request - create new card
    else if (req.method === 'POST') {
      // Check authentication
      const sellerId = getUserIdFromToken(req);
      if (!sellerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { 
        cardName, 
        set, 
        year, 
        condition, 
        rarity, 
        startingPrice, 
        auctionEndTime,
        description,
        frontImage,
        backImage
      } = req.body;

      // Validate required fields
      if (!cardName || !set || !year || !condition || !rarity || !startingPrice || !auctionEndTime) {
        return res.status(400).json({ 
          message: 'Missing required fields',
          required: ['cardName', 'set', 'year', 'condition', 'rarity', 'startingPrice', 'auctionEndTime']
        });
      }

      // Create new card
      const card = new Card({
        cardName,
        set,
        year: parseInt(year),
        condition,
        rarity,
        startingPrice: parseFloat(startingPrice),
        auctionEndTime: new Date(auctionEndTime),
        description,
        frontImage: frontImage || 'placeholder.jpg',
        backImage: backImage || 'placeholder.jpg',
        sellerId,
        status: 'active'
      });

      await card.save();

      return res.status(201).json({
        message: 'Card submitted successfully',
        card: {
          id: card._id,
          cardName: card.cardName,
          set: card.set,
          year: card.year,
          condition: card.condition,
          rarity: card.rarity,
          startingPrice: card.startingPrice,
          auctionEndTime: card.auctionEndTime,
          status: card.status
        }
      });
    }

    else {
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Cards error:', error);
    res.status(500).json({ message: 'Error processing cards request' });
  }
};

const mongoose = require('mongoose');

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
    enum: ['mint', 'near-mint', 'excellent', 'good', 'fair', 'poor'],
    required: true
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'ultra-rare', 'secret-rare', 'legendary'],
    required: true
  },
  // Grading Information
  isGraded: {
    type: Boolean,
    default: false
  },
  grade: {
    type: Number,
    min: 1,
    max: 10,
    validate: {
      validator: function(v) {
        // Grade is only required if card is graded
        return !this.isGraded || (v >= 1 && v <= 10);
      },
      message: 'Grade must be between 1 and 10 for graded cards'
    }
  },
  gradingCompany: {
    type: String,
    enum: ['PSA', 'TAG', 'CGC', 'Beckett'],
    validate: {
      validator: function(v) {
        // Grading company is only required if card is graded
        return !this.isGraded || v;
      },
      message: 'Grading company is required for graded cards'
    }
  },
  // Pricing and Sale Type
  startingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  minPrice: {
    type: Number,
    min: 0,
    validate: {
      validator: function(v) {
        // Min price is required for RFQ, optional for auctions
        return !this.isRFQ || (v && v >= 0);
      },
      message: 'Minimum price is required for RFQ listings'
    }
  },
  isRFQ: {
    type: Boolean,
    default: false
  },
  // Auction Settings
  auctionDuration: {
    type: Number,
    min: 0,
    max: 48,
    validate: {
      validator: function(v) {
        // Auction duration is required for auctions, not for RFQ
        return this.isRFQ || (v >= 0 && v <= 48);
      },
      message: 'Auction duration must be between 0 and 48 hours for auction listings'
    }
  },
  auctionEndTime: {
    type: Date,
    validate: {
      validator: function(v) {
        // Auction end time is only required for auctions, not for RFQ
        return this.isRFQ || v;
      },
      message: 'Auction end time is required for auction listings'
    }
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
    enum: ['active', 'sold', 'expired', 'draft', 'pending'],
    default: 'active'
  },
  highestBid: {
    amount: {
      type: Number,
      default: 0
    },
    bidderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bidTime: {
      type: Date
    }
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

const Card = mongoose.models.Card || mongoose.model('Card', cardSchema);

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

    // GET request - fetch cards
    if (req.method === 'GET') {
      const { page = 1, limit = 12, id } = req.query;
      
      // If ID is provided, fetch single card
      if (id) {
        const card = await Card.findById(id);
        if (!card) {
          return res.status(404).json({ message: 'Card not found' });
        }
        return res.json(card);
      }

      // Fetch paginated cards
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const cards = await Card.find({ status: 'active' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('sellerId', 'firstName lastName')
        .select('cardName set year condition rarity startingPrice isGraded grade gradingCompany isRFQ minPrice auctionDuration auctionEndTime totalOffers highestBid createdAt sellerId');

      const total = await Card.countDocuments({ status: 'active' });
      const totalPages = Math.ceil(total / parseInt(limit));

      res.json({
        cards,
        totalPages,
        currentPage: parseInt(page),
        total
      });
    }

    // POST request - create new card
    else if (req.method === 'POST') {
      const { 
        cardName, 
        set, 
        year, 
        condition, 
        rarity, 
        startingPrice, 
        description, 
        frontImage, 
        backImage, 
        sellerId,
        // New grading fields
        isGraded,
        grade,
        gradingCompany,
        // New RFQ and auction fields
        isRFQ,
        minPrice,
        auctionDuration,
        auctionEndTime
      } = req.body;

      // Validate required fields
      if (!cardName || !set || !year || !condition || !rarity || !startingPrice || !frontImage || !sellerId) {
        return res.status(400).json({ 
          message: 'Missing required fields',
          required: ['cardName', 'set', 'year', 'condition', 'rarity', 'startingPrice', 'frontImage', 'sellerId']
        });
      }

      // Validate grading fields if card is graded
      if (isGraded) {
        if (grade === undefined || grade === null || grade < 1 || grade > 10) {
          return res.status(400).json({ 
            message: 'Grade must be between 1 and 10 for graded cards'
          });
        }
        if (!gradingCompany || !['PSA', 'TAG', 'CGC', 'Beckett'].includes(gradingCompany)) {
          return res.status(400).json({ 
            message: 'Valid grading company is required for graded cards (PSA, TAG, CGC, or Beckett)'
          });
        }
      }

      // Validate RFQ vs Auction fields
      if (isRFQ) {
        if (minPrice === undefined || minPrice === null || minPrice < 0) {
          return res.status(400).json({ 
            message: 'Minimum price is required for RFQ listings'
          });
        }
        // For RFQ, auction fields are not required
        if (auctionDuration !== undefined || auctionEndTime !== undefined) {
          return res.status(400).json({ 
            message: 'Auction fields should not be set for RFQ listings'
          });
        }
      } else {
        // For auctions, validate auction fields
        if (auctionDuration === undefined || auctionDuration === null || auctionDuration < 0 || auctionDuration > 48) {
          return res.status(400).json({ 
            message: 'Auction duration must be between 0 and 48 hours'
          });
        }
        if (!auctionEndTime) {
          return res.status(400).json({ 
            message: 'Auction end time is required for auction listings'
          });
        }
        // Validate auction end time is in the future
        const now = new Date();
        const endTime = new Date(auctionEndTime);
        if (endTime <= now) {
          return res.status(400).json({ 
            message: 'Auction end time must be in the future'
          });
        }
      }

      // Create new card
      const card = new Card({
        cardName,
        set,
        year: parseInt(year),
        condition,
        rarity,
        startingPrice: parseFloat(startingPrice),
        description,
        frontImage,
        backImage,
        sellerId,
        // New fields
        isGraded: Boolean(isGraded),
        grade: isGraded ? parseInt(grade) : undefined,
        gradingCompany: isGraded ? gradingCompany : undefined,
        isRFQ: Boolean(isRFQ),
        minPrice: isRFQ ? parseFloat(minPrice) : undefined,
        auctionDuration: !isRFQ ? parseInt(auctionDuration) : undefined,
        auctionEndTime: !isRFQ ? new Date(auctionEndTime) : undefined,
        status: 'active'
      });

      await card.save();

      res.status(201).json({
        message: 'Card submitted successfully',
        card: {
          id: card._id,
          cardName: card.cardName,
          set: card.set,
          year: card.year,
          condition: card.condition,
          rarity: card.rarity,
          startingPrice: card.startingPrice,
          isGraded: card.isGraded,
          grade: card.grade,
          gradingCompany: card.gradingCompany,
          isRFQ: card.isRFQ,
          minPrice: card.minPrice,
          auctionDuration: card.auctionDuration,
          auctionEndTime: card.auctionEndTime,
          status: card.status
        }
      });
    }

    // PUT request - update card
    else if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ message: 'Card ID is required' });
      }

      const card = await Card.findById(id);
      if (!card) {
        return res.status(404).json({ message: 'Card not found' });
      }

      // Allow updates to status, startingPrice, minPrice, auctionEndTime
      const allowedUpdates = ['status', 'startingPrice', 'minPrice', 'auctionEndTime'];
      const updates = {};
      
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          if (field === 'auctionEndTime' && req.body[field]) {
            updates[field] = new Date(req.body[field]);
          } else if (field === 'startingPrice' || field === 'minPrice') {
            updates[field] = parseFloat(req.body[field]);
          } else {
            updates[field] = req.body[field];
          }
        }
      });

      // Validate auction end time if being updated
      if (updates.auctionEndTime) {
        const now = new Date();
        if (updates.auctionEndTime <= now) {
          return res.status(400).json({ 
            message: 'Auction end time must be in the future' 
          });
        }
      }

      const updatedCard = await Card.findByIdAndUpdate(
        id, 
        updates, 
        { new: true, runValidators: true }
      );

      res.json({
        message: 'Card updated successfully',
        card: updatedCard
      });
    }

    // Method not allowed
    else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Cards API error:', error);
    res.status(500).json({ message: 'Error processing request' });
  }
};

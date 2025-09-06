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
  // Pricing
  askingPrice: {
    type: Number,
    required: true,
    min: 0
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
        .select('cardName set year condition rarity askingPrice isGraded grade gradingCompany totalOffers createdAt sellerId frontImage backImage');

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
        askingPrice, 
        description, 
        frontImage, 
        backImage, 
        sellerId,
        // Grading fields
        isGraded,
        grade,
        gradingCompany
      } = req.body;

      // Validate required fields
      if (!cardName || !set || !year || !condition || !rarity || !askingPrice || !frontImage || !sellerId) {
        return res.status(400).json({ 
          message: 'Missing required fields',
          required: ['cardName', 'set', 'year', 'condition', 'rarity', 'askingPrice', 'frontImage', 'sellerId']
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


      // Create new card
      const card = new Card({
        cardName,
        set,
        year: parseInt(year),
        condition,
        rarity,
        askingPrice: parseFloat(askingPrice),
        description,
        frontImage,
        backImage,
        sellerId,
        // Grading fields
        isGraded: Boolean(isGraded),
        grade: isGraded ? parseInt(grade) : undefined,
        gradingCompany: isGraded ? gradingCompany : undefined,
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
          askingPrice: card.askingPrice,
          isGraded: card.isGraded,
          grade: card.grade,
          gradingCompany: card.gradingCompany,
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

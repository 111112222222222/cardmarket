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

// User Schema
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
    default: false
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

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

const Card = mongoose.models.Card || mongoose.model('Card', cardSchema);

// CORS headers
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

// Handle preflight requests
const handlePreflight = (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
};

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

// Registration handler
const handleRegister = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { email, password, username, firstName, lastName, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: 'Email already exists' });
      } else {
        return res.status(400).json({ message: 'Username already exists' });
      }
    }

    // Create new user
    const user = new User({
      email,
      password,
      username,
      firstName,
      lastName,
      phone,
      canTrade: true, // Allow immediate card submission
      isAdmin: false
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send verification email (optional - don't fail registration if email fails)
    try {
      const verificationToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

      await resend.emails.send({
        from: 'Pokemon Marketplace <noreply@pokemonmarketplace.com>',
        to: [email],
        subject: 'Welcome! Verify Your Email - Pokemon Card Marketplace',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to Pokemon Card Marketplace!</h2>
            <p>Hello ${firstName},</p>
            <p>Thank you for registering! To enable trading on your account, please verify your email address by clicking the button below:</p>
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
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      message: 'Account created successfully! You can now submit cards immediately.',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        canTrade: user.canTrade,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
        userType: user.userType
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

// Login handler
const handleLogin = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        canTrade: user.canTrade,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
        userType: user.userType
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
};

// Cards handler
const handleCards = async (req, res) => {
  try {
    await connectDB();

    // GET request - fetch cards
    if (req.method === 'GET') {
      const { page = 1, limit = 12, id } = req.query;
      
      // If ID is provided, fetch single card
      if (id) {
        const card = await Card.findById(id).populate('sellerId', 'firstName lastName username');
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
        .populate('sellerId', 'firstName lastName username')
        .select('cardName set year condition rarity startingPrice auctionEndTime totalOffers createdAt sellerId frontImage backImage description');

      const total = await Card.countDocuments({ status: 'active' });
      const totalPages = Math.ceil(total / parseInt(limit));

      return res.json({
        cards,
        totalPages,
        currentPage: parseInt(page),
        total
      });
    }

    // POST request - create new card
    else if (req.method === 'POST') {
      // Check authentication
      const sellerId = getUserIdFromToken(req);
      if (!sellerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // For now, we'll handle simple form data without file uploads
      // File uploads would require additional setup with multer/cloudinary
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
        frontImage: frontImage || 'placeholder.jpg', // Placeholder for now
        backImage: backImage || 'placeholder.jpg', // Placeholder for now
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

// Main handler
module.exports = async (req, res) => {
  setCorsHeaders(res);
  
  if (handlePreflight(req, res)) {
    return;
  }

  const { method, url } = req;
  
  // Debug logging
  console.log(`Received request: ${method} ${url}`);
  
  // Route handling
  if (method === 'GET' && url === '/api') {
    return res.status(200).json({ message: 'API is working!' });
  }
  
  
  if (method === 'GET' && url === '/api/debug') {
    return res.status(200).json({ 
      message: 'Debug endpoint', 
      method, 
      url, 
      headers: req.headers,
      availableEndpoints: [
        'GET /api',
        'GET /api/debug',
        'POST /api/register',
        'POST /api/login',
        'GET /api/cards',
        'POST /api/cards'
      ]
    });
  }
  
  if (method === 'POST' && url === '/api/register') {
    console.log('Register route hit');
    return await handleRegister(req, res);
  }
  
  if (method === 'POST' && url === '/api/login') {
    return await handleLogin(req, res);
  }
  
  if (url === '/api/cards' || url.startsWith('/api/cards?')) {
    return await handleCards(req, res);
  }
  
  // Default response for unmatched routes
  console.log(`Unmatched route: ${method} ${url}`);
  res.status(404).json({ 
    message: 'Endpoint not found', 
    url, 
    method,
    availableEndpoints: [
      'GET /api',
      'POST /api/register',
      'POST /api/login',
      'GET /api/cards',
      'POST /api/cards'
    ]
  });
};
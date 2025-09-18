const mongoose = require('mongoose');

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
    
    // Test database connection
    const dbStatus = mongoose.connection.readyState;
    const dbName = mongoose.connection.name;
    
    // Test if we can access the Card collection
    const Card = mongoose.models.Card;
    let cardCount = 0;
    let cardError = null;
    
    try {
      if (Card) {
        cardCount = await Card.countDocuments();
      } else {
        cardError = 'Card model not found';
      }
    } catch (error) {
      cardError = error.message;
    }
    
    res.json({
      message: 'Debug info',
      database: {
        status: dbStatus,
        name: dbName,
        connected: dbStatus === 1
      },
      cardModel: {
        exists: !!Card,
        count: cardCount,
        error: cardError
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasMongoUri: !!process.env.MONGODB_URI
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ 
      message: 'Debug error', 
      error: error.message,
      stack: error.stack
    });
  }
};


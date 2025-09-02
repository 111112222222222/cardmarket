const express = require('express');
const PokemonCard = require('../models/PokemonCard');
const { auth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Submit a new Pokemon card for sale
router.post('/', auth, upload.fields([
  { name: 'frontImage', maxCount: 1 },
  { name: 'backImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      cardName,
      set,
      condition,
      rarity,
      year,
      description,
      startingPrice,
      auctionDuration
    } = req.body;

    // Calculate auction end time (1-24 hours from now)
    const auctionEndTime = new Date();
    auctionEndTime.setHours(auctionEndTime.getHours() + parseInt(auctionDuration));

    // Create new Pokemon card
    const card = new PokemonCard({
      seller: req.user._id,
      cardName,
      set,
      condition,
      rarity,
      year,
      description,
      startingPrice,
      auctionEndTime,
      frontImage: req.files.frontImage[0].filename,
      backImage: req.files.backImage[0].filename
    });

    await card.save();

    res.status(201).json({
      message: 'Card submitted successfully',
      card
    });
  } catch (error) {
    console.error('Card submission error:', error);
    res.status(500).json({ message: 'Error submitting card' });
  }
});

// Get all active cards
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'active' } = req.query;
    
    const cards = await PokemonCard.find({ status })
      .populate('seller', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PokemonCard.countDocuments({ status });

    res.json({
      cards,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({ message: 'Error fetching cards' });
  }
});

// Get card by ID
router.get('/:id', async (req, res) => {
  try {
    const card = await PokemonCard.findById(req.params.id)
      .populate('seller', 'firstName lastName')
      .populate('highestBid');

    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    res.json(card);
  } catch (error) {
    console.error('Get card error:', error);
    res.status(500).json({ message: 'Error fetching card' });
  }
});

// Get cards by seller
router.get('/seller/:sellerId', auth, async (req, res) => {
  try {
    const cards = await PokemonCard.find({ seller: req.params.sellerId })
      .sort({ createdAt: -1 });

    res.json(cards);
  } catch (error) {
    console.error('Get seller cards error:', error);
    res.status(500).json({ message: 'Error fetching seller cards' });
  }
});

// Update card status (seller only)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const card = await PokemonCard.findById(req.params.id);

    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    if (card.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this card' });
    }

    card.status = status;
    await card.save();

    res.json({ message: 'Card status updated', card });
  } catch (error) {
    console.error('Update card status error:', error);
    res.status(500).json({ message: 'Error updating card status' });
  }
});

// Delete card (seller only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const card = await PokemonCard.findById(req.params.id);

    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    if (card.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this card' });
    }

    await PokemonCard.findByIdAndDelete(req.params.id);

    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({ message: 'Error deleting card' });
  }
});

module.exports = router;

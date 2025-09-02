const express = require('express');
const Offer = require('../models/Offer');
const PokemonCard = require('../models/PokemonCard');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Submit an offer for a card
router.post('/', auth, requireRole(['vendor']), async (req, res) => {
  try {
    const { cardId, amount, message } = req.body;

    // Check if card exists and is active
    const card = await PokemonCard.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    if (card.status !== 'active') {
      return res.status(400).json({ message: 'Card is not available for offers' });
    }

    // Check if auction has ended
    if (new Date() > card.auctionEndTime) {
      return res.status(400).json({ message: 'Auction has ended' });
    }

    // Check if vendor already made an offer for this card
    const existingOffer = await Offer.findOne({
      card: cardId,
      vendor: req.user._id,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingOffer) {
      return res.status(400).json({ message: 'You have already made an offer for this card' });
    }

    // Calculate commission (1-5% based on vendor settings)
    const commissionRate = 0.03; // Default 3%, can be made configurable
    const commissionAmount = amount * commissionRate;

    // Create new offer
    const offer = new Offer({
      card: cardId,
      vendor: req.user._id,
      amount,
      message,
      commissionAmount
    });

    await offer.save();

    // Update card total offers count
    card.totalOffers += 1;
    
    // Update highest bid if this is the highest offer
    if (!card.highestBid || amount > (card.highestBid.amount || 0)) {
      card.highestBid = offer._id;
    }
    
    await card.save();

    res.status(201).json({
      message: 'Offer submitted successfully',
      offer
    });
  } catch (error) {
    console.error('Offer submission error:', error);
    res.status(500).json({ message: 'Error submitting offer' });
  }
});

// Get offers for a specific card
router.get('/card/:cardId', auth, async (req, res) => {
  try {
    const offers = await Offer.find({ card: req.params.cardId })
      .populate('vendor', 'firstName lastName businessName')
      .sort({ amount: -1 });

    res.json(offers);
  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({ message: 'Error fetching offers' });
  }
});

// Get vendor\'s offers
router.get('/vendor', auth, requireRole(['vendor']), async (req, res) => {
  try {
    const offers = await Offer.find({ vendor: req.user._id })
      .populate('card', 'cardName set condition')
      .sort({ createdAt: -1 });

    res.json(offers);
  } catch (error) {
    console.error('Get vendor offers error:', error);
    res.status(500).json({ message: 'Error fetching vendor offers' });
  }
});

// Accept an offer (customer only)
router.patch('/:id/accept', auth, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('card');
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Check if user is the card seller
    if (offer.card.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this offer' });
    }

    // Check if auction has ended
    if (new Date() <= offer.card.auctionEndTime) {
      return res.status(400).json({ message: 'Auction has not ended yet' });
    }

    // Update offer status
    offer.status = 'accepted';
    await offer.save();

    // Update card status
    await PokemonCard.findByIdAndUpdate(offer.card._id, {
      status: 'sold',
      highestBid: offer._id
    });

    // Reject all other offers for this card
    await Offer.updateMany(
      { card: offer.card._id, _id: { $ne: offer._id } },
      { status: 'rejected' }
    );

    res.json({ message: 'Offer accepted successfully', offer });
  } catch (error) {
    console.error('Accept offer error:', error);
    res.status(500).json({ message: 'Error accepting offer' });
  }
});

// Reject an offer (customer only)
router.patch('/:id/reject', auth, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('card');
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (offer.card.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject this offer' });
    }

    offer.status = 'rejected';
    await offer.save();

    res.json({ message: 'Offer rejected successfully', offer });
  } catch (error) {
    console.error('Reject offer error:', error);
    res.status(500).json({ message: 'Error rejecting offer' });
  }
});

module.exports = router;

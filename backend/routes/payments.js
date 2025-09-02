const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Offer = require('../models/Offer');
const Vendor = require('../models/Vendor');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Process commission payment for accepted offer
router.post('/commission', auth, requireRole(['vendor']), async (req, res) => {
  try {
    const { offerId, paymentMethodId } = req.body;

    const offer = await Offer.findById(offerId)
      .populate('card')
      .populate('vendor');

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (offer.status !== 'accepted') {
      return res.status(400).json({ message: 'Offer is not accepted' });
    }

    if (offer.commissionPaid) {
      return res.status(400).json({ message: 'Commission already paid' });
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(offer.commissionAmount * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      description: `Commission for ${offer.card.cardName} - ${offer.vendor.businessName}`,
      metadata: {
        offerId: offer._id.toString(),
        cardId: offer.card._id.toString(),
        vendorId: offer.vendor._id.toString()
      }
    });

    if (paymentIntent.status === 'succeeded') {
      // Mark commission as paid
      offer.commissionPaid = true;
      await offer.save();

      // Update vendor statistics
      await Vendor.findByIdAndUpdate(offer.vendor._id, {
        $inc: {
          totalLeads: 1,
          totalCommissionPaid: offer.commissionAmount
        }
      });

      res.json({
        message: 'Commission payment successful',
        paymentIntent
      });
    } else {
      res.status(400).json({ message: 'Payment failed' });
    }
  } catch (error) {
    console.error('Commission payment error:', error);
    res.status(500).json({ message: 'Error processing commission payment' });
  }
});

// Get payment history for vendor
router.get('/history', auth, requireRole(['vendor']), async (req, res) => {
  try {
    const payments = await Offer.find({
      vendor: req.user._id,
      status: 'accepted',
      commissionPaid: true
    })
    .populate('card', 'cardName set')
    .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ message: 'Error fetching payment history' });
  }
});

// Create payment intent for testing
router.post('/create-intent', auth, async (req, res) => {
  try {
    const { amount } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      metadata: { integration_check: 'accept_a_payment' }
    });

    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ message: 'Error creating payment intent' });
  }
});

module.exports = router;

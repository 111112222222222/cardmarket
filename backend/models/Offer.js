const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PokemonCard',
    required: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  message: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending'
  },
  commissionPaid: {
    type: Boolean,
    default: false
  },
  commissionAmount: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
offerSchema.index({ card: 1, status: 1 });
offerSchema.index({ vendor: 1, status: 1 });

module.exports = mongoose.model('Offer', offerSchema);

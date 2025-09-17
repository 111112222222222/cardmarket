const mongoose = require('mongoose');

const pokemonCardSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
  year: {
    type: Number,
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
    type: String,
    required: true
  },
  askingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'sold', 'cancelled'],
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

// Index for efficient queries
pokemonCardSchema.index({ status: 1, createdAt: 1 });
pokemonCardSchema.index({ seller: 1, status: 1 });

module.exports = mongoose.model('PokemonCard', pokemonCardSchema);

const mongoose = require('mongoose')

const marketPriceSchema = new mongoose.Schema({
  crop: { type: String, required: true },
  district: { type: String, required: true },
  pricePerUnit: { type: Number, required: true },
  unit: { type: String, default: 'kg' },
  grade: { type: String, enum: ['A', 'B', 'C', null], default: null },
  source: { type: String, enum: ['community', 'admin', 'agmarknet'], default: 'community' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  at: { type: Date, default: Date.now }
}, { timestamps: true })

marketPriceSchema.index({ crop: 1, district: 1, at: -1 })

module.exports = mongoose.models.MarketPrice || mongoose.model('MarketPrice', marketPriceSchema)

const priceAlertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  crop: { type: String, required: true },
  district: { type: String, required: true },
  maxPricePerUnit: { type: Number, required: true },
  unit: { type: String, default: 'kg' },
  active: { type: Boolean, default: true }
}, { timestamps: true })

module.exports = mongoose.models.PriceAlert || mongoose.model('PriceAlert', priceAlertSchema)

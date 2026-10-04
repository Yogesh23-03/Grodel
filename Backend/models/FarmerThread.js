const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
  fromRole: { type: String, enum: ['farmer', 'buyer'], required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  at: { type: Date, default: Date.now }
}, { _id: false })

const offerSchema = new mongoose.Schema({
  fromRole: { type: String, enum: ['farmer', 'buyer'], required: true },
  qty: { type: Number, required: true },
  unit: { type: String, default: 'kg' },
  pricePerUnit: { type: Number, required: true },
  note: { type: String, default: '' },
  status: { type: String, enum: ['proposed', 'countered', 'accepted', 'rejected', 'expired'], default: 'proposed' },
  expiresAt: { type: Date, default: null },
  at: { type: Date, default: Date.now }
}, { _id: true })

const farmerThreadSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorProfile', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorListing', default: null },
  messages: [messageSchema],
  offers: [offerSchema],
  status: { type: String, enum: ['open', 'accepted', 'converted', 'closed'], default: 'open' },
  convertedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder', default: null },
  lastActivityAt: { type: Date, default: Date.now }
}, { timestamps: true })

farmerThreadSchema.index({ farmerId: 1, lastActivityAt: -1 })
farmerThreadSchema.index({ buyerId: 1, lastActivityAt: -1 })

module.exports = mongoose.models.FarmerThread || mongoose.model('FarmerThread', farmerThreadSchema)

const mongoose = require('mongoose')

const shareSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorProfile', required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorListing', required: true },
  qty: { type: Number, required: true },
  pricePerUnit: { type: Number, required: true },
  payout: { type: Number, required: true },
  status: { type: String, enum: ['proposed', 'accepted', 'rejected', 'expired'], default: 'proposed' },
  respondedAt: Date
}, { _id: false })

const coopOrderSchema = new mongoose.Schema({
  parentOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder', required: true },
  cropName: { type: String, required: true },
  unit: { type: String, default: 'kg' },
  totalQty: { type: Number, required: true },
  targetPricePerUnit: { type: Number, required: true },
  dispatchDeadline: { type: Date, required: true },
  shares: [shareSchema],
  status: { type: String, enum: ['proposed', 'partial', 'confirmed', 'failed'], default: 'proposed' }
}, { timestamps: true })

module.exports = mongoose.models.CoopOrder || mongoose.model('CoopOrder', coopOrderSchema)

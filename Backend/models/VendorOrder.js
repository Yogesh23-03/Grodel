const mongoose = require('mongoose')

const vendorOrderItemSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorListing' },
  name: String,
  image: String,
  pricePerUnit: Number,
  quantity: Number,
  unit: String
}, { _id: false })

const vendorOrderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorProfile', required: true },
  vendorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [vendorOrderItemSchema],
  totalAmount: Number,
  paymentMethod: { type: String, enum: ['cod', 'online'], default: 'cod' },
  payment: { type: Boolean, default: false },
  deliveryAddress: {
    text: String,
    latitude: Number,
    longitude: Number
  },
  contactPhone: String,
  note: String,
  // ---- Direct Market Access fields ----
  buyerType: { type: String, enum: ["consumer", "retailer", "hotel", "canteen", "exporter", null], default: null },
  negotiationId: { type: mongoose.Schema.Types.ObjectId, ref: 'FarmerThread', default: null },
  fulfillmentType: { type: String, enum: ['pickup', 'delivery'], default: 'delivery' },
  deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  invoiceNumber: { type: String, default: '' },
  invoicePdfUrl: { type: String, default: '' },
  source: { type: String, enum: ['storefront', 'negotiated', 'coop'], default: 'storefront' },
  coopOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'CoopOrder', default: null },
  buyerRating: { rating: { type: Number, min: 1, max: 5 }, note: String, at: Date },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'ready', 'out of delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  statusHistory: [{
    status: String,
    at: { type: Date, default: Date.now }
  }]
}, { timestamps: true })

module.exports = mongoose.models.VendorOrder || mongoose.model('VendorOrder', vendorOrderSchema)

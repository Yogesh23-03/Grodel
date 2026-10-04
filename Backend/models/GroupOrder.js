const mongoose = require('mongoose')

const itemSchema = new mongoose.Schema({
  foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  name: String,
  price: Number,
  quantity: { type: Number, default: 1 },
  image: String
}, { _id: false })

const participantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  guestName: String,
  items: [itemSchema],
  subtotal: { type: Number, default: 0 },
  deliveryShare: { type: Number, default: 0 },
  couponDiscount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paymentSessionId: String,
  paidAt: Date
})

const groupOrderSchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  restaurantName: String,
  shareableLink: { type: String, unique: true, required: true },
  expiresAt: { type: Date, required: true },
  status: {
    type: String,
    enum: ['open', 'locked', 'all_paid', 'placed', 'delivered', 'expired'],
    default: 'open'
  },
  deliveryAddress: String,
  deliveryFee: { type: Number, default: 0 },
  participants: [participantSchema],
  totalAmount: { type: Number, default: 0 },
  restaurantOptions: [{
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
    restaurantName: String,
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  votingOpen: { type: Boolean, default: false },
  couponCode: String,
  couponDiscount: { type: Number, default: 0 },
  couponAppliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scheduledFor: Date,
  isScheduled: { type: Boolean, default: false },
  messages: [{
    senderName: String,
    text: String,
    sentAt: { type: Date, default: Date.now }
  }],
  placedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.models.GroupOrder || mongoose.model('GroupOrder', groupOrderSchema)

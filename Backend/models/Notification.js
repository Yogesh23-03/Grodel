const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  link: { type: String, default: '' },
  read: { type: Boolean, default: false },
  at: { type: Date, default: Date.now }
}, { timestamps: true })

notificationSchema.index({ userId: 1, read: 1, at: -1 })

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema)

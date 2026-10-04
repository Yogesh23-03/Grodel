const mongoose = require('mongoose')

const itemSchema = new mongoose.Schema({ itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true }, qty: { type: Number, required: true, min: 1 } }, { _id: false })
const slotSchema = new mongoose.Schema({
  mealType: { type: String, enum: ['breakfast', 'lunch', 'snacks', 'dinner'], required: true },
  enabled: { type: Boolean, default: false }, orderByTime: { type: String, default: '12:00' },
  defaultShopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', default: null }, defaultItems: [itemSchema],
  pendingSelection: [itemSchema], deliveryAddress: { text: String, latitude: Number, longitude: Number },
  paymentMethod: { type: String, enum: ['cod', 'online'], default: 'cod' }, lastProcessedDate: String
}, { _id: false })
module.exports = mongoose.models.MealSchedule || mongoose.model('MealSchedule', new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true }, slots: [slotSchema] }, { timestamps: true }))

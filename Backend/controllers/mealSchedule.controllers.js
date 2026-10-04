const MealSchedule = require('../models/MealSchedule')
const Item = require('../models/item.Model')
const Shop = require('../models/shop.Model')
const Order = require('../models/order.model')

const currentDate = () => new Date().toISOString().slice(0, 10)
const getSchedule = async (req, res) => {
  try { const schedule = await MealSchedule.findOne({ userId: req.userId }) || await MealSchedule.create({ userId: req.userId, slots: [] }); return res.json(await schedule.populate('slots.defaultItems.itemId')) } catch (error) { return res.status(500).json({ message: error.message }) }
}
const upsertSlot = async (req, res) => {
  try {
    const { mealType, ...slot } = req.body
    if (!['breakfast', 'lunch', 'snacks', 'dinner'].includes(mealType)) return res.status(400).json({ message: 'Valid mealType is required' })
    const schedule = await MealSchedule.findOneAndUpdate({ userId: req.userId }, { $setOnInsert: { slots: [] } }, { upsert: true, new: true })
    const index = schedule.slots.findIndex(s => s.mealType === mealType)
    if (index >= 0) schedule.slots[index] = { ...schedule.slots[index].toObject(), ...slot, mealType }
    else schedule.slots.push({ mealType, ...slot })
    await schedule.save(); return res.json(schedule)
  } catch (error) { return res.status(500).json({ message: error.message }) }
}
const deleteSlot = async (req, res) => { try { const schedule = await MealSchedule.findOneAndUpdate({ userId: req.userId }, { $pull: { slots: { mealType: req.params.mealType } } }, { new: true }); return res.json(schedule) } catch (error) { return res.status(500).json({ message: error.message }) } }
const setSelection = async (req, res) => { try { const schedule = await MealSchedule.findOne({ userId: req.userId }); const slot = schedule?.slots.find(s => s.mealType === req.params.mealType); if (!slot) return res.status(404).json({ message: 'Meal slot not found' }); slot.pendingSelection = req.body.items || []; await schedule.save(); return res.json(schedule) } catch (error) { return res.status(500).json({ message: error.message }) } }
const processMealSchedules = async () => {
  const now = new Date(); const today = currentDate(); const time = now.toTimeString().slice(0, 5)
  const schedules = await MealSchedule.find({ 'slots.enabled': true })
  for (const schedule of schedules) for (const slot of schedule.slots) {
    if (!slot.enabled || slot.lastProcessedDate === today || slot.orderByTime > time) continue
    const picks = slot.pendingSelection?.length ? slot.pendingSelection : slot.defaultItems
    if (!slot.defaultShopId || !picks?.length || !slot.deliveryAddress?.text) { console.log(`Skipping ${slot.mealType} for ${schedule.userId}: incomplete defaults`); slot.lastProcessedDate = today; continue }
    const shop = await Shop.findById(slot.defaultShopId); const items = await Item.find({ _id: { $in: picks.map(p => p.itemId) }, shop: slot.defaultShopId })
    if (!shop || !items.length) { console.log(`Skipping ${slot.mealType} for ${schedule.userId}: no valid items`); slot.lastProcessedDate = today; continue }
    const orderItems = picks.map(p => { const item = items.find(i => String(i._id) === String(p.itemId)); return item && { item: item._id, name: item.name, price: item.price, quantity: p.qty } }).filter(Boolean)
    if (!orderItems.length) continue
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const newOrder = await Order.create({ user: schedule.userId, paymentMethod: 'cod', deliveryAddress: slot.deliveryAddress, totalAmount: subtotal, autoOrderSource: slot.pendingSelection?.length ? 'selection' : 'default', shopOrders: [{ shop: shop._id, owner: shop.owner, subtotal, shopOrderItems: orderItems }] })

    // Notify the restaurant owner in real time about the auto-order
    try {
      const { getIo } = require('../utils/socket')
      const ownerUser = await require('../models/user.Model').findById(shop.owner)
      const io = getIo()
      if (io && ownerUser && ownerUser.socketId) {
        io.to(ownerUser.socketId).emit('newOrder', {
          _id: newOrder._id,
          paymentMethod: 'cod',
          user: { _id: schedule.userId, fullName: 'Scheduled meal order' },
          shopOrders: { shop: shop._id, owner: shop.owner, subtotal, shopOrderItems: orderItems, status: 'pending' },
          createdAt: newOrder.createdAt,
          deliveryAddress: slot.deliveryAddress,
          payment: false
        })
      }
    } catch (notifyError) {
      console.log('meal schedule notify error:', notifyError.message)
    }

    slot.pendingSelection = []; slot.lastProcessedDate = today
  }
  await Promise.all(schedules.map(schedule => schedule.save()))
}
module.exports = { getSchedule, upsertSlot, deleteSlot, setSelection, processMealSchedules }

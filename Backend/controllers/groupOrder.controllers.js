const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const RazorPay = require('razorpay')
const GroupOrder = require('../models/GroupOrder')
const Order = require('../models/order.model')
const Shop = require('../models/shop.Model')
const User = require('../models/user.Model')

const roundMoney = value => Number(Number(value || 0).toFixed(2))
const razorpay = new RazorPay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
})

const optionalAuth = (req, _res, next) => {
  try {
    const token = req.cookies?.token
    if (token) req.userId = jwt.verify(token, process.env.JWT_SECRET).userId
  } catch (_error) {
    req.userId = null
  }
  next()
}

const findGroup = shareableLink => GroupOrder.findOne({ shareableLink })

const expireIfNeeded = async group => {
  if (!['all_paid', 'placed', 'delivered'].includes(group.status) && group.expiresAt < new Date()) {
    group.status = 'expired'
    await group.save()
    return true
  }
  return group.status === 'expired'
}

const recalculate = group => {
  group.participants.forEach(participant => {
    participant.subtotal = roundMoney(participant.items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0
    ))
  })
  const subtotal = group.participants.reduce((sum, participant) => sum + participant.subtotal, 0)
  group.totalAmount = roundMoney(subtotal + Number(group.deliveryFee || 0) - Number(group.couponDiscount || 0))
}

const creatorOnly = (group, req, res) => {
  if (String(group.creatorId) !== String(req.userId)) {
    res.status(403).json({ message: 'Only the creator can do that' })
    return false
  }
  return true
}

const createGroupOrder = async (req, res) => {
  try {
    const { restaurantId, restaurantName, deliveryAddress, deliveryFee = 0, scheduledFor } = req.body
    const [shop, user] = await Promise.all([Shop.findById(restaurantId), User.findById(req.userId)])
    if (!shop) return res.status(404).json({ message: 'Restaurant not found' })

    const groupOrder = await GroupOrder.create({
      creatorId: req.userId,
      restaurantId,
      restaurantName: restaurantName || shop.name,
      deliveryAddress,
      deliveryFee: roundMoney(deliveryFee),
      shareableLink: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      scheduledFor: scheduledFor || undefined,
      isScheduled: Boolean(scheduledFor),
      participants: [{
        userId: req.userId,
        guestName: user?.fullName || 'Creator',
        items: [],
        subtotal: 0
      }]
    })
    return res.status(201).json({ groupOrder, shareableLink: groupOrder.shareableLink })
  } catch (error) {
    return res.status(500).json({ message: `Create group order error: ${error.message}` })
  }
}

const getGroupOrder = async (req, res) => {
  try {
    const group = await findGroup(req.params.shareableLink)
    if (!group) return res.status(404).json({ message: 'Group order not found' })
    if (await expireIfNeeded(group)) return res.status(410).json({ message: 'Group order expired', groupOrder: group })
    return res.status(200).json(group)
  } catch (error) {
    return res.status(500).json({ message: `Get group order error: ${error.message}` })
  }
}

const joinGroupOrder = async (req, res) => {
  try {
    const group = await findGroup(req.params.shareableLink)
    if (!group) return res.status(404).json({ message: 'Group order not found' })
    if (await expireIfNeeded(group)) return res.status(410).json({ message: 'Group order expired' })
    if (group.status !== 'open') return res.status(400).json({ message: 'Order is locked or expired' })

    if (req.userId) {
      const existingIndex = group.participants.findIndex(p => String(p.userId) === String(req.userId))
      if (existingIndex >= 0) return res.status(200).json({ groupOrder: group, participantIndex: existingIndex })
    }
    const user = req.userId ? await User.findById(req.userId) : null
    const guestName = user?.fullName || req.body.guestName
    if (!guestName?.trim()) return res.status(400).json({ message: 'Guest name is required' })

    group.participants.push({ userId: req.userId || null, guestName: guestName.trim(), items: [], subtotal: 0 })
    await group.save()
    return res.status(201).json({ groupOrder: group, participantIndex: group.participants.length - 1 })
  } catch (error) {
    return res.status(500).json({ message: `Join group order error: ${error.message}` })
  }
}

const updateMyItems = async (req, res) => {
  try {
    const group = await findGroup(req.params.shareableLink)
    if (!group) return res.status(404).json({ message: 'Group order not found' })
    if (group.status !== 'open') return res.status(400).json({ message: 'Order is locked or expired' })
    const index = Number(req.body.participantIndex)
    const participant = group.participants[index]
    if (!participant) return res.status(400).json({ message: 'Participant not found' })
    if (req.userId && String(participant.userId) !== String(req.userId)) {
      return res.status(403).json({ message: 'You can only update your own items' })
    }

    participant.items = (req.body.items || [])
      .filter(item => Number(item.quantity) > 0 && Number(item.price) >= 0)
      .map(item => ({
        foodId: item.foodId,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
        image: item.image
      }))
    recalculate(group)
    await group.save()
    return res.status(200).json(group)
  } catch (error) {
    return res.status(500).json({ message: `Update items error: ${error.message}` })
  }
}

const lockOrder = async (req, res) => {
  try {
    const group = await findGroup(req.params.shareableLink)
    if (!group) return res.status(404).json({ message: 'Group order not found' })
    if (!creatorOnly(group, req, res)) return
    if (group.status !== 'open') return res.status(400).json({ message: 'Order is not open' })
    if (!group.participants.length) return res.status(400).json({ message: 'No participants to lock' })

    const share = roundMoney(group.deliveryFee / group.participants.length)
    group.participants.forEach((participant, index) => {
      participant.deliveryShare = index === group.participants.length - 1
        ? roundMoney(group.deliveryFee - share * (group.participants.length - 1))
        : share
    })
    recalculate(group)
    group.status = 'locked'
    await group.save()
    return res.status(200).json(group)
  } catch (error) {
    return res.status(500).json({ message: `Lock order error: ${error.message}` })
  }
}

const placeOrder = async group => {
  if (group.placedOrderId) return Order.findById(group.placedOrderId)
  const shop = await Shop.findById(group.restaurantId)
  const allItems = group.participants.flatMap(participant => participant.items)
  const order = await Order.create({
    user: group.creatorId,
    paymentMethod: 'online',
    deliveryAddress: { text: group.deliveryAddress || '' },
    totalAmount: group.totalAmount,
    payment: true,
    shopOrders: [{
      shop: group.restaurantId,
      owner: shop?.owner,
      subtotal: group.totalAmount,
      shopOrderItems: allItems.map(item => ({
        item: item.foodId,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }))
    }]
  })
  group.placedOrderId = order._id
  group.status = 'placed'
  await group.save()
  return order
}

const payMyShare = async (req, res) => {
  try {
    const group = await findGroup(req.params.shareableLink)
    if (!group) return res.status(404).json({ message: 'Group order not found' })
    if (group.status !== 'locked') return res.status(400).json({ message: 'Order must be locked before payment' })
    const participant = group.participants[Number(req.body.participantIndex)]
    if (!participant) return res.status(400).json({ message: 'Participant not found' })
    if (req.userId && String(participant.userId) !== String(req.userId)) {
      return res.status(403).json({ message: 'You can only pay your own share' })
    }

    if (participant.paymentStatus === 'paid') return res.status(400).json({ message: 'This share is already paid' })
    const amount = roundMoney(
      Number(participant.subtotal || 0) +
      Number(participant.deliveryShare || 0) -
      Number(participant.couponDiscount || 0)
    )
    if (amount <= 0) return res.status(400).json({ message: 'Payment amount must be greater than zero' })

    const razorOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `group_${String(group._id).slice(-8)}_${Number(req.body.participantIndex)}`
    })
    participant.paymentSessionId = razorOrder.id
    participant.paymentStatus = 'pending'
    await group.save()
    return res.status(200).json({ razorOrder, participantIndex: Number(req.body.participantIndex) })
  } catch (error) {
    return res.status(500).json({ message: `Pay share error: ${error.message}` })
  }
}

const verifySharePayment = async (req, res) => {
  try {
    const group = await findGroup(req.params.shareableLink)
    if (!group) return res.status(404).json({ message: 'Group order not found' })
    if (group.status !== 'locked') return res.status(400).json({ message: 'Order is not awaiting payment' })

    const participant = group.participants[Number(req.body.participantIndex)]
    if (!participant) return res.status(400).json({ message: 'Participant not found' })
    if (req.userId && String(participant.userId) !== String(req.userId)) {
      return res.status(403).json({ message: 'You can only verify your own payment' })
    }
    if (!participant.paymentSessionId || participant.paymentSessionId !== req.body.razorpay_order_id) {
      return res.status(400).json({ message: 'Payment session does not match' })
    }
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${req.body.razorpay_order_id}|${req.body.razorpay_payment_id}`)
      .digest('hex')
    if (expectedSignature !== req.body.razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' })
    }

    const payment = await razorpay.payments.fetch(req.body.razorpay_payment_id)
    if (!payment || payment.status !== 'captured' || payment.order_id !== participant.paymentSessionId) {
      participant.paymentStatus = 'failed'
      await group.save()
      return res.status(400).json({ message: 'Payment was not captured' })
    }

    participant.paymentStatus = 'paid'
    participant.paidAt = new Date()
    if (group.participants.every(p => p.paymentStatus === 'paid')) {
      group.status = 'all_paid'
      await group.save()
      if (!group.isScheduled || !group.scheduledFor || group.scheduledFor <= new Date()) await placeOrder(group)
    } else {
      await group.save()
    }
    return res.status(200).json(group)
  } catch (error) {
    return res.status(500).json({ message: `Verify share payment error: ${error.message}` })
  }
}

const getMyGroupOrders = async (req, res) => {
  try {
    const groups = await GroupOrder.find({ 'participants.userId': req.userId }).sort({ createdAt: -1 })
    return res.status(200).json(groups)
  } catch (error) {
    return res.status(500).json({ message: `Get group orders error: ${error.message}` })
  }
}

const removeParticipant = async (req, res) => {
  try {
    const group = await findGroup(req.params.shareableLink)
    if (!group) return res.status(404).json({ message: 'Group order not found' })
    if (!creatorOnly(group, req, res)) return
    if (!['open', 'locked'].includes(group.status)) return res.status(400).json({ message: 'Participant cannot be removed now' })
    const index = Number(req.body.participantIndex)
    if (!Number.isInteger(index) || index <= 0 || !group.participants[index]) {
      return res.status(400).json({ message: 'Creator cannot be removed' })
    }
    if (group.participants[index].paymentStatus === 'paid') {
      // TODO: Add refund logic for paid participants
    }
    group.participants.splice(index, 1)
    if (group.status === 'locked' && group.participants.length) {
      const share = roundMoney(group.deliveryFee / group.participants.length)
      group.participants.forEach((participant, participantIndex) => {
        participant.deliveryShare = participantIndex === group.participants.length - 1
          ? roundMoney(group.deliveryFee - share * (group.participants.length - 1))
          : share
      })
    }
    const subtotal = group.participants.reduce((sum, participant) => sum + participant.subtotal, 0)
    group.participants.forEach(participant => {
      participant.couponDiscount = subtotal && group.couponDiscount
        ? roundMoney((participant.subtotal / subtotal) * group.couponDiscount)
        : 0
    })
    recalculate(group)
    await group.save()
    return res.status(200).json(group)
  } catch (error) {
    return res.status(500).json({ message: `Remove participant error: ${error.message}` })
  }
}

const nudgeParticipant = async (req, res) => {
  try {
    const group = await findGroup(req.params.shareableLink)
    if (!group) return res.status(404).json({ message: 'Group order not found' })
    if (!creatorOnly(group, req, res)) return
    if (!group.participants[Number(req.body.participantIndex)]) return res.status(400).json({ message: 'Participant not found' })
    // TODO: Send push notification or SMS to participant
    return res.status(200).json({ message: 'Nudge sent' })
  } catch (error) {
    return res.status(500).json({ message: `Nudge error: ${error.message}` })
  }
}

const nudgeAllUnpaid = async (req, res) => {
  try {
    const group = await findGroup(req.params.shareableLink)
    if (!group) return res.status(404).json({ message: 'Group order not found' })
    if (!creatorOnly(group, req, res)) return
    const count = group.participants.filter(participant => participant.paymentStatus !== 'paid').length
    return res.status(200).json({ message: `${count} unpaid participant${count === 1 ? '' : 's'} nudged` })
  } catch (error) { return res.status(500).json({ message: `Nudge error: ${error.message}` }) }
}

const setVoteOptions = async (req, res) => {
  try {
    const group = await findGroup(req.params.shareableLink)
    if (!group) return res.status(404).json({ message: 'Group order not found' })
    if (!creatorOnly(group, req, res)) return
    const options = req.body.restaurantOptions || []
    if (options.length < 2 || options.length > 3) return res.status(400).json({ message: 'Choose 2 or 3 restaurants' })
    group.restaurantOptions = options.map(option => ({ ...option, votes: [] }))
    group.votingOpen = true
    await group.save()
    return res.status(200).json(group)
  } catch (error) {
    return res.status(500).json({ message: `Vote options error: ${error.message}` })
  }
}

const voteRestaurant = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Sign in to vote' })
    const group = await findGroup(req.params.shareableLink)
    if (!group?.votingOpen) return res.status(400).json({ message: 'Voting is closed' })
    group.restaurantOptions.forEach(option => {
      option.votes = option.votes.filter(id => String(id) !== String(req.userId))
    })
    const option = group.restaurantOptions.find(o => String(o.restaurantId) === String(req.body.restaurantId))
    if (!option) return res.status(400).json({ message: 'Restaurant option not found' })
    option.votes.push(req.userId)
    await group.save()
    return res.status(200).json(group)
  } catch (error) {
    return res.status(500).json({ message: `Vote error: ${error.message}` })
  }
}

const closeVote = async (req, res) => {
  try {
    const group = await findGroup(req.params.shareableLink)
    if (!group) return res.status(404).json({ message: 'Group order not found' })
    if (!creatorOnly(group, req, res)) return
    const winner = [...group.restaurantOptions].sort((a, b) => b.votes.length - a.votes.length)[0]
    if (!winner) return res.status(400).json({ message: 'No restaurant options found' })
    group.restaurantId = winner.restaurantId
    group.restaurantName = winner.restaurantName
    group.votingOpen = false
    group.participants.forEach(participant => {
      participant.items = []
      participant.subtotal = 0
    })
    recalculate(group)
    await group.save()
    return res.status(200).json(group)
  } catch (error) {
    return res.status(500).json({ message: `Close vote error: ${error.message}` })
  }
}

const applyCoupon = async (req, res) => {
  try {
    const group = await findGroup(req.params.shareableLink)
    if (!group) return res.status(404).json({ message: 'Group order not found' })
    if (!['open', 'locked'].includes(group.status)) return res.status(400).json({ message: 'Coupon cannot be applied now' })
    const code = String(req.body.couponCode || '').trim().toUpperCase()
    const coupons = { GRODEL10: 10, GROUP50: 50, FEAST100: 100 }
    if (!coupons[code]) return res.status(400).json({ message: 'Invalid coupon code' })
    const subtotal = group.participants.reduce((sum, p) => sum + p.subtotal, 0)
    group.couponCode = code
    group.couponDiscount = Math.min(coupons[code], subtotal)
    group.couponAppliedBy = req.userId || undefined
    group.participants.forEach(p => {
      p.couponDiscount = subtotal ? roundMoney((p.subtotal / subtotal) * group.couponDiscount) : 0
    })
    recalculate(group)
    await group.save()
    return res.status(200).json(group)
  } catch (error) {
    return res.status(500).json({ message: `Apply coupon error: ${error.message}` })
  }
}

const reorderGroup = async (req, res) => {
  try {
    const previous = await GroupOrder.findById(req.params.groupOrderId)
    if (!previous) return res.status(404).json({ message: 'Group order not found' })
    const user = await User.findById(req.userId)
    const participants = previous.participants.map((p, index) => ({
      userId: index === 0 ? req.userId : p.userId,
      guestName: index === 0 ? user?.fullName : p.guestName,
      items: p.items,
      subtotal: p.subtotal,
      paymentStatus: 'pending',
      deliveryShare: 0,
      couponDiscount: 0
    }))
    const group = await GroupOrder.create({
      creatorId: req.userId,
      restaurantId: previous.restaurantId,
      restaurantName: previous.restaurantName,
      deliveryAddress: previous.deliveryAddress,
      deliveryFee: previous.deliveryFee,
      participants,
      totalAmount: participants.reduce((sum, p) => sum + p.subtotal, 0) + previous.deliveryFee,
      shareableLink: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    })
    return res.status(201).json({ groupOrder: group, shareableLink: group.shareableLink })
  } catch (error) {
    return res.status(500).json({ message: `Reorder error: ${error.message}` })
  }
}

const sendChatMessage = async (req, res) => {
  try {
    const group = await findGroup(req.params.shareableLink)
    if (!group) return res.status(404).json({ message: 'Group order not found' })
    const text = String(req.body.text || '').trim()
    if (!text) return res.status(400).json({ message: 'Message is required' })
    group.messages.push({ senderName: req.body.senderName || 'Guest', text: text.slice(0, 500) })
    await group.save()
    return res.status(201).json(group)
  } catch (error) {
    return res.status(500).json({ message: `Chat error: ${error.message}` })
  }
}

const processScheduledOrders = async () => {
  const groups = await GroupOrder.find({ status: 'all_paid', isScheduled: true, scheduledFor: { $lte: new Date() } })
  for (const group of groups) await placeOrder(group)
}

module.exports = {
  optionalAuth,
  createGroupOrder,
  getGroupOrder,
  joinGroupOrder,
  updateMyItems,
  lockOrder,
  payMyShare,
  verifySharePayment,
  placeOrder,
  getMyGroupOrders,
  removeParticipant,
  nudgeParticipant,
  nudgeAllUnpaid,
  setVoteOptions,
  voteRestaurant,
  closeVote,
  applyCoupon,
  reorderGroup,
  sendChatMessage,
  processScheduledOrders
}

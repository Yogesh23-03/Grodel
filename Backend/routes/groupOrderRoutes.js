const express = require('express')
const isAuth = require('../middlewares/isAuth')
const {
  optionalAuth,
  createGroupOrder,
  getGroupOrder,
  joinGroupOrder,
  updateMyItems,
  lockOrder,
  payMyShare,
  verifySharePayment,
  getMyGroupOrders,
  removeParticipant,
  nudgeParticipant,
  nudgeAllUnpaid,
  setVoteOptions,
  voteRestaurant,
  closeVote,
  applyCoupon,
  reorderGroup,
  sendChatMessage
} = require('../controllers/groupOrder.controllers')

const router = express.Router()
const Item = require('../models/item.Model')

router.post('/group-orders', isAuth, createGroupOrder)
router.get('/group-orders/my', isAuth, getMyGroupOrders)
router.post('/group-orders/reorder/:groupOrderId', isAuth, reorderGroup)
router.get('/group-orders/link/:shareableLink', getGroupOrder)
router.post('/group-orders/link/:shareableLink/join', optionalAuth, joinGroupOrder)
router.patch('/group-orders/link/:shareableLink/items', optionalAuth, updateMyItems)
router.post('/group-orders/link/:shareableLink/lock', isAuth, lockOrder)
router.post('/group-orders/link/:shareableLink/pay', optionalAuth, payMyShare)
router.post('/group-orders/link/:shareableLink/verify-payment', optionalAuth, verifySharePayment)
router.delete('/group-orders/link/:shareableLink/participant', isAuth, removeParticipant)
router.post('/group-orders/link/:shareableLink/nudge', isAuth, nudgeParticipant)
router.post('/group-orders/link/:shareableLink/nudge-all', isAuth, nudgeAllUnpaid)
router.post('/group-orders/link/:shareableLink/vote-options', isAuth, setVoteOptions)
router.post('/group-orders/link/:shareableLink/vote', isAuth, voteRestaurant)
router.post('/group-orders/link/:shareableLink/close-vote', isAuth, closeVote)
router.post('/group-orders/link/:shareableLink/apply-coupon', optionalAuth, applyCoupon)
router.post('/group-orders/link/:shareableLink/chat', optionalAuth, sendChatMessage)
router.get('/group-orders/menu/:shopId', async (req, res) => {
  try {
    return res.status(200).json(await Item.find({ shop: req.params.shopId }))
  } catch (error) {
    return res.status(500).json({ message: `Menu error: ${error.message}` })
  }
})

module.exports = router

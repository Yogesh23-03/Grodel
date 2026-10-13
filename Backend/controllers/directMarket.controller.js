const User = require("../models/user.Model.js")
const VendorProfile = require("../models/VendorProfile.js")
const VendorListing = require("../models/VendorListing.js")
const VendorOrder = require("../models/VendorOrder.js")
const FarmerThread = require("../models/FarmerThread.js")
const CoopOrder = require("../models/CoopOrder.js")
const MarketPriceModel = require("../models/MarketPrice.js")
const Notification = require("../models/Notification.js")
const { getIo } = require("../utils/socket.js")
const { sendNotificationMail } = require("../utils/mail.js")

// A minimal nodemailer failure must never break an API response.
const tryMail = (to, subject, html) => {
  if (!to) return
  sendNotificationMail(to, subject, html).catch(error => console.error("NOTIFICATION MAIL ERROR:", error.message))
}

const notify = async (userId, type, title, body, link) => {
  try {
    const notification = await Notification.create({ userId, type, title, body, link: link || "" })
    const io = getIo()
    const user = await User.findById(userId).select("socketId email")
    if (io && user?.socketId) {
      io.to(user.socketId).emit("notification", { ...notification.toObject() })
    }
    if (user?.email && ["newOffer", "offerAccepted", "offerRejected", "newMessage", "newBulkOrder", "orderStatus", "priceAlert"].includes(type)) {
      const color = type === "priceAlert" ? "#2f7d4f" : "#34572c"
      tryMail(user.email, title, `<div style="font-family:sans-serif"><h3 style="color:${color}">${title}</h3><p>${body}</p>${link ? `<p><a href="${link}">Open GroDel</a></p>` : ""}</div>`)
    }
    return notification
  } catch (error) {
    console.error("NOTIFY ERROR:", error.message)
    return null
  }
}

// ------------------------------------------------------------------
// A. Farmer identity
// ------------------------------------------------------------------
const upsertFarmerProfile = async (req, res) => {
  try {
    const vendor = await User.findById(req.userId)
    if (!vendor || !["vendor", "helper"].includes(vendor.role)) {
      return res.status(403).json({ success: false, message: "Vendor role required" })
    }
    let profile = await VendorProfile.findOne({ userId: vendor._id })
    if (!profile) {
      profile = await VendorProfile.create({
        userId: vendor._id,
        displayName: vendor.fullName,
        phoneNumber: vendor.mobile,
        registeredVia: "web"
      })
    }
    const b = req.body || {}
    const farmer = b.farmer || {}
    profile.farmer = {
      ...profile.farmer?.toObject?.() || {},
      farmSizeAcres: farmer.farmSizeAcres ?? profile.farmer?.farmSizeAcres ?? null,
      village: farmer.village ?? profile.farmer?.village ?? "",
      taluk: farmer.taluk ?? profile.farmer?.taluk ?? "",
      cropsGrown: farmer.cropsGrown ?? profile.farmer?.cropsGrown ?? [],
      yearsExperience: farmer.yearsExperience ?? profile.farmer?.yearsExperience ?? null,
      organic: farmer.organic ?? profile.farmer?.organic ?? false,
      fpoName: farmer.fpoName ?? profile.farmer?.fpoName ?? "",
      story: farmer.story ?? profile.farmer?.story ?? "",
      cropCalendar: farmer.cropCalendar ?? profile.farmer?.cropCalendar ?? []
    }
    if (farmer.aadhaarStatus && ["unverified", "pending", "verified"].includes(farmer.aadhaarStatus)) {
      profile.farmer.aadhaarStatus = farmer.aadhaarStatus
    }
    if (b.location) profile.location = { ...profile.location?.toObject?.() || {}, ...b.location }
    if (b.displayName) profile.displayName = b.displayName
    await profile.save()
    return res.status(200).json({ success: true, profile })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// B. Buyer identity
// ------------------------------------------------------------------
const saveBuyerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ success: false, message: "User not found" })
    const b = req.body || {}
    const allowedTypes = ["consumer", "retailer", "hotel", "canteen", "exporter"]
    user.buyerProfile = {
      buyerType: allowedTypes.includes(b.buyerType) ? b.buyerType : "consumer",
      businessName: b.businessName || "",
      gstin: b.gstin || "",
      typicalMonthlyVolume: b.typicalMonthlyVolume || "",
      preferredCategories: Array.isArray(b.preferredCategories) ? b.preferredCategories : [],
      deliveryPincodes: Array.isArray(b.deliveryPincodes) ? b.deliveryPincodes : [],
      onboardingComplete: true
    }
    await user.save()
    return res.status(200).json({ success: true, buyerProfile: user.buyerProfile })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const getBuyerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("buyerProfile")
    return res.status(200).json({ success: true, buyerProfile: user?.buyerProfile || null })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// F. Farmer-buyer threads + negotiation
// ------------------------------------------------------------------
const startThread = async (req, res) => {
  try {
    const { farmerId, listingId } = req.body
    if (!farmerId) return res.status(400).json({ success: false, message: "farmerId is required" })
    const farmer = await VendorProfile.findById(farmerId)
    if (!farmer) return res.status(404).json({ success: false, message: "Farmer not found" })
    let thread = await FarmerThread.findOne({ farmerId, buyerId: req.userId, listingId: listingId || null, status: { $in: ["open", "accepted"] } })
    if (!thread) {
      thread = await FarmerThread.create({ farmerId, buyerId: req.userId, listingId: listingId || null })
    }
    const populated = await FarmerThread.findById(thread._id).populate("buyerId", "fullName").populate("listingId", "name image pricePerUnit unit")
    return res.status(200).json({ success: true, thread: populated })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const getMyThreads = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    let threads
    if (user.role === "vendor") {
      const profile = await VendorProfile.findOne({ userId: req.userId })
      threads = await FarmerThread.find({ farmerId: profile?._id }).populate("buyerId", "fullName buyerProfile").populate("listingId", "name image pricePerUnit unit").sort({ lastActivityAt: -1 })
    } else {
      threads = await FarmerThread.find({ buyerId: req.userId }).populate("buyerId", "fullName").populate("listingId", "name image pricePerUnit unit").sort({ lastActivityAt: -1 })
    }
    return res.status(200).json({ success: true, threads })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const getThread = async (req, res) => {
  try {
    const thread = await FarmerThread.findById(req.params.threadId).populate("buyerId", "fullName").populate("listingId", "name image pricePerUnit unit")
    if (!thread) return res.status(404).json({ success: false, message: "Thread not found" })
    const isBuyer = String(thread.buyerId._id) === String(req.userId)
    let isFarmer = false
    if (!isBuyer) {
      const profile = await VendorProfile.findOne({ userId: req.userId })
      isFarmer = profile && String(thread.farmerId) === String(profile._id)
    }
    if (!isBuyer && !isFarmer) return res.status(403).json({ success: false, message: "Not a participant" })
    return res.status(200).json({ success: true, thread, viewerRole: isFarmer ? "farmer" : "buyer" })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const postMessage = async (req, res) => {
  try {
    const thread = await FarmerThread.findById(req.params.threadId)
    if (!thread) return res.status(404).json({ success: false, message: "Thread not found" })
    const user = await User.findById(req.userId)
    const profile = user.role === "vendor" ? await VendorProfile.findOne({ userId: req.userId }) : null
    const isBuyer = String(thread.buyerId) === String(req.userId)
    const isFarmer = profile && String(thread.farmerId) === String(profile._id)
    if (!isBuyer && !isFarmer) return res.status(403).json({ success: false, message: "Not a participant" })
    const fromRole = isFarmer ? "farmer" : "buyer"
    const message = { fromRole, senderId: req.userId, text: (req.body.text || "").slice(0, 2000), at: new Date() }
    thread.messages.push(message)
    thread.lastActivityAt = new Date()
    await thread.save()

    const counterpartId = isFarmer ? thread.buyerId : (profile ? profile.userId : null)
    if (counterpartId) {
      await notify(counterpartId, "newMessage", `New message from ${user.fullName}`, message.text.slice(0, 120), "/farmers/inbox")
      const io = getIo()
      const counterpart = await User.findById(counterpartId).select("socketId")
      if (io && counterpart?.socketId) {
        io.to(counterpart.socketId).emit("farmerThreadMessage", { threadId: thread._id, message })
      }
    }
    return res.status(201).json({ success: true, message })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// Offers carry the negotiation. Counter = new proposed offer; accept locks the thread.
const postOffer = async (req, res) => {
  try {
    const { qty, unit, pricePerUnit, note, expiresAt } = req.body
    if (!qty || pricePerUnit === undefined) return res.status(400).json({ success: false, message: "qty and pricePerUnit are required" })
    const thread = await FarmerThread.findById(req.params.threadId)
    if (!thread) return res.status(404).json({ success: false, message: "Thread not found" })
    const user = await User.findById(req.userId)
    const profile = user.role === "vendor" ? await VendorProfile.findOne({ userId: req.userId }) : null
    const isBuyer = String(thread.buyerId) === String(req.userId)
    const isFarmer = profile && String(thread.farmerId) === String(profile._id)
    if (!isBuyer && !isFarmer) return res.status(403).json({ success: false, message: "Not a participant" })
    if (thread.status === "accepted") return res.status(400).json({ success: false, message: "Offer already accepted" })
    const fromRole = isFarmer ? "farmer" : "buyer"

    // Expire standing proposed/countered offers, then push the new one.
    thread.offers.forEach(o => { if (["proposed", "countered"].includes(o.status)) o.status = "expired" })
    const offer = { fromRole, qty: Number(qty), unit: unit || "kg", pricePerUnit: Number(pricePerUnit), note: note || "", status: "proposed", expiresAt: expiresAt || null, at: new Date() }
    thread.offers.push(offer)
    thread.lastActivityAt = new Date()
    await thread.save()

    const counterpartId = isFarmer ? thread.buyerId : (profile ? profile.userId : null)
    if (counterpartId) {
      await notify(counterpartId, "newOffer", `New offer: ${qty} ${unit || "kg"} @ ₹${pricePerUnit}`, offer.note || "Open the inbox to counter or accept.", "/farmers/inbox")
      const io = getIo()
      const counterpart = await User.findById(counterpartId).select("socketId")
      if (io && counterpart?.socketId) {
        io.to(counterpart.socketId).emit("farmerOfferUpdate", { threadId: thread._id, offer: thread.offers[thread.offers.length - 1] })
      }
    }
    return res.status(201).json({ success: true, offer: thread.offers[thread.offers.length - 1] })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const respondOffer = async (req, res) => {
  try {
    const { action } = req.body // "accept" | "reject"
    const thread = await FarmerThread.findById(req.params.threadId)
    if (!thread) return res.status(404).json({ success: false, message: "Thread not found" })
    const user = await User.findById(req.userId)
    const profile = user.role === "vendor" ? await VendorProfile.findOne({ userId: req.userId }) : null
    const isBuyer = String(thread.buyerId) === String(req.userId)
    const isFarmer = profile && String(thread.farmerId) === String(profile._id)
    if (!isBuyer && !isFarmer) return res.status(403).json({ success: false, message: "Not a participant" })

    const offer = [...thread.offers].reverse().find(o => ["proposed", "countered"].includes(o.status))
    if (!offer) return res.status(400).json({ success: false, message: "No standing offer" })
    if (offer.fromRole === (isFarmer ? "farmer" : "buyer")) {
      return res.status(400).json({ success: false, message: "The other side must respond to this offer" })
    }

    if (action === "accept") {
      offer.status = "accepted"
      thread.status = "accepted"
    } else {
      offer.status = "rejected"
    }
    await thread.save()

    const counterpartId = isFarmer ? thread.buyerId : (profile ? profile.userId : null)
    if (counterpartId) {
      await notify(counterpartId, action === "accept" ? "offerAccepted" : "offerRejected",
        action === "accept" ? "Your offer was accepted" : "Your offer was declined",
        `${offer.qty} ${offer.unit} @ ₹${offer.pricePerUnit}`, "/farmers/inbox")
      const io = getIo()
      const counterpart = await User.findById(counterpartId).select("socketId")
      if (io && counterpart?.socketId) {
        io.to(counterpart.socketId).emit("farmerOfferUpdate", { threadId: thread._id, offer })
      }
    }
    return res.status(200).json({ success: true, offer, thread })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// Convert an accepted offer into a VendorOrder (seller creates the order document).
const convertOfferToOrder = async (req, res) => {
  try {
    const thread = await FarmerThread.findById(req.params.threadId)
    if (!thread) return res.status(404).json({ success: false, message: "Thread not found" })
    const accepted = [...thread.offers].reverse().find(o => o.status === "accepted")
    if (!accepted) return res.status(400).json({ success: false, message: "No accepted offer to convert" })
    if (thread.convertedOrderId) {
      return res.status(200).json({ success: true, orderId: thread.convertedOrderId, alreadyConverted: true })
    }
    const farmer = await VendorProfile.findById(thread.farmerId)
    const listing = thread.listingId ? await VendorListing.findById(thread.listingId) : null
    const buyer = await User.findById(thread.buyerId)
    const totalAmount = accepted.qty * accepted.pricePerUnit
    const order = await VendorOrder.create({
      customer: thread.buyerId,
      vendor: thread.farmerId,
      vendorUserId: farmer.userId,
      items: [{
        listing: listing?._id || null,
        name: listing?.name || "Negotiated produce",
        image: listing?.image || "",
        pricePerUnit: accepted.pricePerUnit,
        quantity: accepted.qty,
        unit: accepted.unit
      }],
      totalAmount,
      paymentMethod: req.body.paymentMethod === "online" ? "online" : "cod",
      deliveryAddress: {
        text: req.body.deliveryAddress || buyer.buyerProfile?.deliveryPincodes?.[0] || "",
        latitude: req.body.latitude ?? 0,
        longitude: req.body.longitude ?? 0
      },
      contactPhone: buyer.mobile || "",
      note: `From negotiation. ${accepted.note || ""}`.trim(),
      buyerType: buyer.buyerProfile?.buyerType || "consumer",
      negotiationId: thread._id,
      fulfillmentType: req.body.fulfillmentType === "pickup" ? "pickup" : "delivery",
      source: "negotiated",
      status: "pending",
      statusHistory: [{ status: "pending", at: new Date() }]
    })
    thread.status = "converted"
    thread.convertedOrderId = order._id
    await thread.save()
    await notify(farmer.userId, "orderStatus", "Negotiation converted to order", `${accepted.qty} ${accepted.unit} @ ₹${accepted.pricePerUnit} awaits your confirmation.`, "/farmer/orders")
    return res.status(201).json({ success: true, orderId: order._id, order })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// E. Matching (rule-based)
// ------------------------------------------------------------------
const getBuyerMatches = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user?.buyerProfile?.onboardingComplete) {
      return res.status(400).json({ success: false, message: "Complete buyer onboarding first" })
    }
    const categories = user.buyerProfile.preferredCategories?.length ? user.buyerProfile.preferredCategories : null
    const query = { isAvailableToday: true }
    if (categories) query.category = { $in: categories }
    const listings = await VendorListing.find(query).populate("vendorId").limit(120)

    // Rank: distance (user coords vs farm coords), then rating, then freshest harvest.
    const [lng, lat] = user.location?.coordinates || [0, 0]
    const distanceOf = (p) => {
      const c = p?.location?.coordinates || [0, 0]
      return Math.abs(c[0] - lng) + Math.abs(c[1] - lat)
    }
    const matched = listings
      .filter(l => l.vendorId?.isActive)
      .map(l => ({
        listing: l,
        farmer: l.vendorId,
        distanceKey: distanceOf(l.vendorId)
      }))
      .sort((a, b) => (b.farmer.rating?.average || 0) - (a.farmer.rating?.average || 0))
      .slice(0, 40)
    return res.status(200).json({ success: true, matches: matched })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// B/H. Buyer purchase history (produce orders placed by this user)
// ------------------------------------------------------------------
const getBuyerPurchases = async (req, res) => {
  try {
    const orders = await VendorOrder.find({ customer: req.userId }).sort({ createdAt: -1 }).limit(100)
    return res.status(200).json({ success: true, orders })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// G. Farmer order queue
// ------------------------------------------------------------------
const getFarmerOrders = async (req, res) => {
  try {
    const profile = await VendorProfile.findOne({ userId: req.userId })
    if (!profile) return res.status(403).json({ success: false, message: "Farmer profile required" })
    const orders = await VendorOrder.find({ vendor: profile._id }).sort({ createdAt: -1 }).limit(100)
    const coopIds = orders.map(o => o.coopOrderId).filter(Boolean)
    const coops = coopIds.length ? await CoopOrder.find({ _id: { $in: coopIds } }) : []
    return res.status(200).json({ success: true, orders, coops })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// H. Earnings ledger
// ------------------------------------------------------------------
const getFarmerEarnings = async (req, res) => {
  try {
    const profile = await VendorProfile.findOne({ userId: req.userId })
    if (!profile) return res.status(403).json({ success: false, message: "Farmer profile required" })
    const orders = await VendorOrder.find({ vendor: profile._id, status: { $in: ["delivered", "out of delivery", "confirmed", "ready"] } })
      .sort({ createdAt: -1 }).limit(200)
    const settled = orders.filter(o => o.status === "delivered" && (o.payment || o.paymentMethod === "cod"))
    const pending = orders.filter(o => o.status !== "delivered" || !o.payment)
    const settledAmount = settled.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    const pendingAmount = pending.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    return res.status(200).json({ success: true, orders, settledAmount, pendingAmount, totalEarnings: profile.totalEarnings || 0 })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// J. Buyer rating (farmers rate buyers — internal only)
// ------------------------------------------------------------------
const rateBuyer = async (req, res) => {
  try {
    const { rating, note } = req.body
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: "Rating 1-5 required" })
    const order = await VendorOrder.findById(req.params.orderId)
    if (!order) return res.status(404).json({ success: false, message: "Order not found" })
    const profile = await VendorProfile.findOne({ userId: req.userId })
    if (!profile || String(order.vendor) !== String(profile._id)) {
      return res.status(403).json({ success: false, message: "Not your order" })
    }
    if (order.status !== "delivered") return res.status(400).json({ success: false, message: "Rate after delivery" })
    order.buyerRating = { rating, note: note || "", at: new Date() }
    await order.save()
    return res.status(200).json({ success: true, buyerRating: order.buyerRating })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// K. Bulk-order split into a cooperative order
// ------------------------------------------------------------------
const proposeCoopSplit = async (req, res) => {
  try {
    const { orderId, listingId } = req.body
    const parent = await VendorOrder.findById(orderId)
    if (!parent) return res.status(404).json({ success: false, message: "Order not found" })
    const line = parent.items.find(i => String(i.listing) === String(listingId)) || parent.items[0]
    if (!line) return res.status(400).json({ success: false, message: "No line item to split" })
    const shortQty = line.quantity
    const listing = await VendorListing.findById(line.listing)
    const crop = line.name

    // Candidates: same crop, in stock, ranked by distance to buyer, then rating, then earliest harvest.
    const candidates = await VendorListing.find({ name: crop, isAvailableToday: true, availableQuantity: { $gt: 0 } }).populate("vendorId")
    const buyer = await User.findById(parent.customer)
    const [bLng, bLat] = buyer?.location?.coordinates || [0, 0]
    const dist = (v) => {
      const c = v?.location?.coordinates || [0, 0]
      return Math.abs(c[0] - bLng) + Math.abs(c[1] - bLat)
    }
    candidates.sort((a, b) => dist(a.vendorId) - dist(b.vendorId) || (b.vendorId.rating?.average || 0) - (a.vendorId.rating?.average || 0) || new Date(a.harvestDate || 0) - new Date(b.harvestDate || 0))

    let remaining = shortQty
    const shares = []
    for (const candidate of candidates) {
      if (remaining <= 0) break
      const take = Math.min(candidate.availableQuantity, remaining)
      shares.push({ farmerId: candidate.vendorId._id, listingId: candidate._id, qty: take, pricePerUnit: candidate.pricePerUnit, payout: take * candidate.pricePerUnit, status: "proposed" })
      remaining -= take
    }
    if (!shares.length || remaining > 0) {
      return res.status(400).json({ success: false, message: "Nearby stock cannot cover this order yet", shortfall: remaining })
    }
    const coop = await CoopOrder.create({
      parentOrder: parent._id,
      cropName: crop,
      unit: line.unit || "kg",
      totalQty: shortQty,
      targetPricePerUnit: line.pricePerUnit,
      dispatchDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      shares
    })
    for (const share of shares) {
      const farmerProfile = await VendorProfile.findById(share.farmerId)
      if (farmerProfile) {
        await notify(farmerProfile.userId, "newBulkOrder", "Incoming cooperative order", `${share.qty} ${coop.unit} of ${crop} — your payout ₹${share.payout}. Accept or decline.`, "/farmer/orders")
      }
    }
    return res.status(201).json({ success: true, coop })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const respondCoopShare = async (req, res) => {
  try {
    const { coopId, shareIndex } = req.params
    const { action } = req.body // "accept" | "reject"
    const coop = await CoopOrder.findById(coopId)
    if (!coop) return res.status(404).json({ success: false, message: "Coop order not found" })
    const profile = await VendorProfile.findOne({ userId: req.userId })
    if (!profile) return res.status(403).json({ success: false, message: "Farmer profile required" })
    const share = coop.shares[Number(shareIndex)]
    if (!share || String(share.farmerId) !== String(profile._id)) {
      return res.status(403).json({ success: false, message: "Not your share" })
    }
    share.status = action === "accept" ? "accepted" : "rejected"
    share.respondedAt = new Date()
    const acceptedQty = coop.shares.filter(s => s.status === "accepted").reduce((s, x) => s + x.qty, 0)
    const anyRejected = coop.shares.some(s => s.status === "rejected")
    coop.status = acceptedQty >= coop.totalQty ? "confirmed" : (acceptedQty > 0 ? "partial" : (anyRejected ? "failed" : "proposed"))
    await coop.save()
    return res.status(200).json({ success: true, coop })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// L. Market prices, price band, alerts
// ------------------------------------------------------------------
const getPriceBand = async (req, res) => {
  try {
    const { crop, district } = req.query
    if (!crop) return res.status(400).json({ success: false, message: "crop is required" })
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const entries = await MarketPriceModel.MarketPrice.find({ crop: new RegExp(`^${crop}$`, "i"), district: district ? new RegExp(`^${district}$`, "i") : { $exists: true }, at: { $gte: since } }).sort({ at: -1 }).limit(100)
    if (!entries.length) return res.status(200).json({ success: true, band: null })
    const prices = entries.map(e => e.pricePerUnit).sort((a, b) => a - b)
    const median = prices[Math.floor(prices.length / 2)]
    return res.status(200).json({
      success: true,
      band: { crop, district: district || entries[0].district, low: prices[0], median, high: prices[prices.length - 1], sampleCount: prices.length }
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const reportPrice = async (req, res) => {
  try {
    const { crop, district, pricePerUnit, unit, grade } = req.body
    if (!crop || !district || pricePerUnit === undefined) {
      return res.status(400).json({ success: false, message: "crop, district and pricePerUnit are required" })
    }
    const entry = await MarketPriceModel.MarketPrice.create({ crop, district, pricePerUnit, unit: unit || "kg", grade: grade || null, source: "community", reportedBy: req.userId })
    return res.status(201).json({ success: true, entry })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const adminUpsertPrice = async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.role !== "admin") {
      const user = await User.findById(req.userId)
      if (!user || user.role !== "admin") return res.status(403).json({ success: false, message: "Admin only" })
    }
    const { crop, district, pricePerUnit, unit, grade } = req.body
    if (!crop || !district || pricePerUnit === undefined) {
      return res.status(400).json({ success: false, message: "crop, district and pricePerUnit are required" })
    }
    const entry = await MarketPriceModel.MarketPrice.create({ crop, district, pricePerUnit, unit: unit || "kg", grade: grade || null, source: "admin" })
    return res.status(201).json({ success: true, entry })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const subscribePriceAlert = async (req, res) => {
  try {
    const { crop, district, maxPricePerUnit, unit } = req.body
    if (!crop || !district || maxPricePerUnit === undefined) {
      return res.status(400).json({ success: false, message: "crop, district and maxPricePerUnit are required" })
    }
    const alert = await MarketPriceModel.PriceAlert.create({ userId: req.userId, crop, district, maxPricePerUnit, unit: unit || "kg" })
    return res.status(201).json({ success: true, alert })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const unsubscribePriceAlert = async (req, res) => {
  try {
    await MarketPriceModel.PriceAlert.updateOne({ _id: req.params.alertId, userId: req.userId }, { active: false })
    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// Called by confirmListing path (see vendorRoutes wiring note) after a listing goes live.
const checkPriceAlertsForListing = async (listing) => {
  try {
    if (!listing?.name || !listing?.pricePerUnit) return
    const farmer = await VendorProfile.findById(listing.vendorId)
    const district = farmer?.location?.district
    if (!district) return
    const alerts = await MarketPriceModel.PriceAlert.find({ active: true, crop: new RegExp(`^${listing.name}$`, "i"), district: new RegExp(`^${district}$`, "i") })
    for (const alert of alerts) {
      if (listing.pricePerUnit <= alert.maxPricePerUnit && String(alert.userId) !== String(farmer.userId)) {
        await notify(alert.userId, "priceAlert", `Price alert: ${listing.name} in ${district}`, `₹${listing.pricePerUnit}/${listing.unit} is within your ₹${alert.maxPricePerUnit} limit.`, `/vendor/${farmer._id}`)
      }
    }
  } catch (error) {
    console.error("PRICE ALERT CHECK ERROR:", error.message)
  }
}

// ------------------------------------------------------------------
// I. Notification bell
// ------------------------------------------------------------------
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId }).sort({ at: -1 }).limit(30)
    const unreadCount = await Notification.countDocuments({ userId: req.userId, read: false })
    return res.status(200).json({ success: true, notifications, unreadCount })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.userId, read: false }, { read: true })
    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// M5. Fraud signals (rule-based, admin-facing)
// ------------------------------------------------------------------
const getFraudSignals = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user || user.role !== "admin") return res.status(403).json({ success: false, message: "Admin only" })
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const rapidChurn = await VendorListing.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$vendorId", created: { $sum: 1 } } },
      { $match: { created: { $gte: 10 } } }
    ])
    const flagged = []
    for (const row of rapidChurn) {
      const profile = await VendorProfile.findById(row._id)
      const delivered = await VendorOrder.countDocuments({ vendor: row._id, status: "delivered" })
      const cancelled = await VendorOrder.countDocuments({ vendor: row._id, status: "cancelled" })
      if (delivered === 0 && cancelled >= 2) {
        flagged.push({ farmerId: row._id, name: profile?.displayName, listingChurn: row.created, delivered, cancelled, reason: "No completed orders with repeated cancellations" })
      }
    }
    return res.status(200).json({ success: true, flagged })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = {
  upsertFarmerProfile,
  saveBuyerProfile,
  getBuyerProfile,
  startThread,
  getMyThreads,
  getThread,
  postMessage,
  postOffer,
  respondOffer,
  convertOfferToOrder,
  getBuyerMatches,
  getBuyerPurchases,
  getFarmerOrders,
  getFarmerEarnings,
  rateBuyer,
  proposeCoopSplit,
  respondCoopShare,
  getPriceBand,
  reportPrice,
  adminUpsertPrice,
  subscribePriceAlert,
  unsubscribePriceAlert,
  checkPriceAlertsForListing,
  getNotifications,
  markNotificationsRead,
  getFraudSignals,
  notify
}

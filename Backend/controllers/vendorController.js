const bcrypt = require("bcrypt")
const dotenv = require("dotenv")
dotenv.config()
const cloudinary = require("cloudinary").v2
const { GoogleGenerativeAI } = require("@google/generative-ai")
const twilio = require("twilio")

const User = require("../models/user.Model.js")
const VendorProfile = require("../models/VendorProfile.js")
const VendorListing = require("../models/VendorListing.js")
const HelperProfile = require("../models/HelperProfile.js")
const VendorOrder = require("../models/VendorOrder.js")

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------
const PRODUCE_KEYWORDS = {
  vegetables: [
    "tomato", "potato", "onion", "carrot", "spinach", "beans",
    "ಟೊಮೆಟೊ", "ಆಲೂಗಡ್ಡೆ", "ಈರುಳ್ಳಿ",
    "தக்காளி", "உருளைக்கிழங்கு", "வெங்காயம்",
    "టొమాటో", "బంగాళాదుంప", "ఉల్లిపాయ",
    "टमाटर", "आलू", "प्याज"
  ],
  fruits: [
    "mango", "banana", "apple", "orange", "grapes", "papaya",
    "ಮಾವು", "ಬಾಳೆ", "ಸೇಬು",
    "மாம்பழம்", "வாழைப்பழம்", "ஆப்பிள்",
    "మామిడి", "అరటి", "ఆపిల్",
    "आम", "केला", "सेब"
  ]
}

const NUMBER_WORDS = {
  en: {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
    fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
    nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
    seventy: 70, eighty: 80, ninety: 90, hundred: 100
  },
  kn: {
    "ಒಂದು": 1, "ಎರಡು": 2, "ಮೂರು": 3, "ನಾಲ್ಕು": 4, "ಐದು": 5,
    "ಹತ್ತು": 10, "ಇಪ್ಪತ್ತು": 20, "ಮೂವತ್ತು": 30, "ನಲವತ್ತು": 40,
    "ಐವತ್ತು": 50, "ಅರವತ್ತು": 60, "ಎಪ್ಪತ್ತು": 70, "ಎಂಬತ್ತು": 80,
    "ತೊಂಬತ್ತು": 90, "ನೂರು": 100
  },
  ta: {
    "ஒன்று": 1, "இரண்டு": 2, "மூன்று": 3, "நான்கு": 4, "ஐந்து": 5,
    "பத்து": 10, "இருபது": 20, "முப்பது": 30, "நாற்பது": 40,
    "ஐம்பது": 50, "அறுபது": 60, "எழுபது": 70, "எண்பது": 80,
    "தொண்ணூறு": 90, "நூறு": 100
  },
  te: {
    "ఒకటి": 1, "రెండు": 2, "మూడు": 3, "నాలుగు": 4, "ఐదు": 5,
    "పది": 10, "ఇరవై": 20, "ముప్పై": 30, "నలభై": 40,
    "యాభై": 50, "అరవై": 60, "డెబ్బై": 70, "ఎనభై": 80,
    "తొంభై": 90, "వంద": 100
  },
  hi: {
    "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पाँच": 5,
    "दस": 10, "बीस": 20, "तीस": 30, "चालीस": 40,
    "पचास": 50, "साठ": 60, "सत्तर": 70, "अस्सी": 80,
    "नब्बे": 90, "सौ": 100
  }
}

const REPLIES = {
  kn: {
    closed: "Nimma angadi ivattu muccalaaitu.",
    open: "Nimma angadi ivattu tiret aagiide.",
    help: 'Commands: "open", "closed", "item price rupees", photo'
  },
  ta: {
    closed: "உங்கள் கடை இன்று மூடப்பட்டது.",
    open: "உங்கள் கடை இன்று திறந்துள்ளது.",
    help: 'Commands: "open", "closed", "பொருள் விலை ரூபாய்", photo'
  },
  te: {
    closed: "మీ దుకాణం నేడు మూసివేయబడింది.",
    open: "మీ దుకాణం నేడు తెరవబడింది.",
    help: 'Commands: "open", "closed", "వస్తువు ధర రూపాయలు", photo'
  },
  hi: {
    closed: "आपकी दुकान आज बंद हो गई।",
    open: "आपकी दुकान आज खुल गई।",
    help: 'Commands: "open", "closed", "item दाम rupees", photo'
  },
  en: {
    closed: "Your shop is closed for today.",
    open: "Your shop is open today.",
    help: 'Commands: "open", "closed", "item price rupees", photo'
  }
}

const NAME_TAGS = ["naam", "name", "hesaru", "peru", "paer", "peyar", "ಹೆಸರು", "பெயர்", "పేరు", "नाम"]
const LANDMARK_TAGS = ["near", "paas", "hatra", "pakka", "ಅರಿಗಿಲ್", "ದగ్గర", "ಹತ್ತಿರ", "பக்கா", "ಪಕ್ಕ", "नजदीक", "पास"]

const CLOSED_PATTERN = /beda|closed|illa|ಮೂಡು|మూసు|बंद/i
const OPEN_PATTERN = /ide|open|available|ತಿರು|తెరవు|खुला|tere/i
const PRICE_PATTERN = /([a-z\u0900-\u0FFF]+)\s*(\d+)\s*(?:rupees?|rs|₹|ರೂ|రూ|ரூ|रु)/i

const GEMINI_PROMPT = `This is a photo from an Indian street vendor or farmer.
Identify the produce and return ONLY valid JSON, no markdown, no explanation:
{
  "name": "English name of produce",
  "nameKn": "ಕನ್ನಡದಲ್ಲಿ ಹೆಸರು",
  "nameTa": "தமிழில் பெயர்",
  "nameTe": "తెలుగులో పేరు",
  "nameHi": "हिंदी में नाम",
  "category": "vegetables|fruits|grains|dairy|herbs|spices|flowers|other",
  "unit": "kg|g|dozen|bundle|piece|litre",
  "suggestedPrice": <typical Indian market price as number in INR per unit>,
  "freshnessNote": "one short sentence about freshness",
  "confidence": "high|medium|low"
}`

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
const uploadBufferToCloudinary = async (buffer, mimeType = "image/jpeg", folder = "grodel/vendor-listings") => {
  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`
  const result = await cloudinary.uploader.upload(dataUri, { folder })
  return result.secure_url
}

const getProduceMatch = (word) => {
  const lower = String(word || "").toLowerCase()
  for (const [category, keywords] of Object.entries(PRODUCE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return { name: word, category }
      }
    }
  }
  return null
}

const parseVoiceNumber = (transcript, language) => {
  const digitMatch = String(transcript || "").match(/\d+/)
  if (digitMatch) {
    return { price: Number(digitMatch[0]), confidence: "high" }
  }
  const langWords = NUMBER_WORDS[language] || NUMBER_WORDS.en
  let sum = 0
  const words = String(transcript || "").toLowerCase().split(/\s+/)
  for (const word of words) {
    if (langWords[word]) sum += langWords[word]
  }
  if (sum > 0) return { price: sum, confidence: "medium" }
  return { price: null, confidence: "low" }
}

const requireVendor = async (req) => {
  const user = await User.findById(req.userId)
  if (!user || user.role !== "vendor") return null
  return user
}

const ensureVendorProfile = async (vendor) => VendorProfile.findOneAndUpdate(
  { userId: vendor._id },
  {
    $setOnInsert: {
      displayName: vendor.fullName,
      phoneNumber: vendor.mobile,
      registeredVia: "web"
    }
  },
  { new: true, upsert: true }
)

const sendWhatsappMessage = async (toNumber, body) => {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to: `whatsapp:${toNumber}`,
    body
  })
}

const parseGeminiText = (rawText) => {
  const cleaned = String(rawText || "").replace(/```json|```/g, "").trim()
  try {
    return JSON.parse(cleaned)
  } catch (err) {
    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")
    return JSON.parse(cleaned.slice(start, end + 1))
  }
}

const analyseImageWithGemini = async (imageBuffer, mimeType = "image/jpeg") => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-flash-latest" })
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType
      }
    }
    const result = await model.generateContent([GEMINI_PROMPT, imagePart])
    return parseGeminiText(result.response.text())
  } catch (error) {
    const aiError = new Error("AI analysis is temporarily unavailable — you can enter details manually instead")
    aiError.code = "AI_ANALYSIS_UNAVAILABLE"
    throw aiError
  }
}

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const resetDailyCountersIfNewDay = (vendorProfile) => {
  const today = new Date().toDateString()
  if (vendorProfile.lastStatsResetDate !== today) {
    vendorProfile.todayOrders = 0
    vendorProfile.todayEarnings = 0
    vendorProfile.lastStatsResetDate = today
  }
}

// ------------------------------------------------------------------
// Registration
// ------------------------------------------------------------------
const registerViaVoice = async (req, res) => {
  try {
    const { transcript = "", phoneNumber = "", preferredLanguage = "kn" } = req.body
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: "phoneNumber is required" })
    }

    const words = String(transcript).split(/\s+/).filter(Boolean)
    let displayName = null
    for (let i = 0; i < words.length; i++) {
      if (NAME_TAGS.includes(words[i].toLowerCase()) && i + 1 < words.length) {
        displayName = words[i + 1]
        break
      }
    }
    let landmark = null
    for (let i = 0; i < words.length; i++) {
      if (LANDMARK_TAGS.includes(words[i].toLowerCase()) && i + 1 < words.length) {
        landmark = words[i + 1]
        break
      }
    }
    let produce = null
    let produceCategory = null
    for (const word of words) {
      const match = getProduceMatch(word)
      if (match) {
        produce = match.name
        produceCategory = match.category
        break
      }
    }

    const cleanPhone = String(phoneNumber).trim().replace(/\D/g, "")
    if (!displayName) displayName = cleanPhone || "Vendor"
    const vendorEmail = `${cleanPhone}@vendor.grodel.local`

    let user = await User.findOne({ $or: [{ mobile: phoneNumber.trim() }, { mobile: cleanPhone }] })
    if (!user) {
      const hashedPassword = await bcrypt.hash(phoneNumber.trim(), 10)
      user = await User.create({
        fullName: displayName,
        email: vendorEmail,
        mobile: cleanPhone,
        role: "vendor",
        password: hashedPassword
      })
    }

    let vendorProfile = await VendorProfile.findOne({ userId: user._id })
    if (!vendorProfile) {
      vendorProfile = await VendorProfile.create({
        userId: user._id,
        displayName,
        phoneNumber: cleanPhone,
        preferredLanguage,
        registeredVia: "voice",
        location: { landmark: landmark || "" }
      })
    } else {
      if (displayName) vendorProfile.displayName = displayName
      if (landmark) vendorProfile.location = { ...(vendorProfile.location || {}), landmark }
      vendorProfile.registeredVia = "voice"
      vendorProfile.preferredLanguage = preferredLanguage || vendorProfile.preferredLanguage
      await vendorProfile.save()
    }

    return res.status(200).json({
      success: true,
      vendorProfile,
      user: { _id: user._id, fullName: user.fullName, email: user.email, mobile: user.mobile, role: user.role },
      produce,
      produceCategory
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const registerViaHelper = async (req, res) => {
  try {
    const helper = await User.findById(req.userId)
    if (!helper || helper.role !== "helper") {
      return res.status(403).json({ success: false, message: "Only helpers can register vendors" })
    }

    const { vendorName, phoneNumber, landmark, district, state, preferredLanguage, preferredPayment, categories } = req.body
    if (!vendorName || !phoneNumber) {
      return res.status(400).json({ success: false, message: "vendorName and phoneNumber are required" })
    }

    const cleanPhone = String(phoneNumber).trim().replace(/\D/g, "")
    let user = await User.findOne({ $or: [{ mobile: phoneNumber.trim() }, { mobile: cleanPhone }] })
    if (!user) {
      const hashedPassword = await bcrypt.hash(cleanPhone, 10)
      user = await User.create({
        fullName: vendorName,
        email: `${cleanPhone}@vendor.grodel.local`,
        mobile: cleanPhone,
        role: "vendor",
        password: hashedPassword
      })
    }

    let vendorProfile = await VendorProfile.findOne({ userId: user._id })
    if (!vendorProfile) {
      vendorProfile = await VendorProfile.create({
        userId: user._id,
        displayName: vendorName,
        phoneNumber: cleanPhone,
        preferredLanguage: preferredLanguage || "kn",
        registeredVia: "helper",
        helperUserId: helper._id,
        location: { landmark: landmark || "", district: district || "", state: state || "" },
        preferredPayment: preferredPayment || "cash"
      })
    } else {
      vendorProfile.helperUserId = helper._id
      vendorProfile.registeredVia = "helper"
      if (preferredPayment) vendorProfile.preferredPayment = preferredPayment
      await vendorProfile.save()
    }

    await HelperProfile.findOneAndUpdate(
      { userId: helper._id },
      { $addToSet: { vendorsRegistered: vendorProfile._id } },
      { upsert: true }
    )

    if (Array.isArray(categories)) {
      for (const category of categories) {
        if (!VendorListing.schema.paths.category.enumValues.includes(category)) continue
        const existing = await VendorListing.findOne({ vendorId: vendorProfile._id, category })
        if (!existing) {
          await VendorListing.create({
            vendorId: vendorProfile._id,
            name: category,
            category,
            priceSetBy: "typed",
            addedVia: "manual",
            isAvailableToday: false
          })
        }
      }
    }

    return res.status(200).json({ success: true, vendorProfile })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const registerHelper = async (req, res) => {
  try {
    const { fullName, phoneNumber, district, state, organisation } = req.body
    if (!fullName || !phoneNumber) {
      return res.status(400).json({ success: false, message: "fullName and phoneNumber are required" })
    }

    const cleanPhone = String(phoneNumber).trim().replace(/\D/g, "")
    let user = await User.findOne({ $or: [{ mobile: phoneNumber.trim() }, { mobile: cleanPhone }] })
    if (!user) {
      const hashedPassword = await bcrypt.hash(cleanPhone, 10)
      user = await User.create({
        fullName,
        email: `${cleanPhone}@helper.grodel.local`,
        mobile: cleanPhone,
        role: "helper",
        password: hashedPassword
      })
    }

    let helperProfile = await HelperProfile.findOne({ userId: user._id })
    if (!helperProfile) {
      helperProfile = await HelperProfile.create({
        userId: user._id,
        fullName,
        phoneNumber: cleanPhone,
        district: district || "",
        state: state || "",
        organisation: organisation || ""
      })
    }

    return res.status(201).json({ success: true, helperProfile })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// AI Photo Analysis
// ------------------------------------------------------------------
const analyseProducePhoto = async (req, res) => {
  try {
    const vendor = await requireVendor(req)
    if (!vendor) {
      return res.status(403).json({ success: false, message: "Vendor role required" })
    }
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: "image file is required" })
    }

    const imageBuffer = req.file.buffer
    const mimeType = req.file.mimetype || "image/jpeg"
    const imageUrl = await uploadBufferToCloudinary(imageBuffer, mimeType, "grodel/vendor-listings")

    const aiSuggestion = await analyseImageWithGemini(imageBuffer, mimeType)

    return res.status(200).json({ success: true, aiSuggestion, imageUrl })
  } catch (error) {
    if (error.code === "AI_ANALYSIS_UNAVAILABLE") {
      return res.status(503).json({ success: false, code: error.code, message: error.message })
    }
    return res.status(500).json({ success: false, message: error.message })
  }
}

const uploadListingPhoto = async (req, res) => {
  try {
    const vendor = await requireVendor(req)
    if (!vendor) return res.status(403).json({ success: false, message: "Vendor role required" })
    if (!req.file || !req.file.buffer) return res.status(400).json({ success: false, message: "image file is required" })

    const imageUrl = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype || "image/jpeg", "grodel/vendor-listings")
    return res.status(200).json({ success: true, imageUrl })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const confirmListing = async (req, res) => {
  try {
    const vendor = await requireVendor(req)
    if (!vendor) {
      return res.status(403).json({ success: false, message: "Vendor role required" })
    }
    const vendorProfile = await VendorProfile.findOne({ userId: vendor._id })
    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: "Vendor profile not found" })
    }

    const {
      name, nameKn, nameTa, nameTe, nameHi,
      category, unit, availableQuantity,
      pricePerUnit, priceSetBy, aiSuggestedPrice,
      image, freshnessNote, addedVia, listingSource, isFreshToday,
      grade, gradeSource, harvestDate, minOrderQty, negotiable, certifications, bulkPricing
    } = req.body

    if (!name || !category || !unit || pricePerUnit === undefined || availableQuantity === undefined) {
      return res.status(400).json({ success: false, message: "name, category, unit, pricePerUnit and availableQuantity are required" })
    }

    const listing = await VendorListing.create({
      vendorId: vendorProfile._id,
      name,
      nameInLanguage: { kn: nameKn || "", ta: nameTa || "", te: nameTe || "", hi: nameHi || "" },
      category,
      unit,
      availableQuantity,
      pricePerUnit,
      priceSetBy: priceSetBy || "typed",
      aiSuggestedPrice,
      image,
      freshnessNote,
      addedVia: addedVia || "photo",
      listingSource: listingSource || "manual",
      isFreshToday: isFreshToday === undefined ? new Date().getHours() < 10 : Boolean(isFreshToday),
      grade: grade || null,
      gradeSource: gradeSource || null,
      harvestDate: harvestDate || null,
      minOrderQty: minOrderQty ?? null,
      negotiable: Boolean(negotiable),
      certifications: Array.isArray(certifications) ? certifications : [],
      bulkPricing: Array.isArray(bulkPricing) ? bulkPricing : []
    })

    if (new Date().getHours() < 10 && !vendorProfile.isFreshToday) {
      vendorProfile.isFreshToday = true
      await vendorProfile.save()
    }

    // Direct Market Access: match buyer price alerts against this new listing.
    try {
      const { checkPriceAlertsForListing } = require("./directMarket.controller.js")
      await checkPriceAlertsForListing(listing)
    } catch (alertError) {
      console.log("price alert hook error:", alertError.message)
    }

    return res.status(201).json({ success: true, listing })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// Voice Price Parsing
// ------------------------------------------------------------------
const parseVoicePrice = async (req, res) => {
  try {
    const { transcript = "", language = "kn" } = req.body
    const result = parseVoiceNumber(transcript, language)
    return res.status(200).json({ success: true, ...result })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------------
const toggleAvailability = async (req, res) => {
  try {
    const vendor = await requireVendor(req)
    if (!vendor) {
      return res.status(403).json({ success: false, message: "Vendor role required" })
    }
    const vendorProfile = await VendorProfile.findOne({ userId: vendor._id })
    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: "Vendor profile not found" })
    }

    vendorProfile.isActive = !vendorProfile.isActive
    if (vendorProfile.isActive) {
      vendorProfile.lastOpenedAt = Date.now()
      vendorProfile.isFreshToday = new Date().getHours() <= 7
    } else {
      vendorProfile.isFreshToday = false
    }
    await vendorProfile.save()

    return res.status(200).json({
      success: true,
      isActive: vendorProfile.isActive,
      isFreshToday: vendorProfile.isFreshToday
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const getMyDashboard = async (req, res) => {
  try {
    const vendor = await requireVendor(req)
    if (!vendor) {
      return res.status(403).json({ success: false, message: "Vendor role required" })
    }
    const vendorProfile = await ensureVendorProfile(vendor)
    resetDailyCountersIfNewDay(vendorProfile)

    const listings = await VendorListing.find({ vendorId: vendorProfile._id }).sort({ createdAt: -1 })

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [todayOrders, pendingCount, confirmedCount, readyCount] = await Promise.all([
      VendorOrder.countDocuments({ vendor: vendorProfile._id, createdAt: { $gte: startOfDay } }),
      VendorOrder.countDocuments({ vendor: vendorProfile._id, status: "pending" }),
      VendorOrder.countDocuments({ vendor: vendorProfile._id, status: { $in: ["confirmed", "ready"] } }),
      VendorOrder.countDocuments({ vendor: vendorProfile._id, status: "out of delivery" })
    ])

    vendorProfile.todayOrders = todayOrders
    await vendorProfile.save()

    return res.status(200).json({
      success: true,
      vendorProfile,
      listings,
      todayOrders,
      todayEarnings: vendorProfile.todayEarnings || 0,
      orderCounts: { pending: pendingCount, confirmed: confirmedCount, outForDelivery: readyCount }
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const updateListing = async (req, res) => {
  try {
    const vendor = await requireVendor(req)
    if (!vendor) {
      return res.status(403).json({ success: false, message: "Vendor role required" })
    }
    const vendorProfile = await VendorProfile.findOne({ userId: vendor._id })
    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: "Vendor profile not found" })
    }
    const listing = await VendorListing.findOne({ _id: req.params.listingId, vendorId: vendorProfile._id })
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" })
    }

    const { pricePerUnit, availableQuantity, isAvailableToday, priceSetBy, grade, harvestDate, minOrderQty, negotiable, certifications, bulkPricing } = req.body
    if (pricePerUnit !== undefined) {
      listing.pricePerUnit = pricePerUnit
      if (priceSetBy) listing.priceSetBy = priceSetBy
    }
    if (availableQuantity !== undefined) listing.availableQuantity = availableQuantity
    if (isAvailableToday !== undefined) listing.isAvailableToday = Boolean(isAvailableToday)
    if (grade !== undefined) listing.grade = grade || null
    if (harvestDate !== undefined) listing.harvestDate = harvestDate || null
    if (minOrderQty !== undefined) listing.minOrderQty = minOrderQty
    if (negotiable !== undefined) listing.negotiable = Boolean(negotiable)
    if (certifications !== undefined) listing.certifications = Array.isArray(certifications) ? certifications : []
    if (bulkPricing !== undefined) listing.bulkPricing = Array.isArray(bulkPricing) ? bulkPricing : []
    await listing.save()

    return res.status(200).json({ success: true, listing })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const deleteListing = async (req, res) => {
  try {
    const vendor = await requireVendor(req)
    if (!vendor) {
      return res.status(403).json({ success: false, message: "Vendor role required" })
    }
    const vendorProfile = await VendorProfile.findOne({ userId: vendor._id })
    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: "Vendor profile not found" })
    }
    const listing = await VendorListing.findOne({ _id: req.params.listingId, vendorId: vendorProfile._id })
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" })
    }

    listing.isAvailableToday = false
    await listing.save()

    return res.status(200).json({ success: true, message: "Listing deleted" })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// Customer Discovery
// ------------------------------------------------------------------
const getNearbyVendors = async (req, res) => {
  try {
    const { lat, lng, category } = req.query
    const radius = parseFloat(req.query.radius || 25)

    const vendors = await VendorProfile.find({ isActive: true })
    const result = []

    for (const vendor of vendors) {
      const vendorLat = vendor.location && vendor.location.lat
      const vendorLng = vendor.location && vendor.location.lng
      let distanceKm = null
      if (lat && lng && vendorLat && vendorLng) {
        distanceKm = haversine(parseFloat(lat), parseFloat(lng), vendorLat, vendorLng)
      }
      if (distanceKm !== null && distanceKm > radius) continue

      let listings = await VendorListing.find({ vendorId: vendor._id, isAvailableToday: true })
      if (category && category !== "all" && category !== "All") {
        listings = listings.filter(item => item.category === category)
        if (listings.length === 0) continue
      }

      const vendorObj = vendor.toObject()
      vendorObj.listings = listings
      vendorObj.distanceKm = distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null
      result.push(vendorObj)
    }

    result.sort((a, b) => {
      if (Boolean(a.isFreshToday) !== Boolean(b.isFreshToday)) return a.isFreshToday ? -1 : 1
      const ratingDiff = (b.rating && b.rating.average || 0) - (a.rating && a.rating.average || 0)
      if (ratingDiff !== 0) return ratingDiff
      const distanceA = a.distanceKm === null ? Infinity : a.distanceKm
      const distanceB = b.distanceKm === null ? Infinity : b.distanceKm
      return distanceA - distanceB
    })

    return res.status(200).json({ success: true, vendors: result })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const getVendorById = async (req, res) => {
  try {
    const vendorProfile = await VendorProfile.findById(req.params.vendorId)
    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: "Vendor not found" })
    }
    const listings = await VendorListing.find({ vendorId: vendorProfile._id, isAvailableToday: true }).sort({ createdAt: -1 })
    return res.status(200).json({ success: true, vendorProfile, listings })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const rateVendor = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user || user.role !== "user") {
      return res.status(403).json({ success: false, message: "Only customers can rate vendors" })
    }
    const vendorProfile = await VendorProfile.findById(req.params.vendorId)
    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: "Vendor not found" })
    }

    const rating = parseFloat(req.body.rating)
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" })
    }

    const previous = (vendorProfile.ratings || []).find(
      r => String(r.userId) === String(user._id)
    )

    let average = (vendorProfile.rating && vendorProfile.rating.average) || 0
    let count = (vendorProfile.rating && vendorProfile.rating.count) || 0

    if (previous) {
      const total = average * count - previous.rating + rating
      average = total / count
      previous.rating = rating
      previous.at = new Date()
    } else {
      const total = average * count + rating
      count += 1
      average = total / count
      vendorProfile.ratings.push({ userId: user._id, rating, at: new Date() })
    }

    vendorProfile.rating = { average: Math.round(average * 10) / 10, count }
    vendorProfile.markModified("ratings")
    await vendorProfile.save()

    return res.status(200).json({ success: true, vendorProfile })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const getWhatsappInfo = async (req, res) => {
  try {
    return res.status(200).json({ success: true, number: process.env.TWILIO_WHATSAPP_NUMBER })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const getVendorStats = async (req, res) => {
  try {
    const vendors = await VendorProfile.countDocuments({})
    const produce = await VendorListing.countDocuments({})
    const ordersAgg = await VendorProfile.aggregate([{ $group: { _id: null, total: { $sum: "$totalOrders" } } }])
    const orders = ordersAgg.length ? ordersAgg[0].total : 0
    return res.status(200).json({ success: true, stats: { vendors, produce, orders } })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// Vendor produce orders (customer checkout)
// ------------------------------------------------------------------
const placeVendorOrder = async (req, res) => {
  try {
    const customer = await User.findById(req.userId)
    if (!customer || customer.role !== "user") {
      return res.status(403).json({ success: false, message: "Only customers can order produce" })
    }

    const { vendorId, items, deliveryAddress, contactPhone, note, paymentMethod } = req.body

    const vendorProfile = await VendorProfile.findById(vendorId)
    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: "Vendor not found" })
    }
    if (!vendorProfile.isActive) {
      return res.status(400).json({ success: false, message: "This vendor is closed today" })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Add at least one item to your basket" })
    }
    if (!deliveryAddress || !deliveryAddress.text) {
      return res.status(400).json({ success: false, message: "Delivery address is required" })
    }

    // Re-fetch fresh listings server-side: never trust client prices
    const listingIds = items.map(i => i.listingId).filter(Boolean)
    const listings = await VendorListing.find({ _id: { $in: listingIds }, vendorId: vendorProfile._id, isAvailableToday: true })
    if (!listings.length) {
      return res.status(400).json({ success: false, message: "The selected produce is no longer available" })
    }

    const orderItems = []
    let total = 0
    for (const entry of items) {
      const listing = listings.find(l => String(l._id) === String(entry.listingId))
      if (!listing) continue
      const qty = Math.max(1, Math.min(Number(entry.quantity) || 1, Math.max(1, listing.availableQuantity || 1)))
      total += (listing.pricePerUnit || 0) * qty
      orderItems.push({
        listing: listing._id,
        name: listing.name,
        image: listing.image || "",
        pricePerUnit: listing.pricePerUnit || 0,
        quantity: qty,
        unit: listing.unit || "kg"
      })
    }

    if (!orderItems.length) {
      return res.status(400).json({ success: false, message: "The selected produce is no longer available" })
    }

    const order = await VendorOrder.create({
      customer: customer._id,
      vendor: vendorProfile._id,
      vendorUserId: vendorProfile.userId,
      items: orderItems,
      totalAmount: Math.round(total * 100) / 100,
      paymentMethod: paymentMethod === "online" ? "online" : "cod",
      deliveryAddress: {
        text: deliveryAddress.text,
        latitude: deliveryAddress.latitude || undefined,
        longitude: deliveryAddress.longitude || undefined
      },
      contactPhone: contactPhone || customer.mobile || "",
      note: note || "",
      status: "pending",
      statusHistory: [{ status: "pending" }]
    })

    // Notify the vendor in real time if they are online
    try {
      const vendorUser = await User.findById(vendorProfile.userId)
      const io = req.app.get("io")
      if (io && vendorUser && vendorUser.socketId) {
        io.to(vendorUser.socketId).emit("newVendorOrder", {
          orderId: order._id,
          vendorId: vendorProfile._id,
          customerName: customer.fullName,
          items: order.items,
          totalAmount: order.totalAmount,
          note: order.note,
          createdAt: order.createdAt
        })
      }
    } catch (notifyError) {
      console.log("vendor order notify error:", notifyError.message)
    }

    return res.status(201).json({ success: true, order })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const getMyVendorOrders = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user || user.role !== "user") {
      return res.status(403).json({ success: false, message: "Only customers can view produce orders" })
    }
    const orders = await VendorOrder.find({ customer: req.userId })
      .sort({ createdAt: -1 })
      .populate("vendor", "displayName profilePhoto rating location")
    return res.status(200).json({ success: true, orders })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const getVendorIncomingOrders = async (req, res) => {
  try {
    const vendor = await requireVendor(req)
    if (!vendor) {
      return res.status(403).json({ success: false, message: "Vendor role required" })
    }
    const vendorProfile = await VendorProfile.findOne({ userId: vendor._id })
    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: "Vendor profile not found" })
    }
    const orders = await VendorOrder.find({ vendor: vendorProfile._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("customer", "fullName mobile")
    return res.status(200).json({ success: true, orders })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const updateVendorOrderStatus = async (req, res) => {
  try {
    const vendor = await requireVendor(req)
    if (!vendor) {
      return res.status(403).json({ success: false, message: "Vendor role required" })
    }
    const vendorProfile = await VendorProfile.findOne({ userId: vendor._id })
    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: "Vendor profile not found" })
    }

    const order = await VendorOrder.findOne({ _id: req.params.orderId, vendor: vendorProfile._id })
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }

    const { status } = req.body
    const allowed = ["pending", "confirmed", "ready", "out of delivery", "delivered", "cancelled"]
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" })
    }
    if (["delivered", "cancelled"].includes(order.status)) {
      return res.status(400).json({ success: false, message: `Order is already ${order.status}` })
    }

    order.status = status
    order.statusHistory.push({ status })

    if (status === "delivered") {
      resetDailyCountersIfNewDay(vendorProfile)
      vendorProfile.todayOrders = (vendorProfile.todayOrders || 0) + 1
      vendorProfile.todayEarnings = Math.round(((vendorProfile.todayEarnings || 0) + (order.totalAmount || 0)) * 100) / 100
      vendorProfile.totalOrders = (vendorProfile.totalOrders || 0) + 1
      vendorProfile.totalEarnings = Math.round(((vendorProfile.totalEarnings || 0) + (order.totalAmount || 0)) * 100) / 100
      await vendorProfile.save()

      // decrement stock at delivery time
      for (const item of order.items) {
        if (!item.listing) continue
        const listing = await VendorListing.findById(item.listing)
        if (listing) {
          listing.availableQuantity = Math.max(0, (listing.availableQuantity || 0) - (item.quantity || 0))
          await listing.save()
        }
      }
    }

    await order.save()

    // Notify the customer in real time
    try {
      const customer = await User.findById(order.customer)
      const io = req.app.get("io")
      if (io && customer && customer.socketId) {
        io.to(customer.socketId).emit("vendorOrderStatus", {
          orderId: order._id,
          status: order.status
        })
      }
    } catch (notifyError) {
      console.log("vendor order status notify error:", notifyError.message)
    }

    return res.status(200).json({ success: true, order })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const cancelVendorOrderByCustomer = async (req, res) => {
  try {
    const order = await VendorOrder.findOne({ _id: req.params.orderId, customer: req.userId })
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }
    if (["delivered", "cancelled"].includes(order.status)) {
      return res.status(400).json({ success: false, message: `Order is already ${order.status}` })
    }

    order.status = "cancelled"
    order.statusHistory.push({ status: "cancelled" })
    await order.save()

    // Notify the vendor in real time
    try {
      const vendorUser = await User.findById(order.vendorUserId)
      const io = req.app.get("io")
      if (io && vendorUser && vendorUser.socketId) {
        io.to(vendorUser.socketId).emit("vendorOrderStatus", {
          orderId: order._id,
          status: "cancelled"
        })
      }
    } catch (notifyError) {
      console.log("vendor order cancel notify error:", notifyError.message)
    }

    return res.status(200).json({ success: true, order })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// WhatsApp Bot
// ------------------------------------------------------------------
const handleWhatsappPhoto = async (vendorProfile, mediaUrl, language) => {
  try {
    const response = await fetch(mediaUrl)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const imageUrl = await uploadBufferToCloudinary(buffer, "image/jpeg", "grodel/vendor-whatsapp")

    const suggestion = await analyseImageWithGemini(buffer, "image/jpeg")

    const listing = await VendorListing.create({
      vendorId: vendorProfile._id,
      name: suggestion.name || "Produce",
      nameInLanguage: {
        kn: suggestion.nameKn || "",
        ta: suggestion.nameTa || "",
        te: suggestion.nameTe || "",
        hi: suggestion.nameHi || ""
      },
      category: suggestion.category || "other",
      unit: suggestion.unit || "kg",
      pricePerUnit: suggestion.suggestedPrice || 0,
      aiSuggestedPrice: suggestion.suggestedPrice || 0,
      priceSetBy: "ai",
      addedVia: "whatsapp",
      aiGeneratedName: true,
      image: imageUrl,
      freshnessNote: suggestion.freshnessNote || ""
    })

    return `New listing added: ${listing.name} at ₹${listing.pricePerUnit}/${listing.unit}`
  } catch (error) {
    console.log("whatsapp photo error:", error.message)
    return (REPLIES[language] || REPLIES.en).help
  }
}

const handleWhatsappWebhook = async (req, res) => {
  try {
    if (!req.body.secret || req.body.secret !== process.env.WHATSAPP_WEBHOOK_SECRET) {
      return res.status(403).json({ success: false, message: "Invalid secret" })
    }

    const fromNumber = String(req.body.From || "").replace("whatsapp:", "")
    const messageText = String(req.body.Body || "").toLowerCase().trim()
    const mediaUrl = req.body.MediaUrl0 || null

    const vendorProfile = await VendorProfile.findOne({ phoneNumber: fromNumber })

    if (!vendorProfile) {
      const notFoundReply = "GroDel alli nondayisu. Nimma hesaru mattu location SMS madi."
      await sendWhatsappMessage(fromNumber, notFoundReply)
      return res.status(200).send()
    }

    const language = vendorProfile.preferredLanguage || "kn"
    let reply

    if (mediaUrl) {
      reply = await handleWhatsappPhoto(vendorProfile, mediaUrl, language)
    } else if (CLOSED_PATTERN.test(messageText)) {
      vendorProfile.isActive = false
      vendorProfile.isFreshToday = false
      await vendorProfile.save()
      reply = (REPLIES[language] || REPLIES.en).closed
    } else if (OPEN_PATTERN.test(messageText)) {
      vendorProfile.isActive = true
      vendorProfile.isFreshToday = new Date().getHours() <= 7
      await vendorProfile.save()
      reply = (REPLIES[language] || REPLIES.en).open
    } else {
      const priceMatch = PRICE_PATTERN.exec(messageText)
      if (priceMatch) {
        const produceWord = priceMatch[1].toLowerCase()
        const price = Number(priceMatch[2])
        const listings = await VendorListing.find({ vendorId: vendorProfile._id })
        let target = null
        for (const listing of listings) {
          const names = [
            listing.name,
            listing.nameInLanguage && listing.nameInLanguage.kn,
            listing.nameInLanguage && listing.nameInLanguage.ta,
            listing.nameInLanguage && listing.nameInLanguage.te,
            listing.nameInLanguage && listing.nameInLanguage.hi
          ].filter(Boolean)
          if (names.some(name => String(name).toLowerCase().includes(produceWord))) {
            target = listing
            break
          }
        }
        if (target) {
          target.pricePerUnit = price
          target.priceSetBy = "voice"
          await target.save()
          reply = `Price updated: ${target.name} = ₹${price}`
        } else {
          reply = (REPLIES[language] || REPLIES.en).help
        }
      } else {
        reply = (REPLIES[language] || REPLIES.en).help
      }
    }

    await sendWhatsappMessage(fromNumber, reply)
    return res.status(200).send()
  } catch (error) {
    console.log("whatsapp webhook error:", error.message)
    return res.status(200).send()
  }
}

module.exports = {
  registerViaVoice,
  registerViaHelper,
  registerHelper,
  analyseProducePhoto,
  uploadListingPhoto,
  confirmListing,
  parseVoicePrice,
  toggleAvailability,
  getMyDashboard,
  updateListing,
  deleteListing,
  getNearbyVendors,
  getVendorById,
  rateVendor,
  handleWhatsappWebhook,
  getWhatsappInfo,
  getVendorStats,
  placeVendorOrder,
  getMyVendorOrders,
  getVendorIncomingOrders,
  updateVendorOrderStatus,
  cancelVendorOrderByCustomer
}

const mongoose = require("mongoose");

const vendorProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
  displayName: String,
  phoneNumber: { type: String, required: true },
  preferredLanguage: { type: String, enum: ["en", "kn", "ta", "te", "hi"], default: "kn" },
  location: {
    address: String,
    landmark: String,
    district: String,
    state: String,
    lat: Number,
    lng: Number
  },
  profilePhoto: String,
  registeredVia: { type: String, enum: ["voice", "photo", "whatsapp", "helper", "web"], default: "web" },
  helperUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false },
  isFreshToday: { type: Boolean, default: false },
  lastOpenedAt: Date,
  preferredPayment: { type: String, enum: ["cash", "upi", "both"], default: "cash" },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  // ---- Farmer identity (Direct Market Access) ----
  farmer: {
    farmSizeAcres: { type: Number, default: null },
    village: String,
    taluk: String,
    cropsGrown: [String],
    yearsExperience: { type: Number, default: null },
    aadhaarStatus: { type: String, enum: ["unverified", "pending", "verified"], default: "unverified" },
    organic: { type: Boolean, default: false },
    fpoName: { type: String, default: "" },
    story: { type: String, default: "" },
    cropCalendar: [{ month: Number, note: String }]
  },
  reputation: {
    onTimeDispatchPct: { type: Number, default: null },
    qualityComplaints: { type: Number, default: 0 },
    avgResponseMins: { type: Number, default: null },
    repeatBuyers: { type: Number, default: 0 }
  },
  ratings: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rating: { type: Number, min: 1, max: 5 },
    at: { type: Date, default: Date.now }
  }],
  lastStatsResetDate: String,
  totalOrders: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  todayOrders: { type: Number, default: 0 },
  todayEarnings: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.VendorProfile || mongoose.model("VendorProfile", vendorProfileSchema);

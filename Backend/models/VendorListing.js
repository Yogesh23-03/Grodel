const mongoose = require("mongoose");

const vendorListingSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "VendorProfile", required: true },
  name: String,
  nameInLanguage: {
    kn: String,
    ta: String,
    te: String,
    hi: String
  },
  category: { type: String, enum: ["vegetables", "fruits", "grains", "dairy", "herbs", "spices", "flowers", "other"] },
  image: String,
  pricePerUnit: Number,
  priceSetBy: { type: String, enum: ["ai", "typed", "voice"], default: "ai" },
  aiSuggestedPrice: Number,
  unit: { type: String, enum: ["kg", "g", "dozen", "bundle", "piece", "litre"] },
  availableQuantity: Number,
  isAvailableToday: { type: Boolean, default: true },
  isFreshToday: { type: Boolean, default: false },
  addedVia: { type: String, enum: ["photo", "voice", "manual"], default: "photo" },
  listingSource: { type: String, enum: ["ai", "manual"], default: "manual" },
  aiGeneratedName: { type: Boolean, default: false },
  freshnessNote: String,
  // ---- Direct Market Access fields ----
  grade: { type: String, enum: ["A", "B", "C", null], default: null },
  gradeSource: { type: String, enum: ["ai", "manual", null], default: null },
  gradeConfidence: { type: String, default: "" },
  harvestDate: Date,
  shelfLifeDays: Number,
  minOrderQty: Number,
  negotiable: { type: Boolean, default: false },
  bulkPricing: [{ minQty: Number, pricePerUnit: Number }],
  photos: [String],
  certifications: [{ type: String, enum: ["organic", "gi-tag", "fssai", "natural-farming"] }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.VendorListing || mongoose.model("VendorListing", vendorListingSchema);

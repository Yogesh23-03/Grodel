const mongoose = require("mongoose");

const helperProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  fullName: String,
  phoneNumber: String,
  district: String,
  state: String,
  organisation: String,
  vendorsRegistered: [{ type: mongoose.Schema.Types.ObjectId, ref: "VendorProfile" }],
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.HelperProfile || mongoose.model("HelperProfile", helperProfileSchema);

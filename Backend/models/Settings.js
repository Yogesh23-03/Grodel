const mongoose = require("mongoose");

/*
 * Settings — a tiny key/value store for platform-level configuration that an
 * admin can change at runtime (currently: maxAdmins). Values that are
 * environment-level (JWT_SECRET, DB URL) stay in .env; only operator-tunable
 * knobs live here so they survive a redeploy without editing env vars.
 */
const settingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: { type: mongoose.Schema.Types.Mixed },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updatedAt: { type: Date, default: Date.now }
});

const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);
module.exports = Settings;

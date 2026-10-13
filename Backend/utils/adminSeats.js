const User = require("../models/user.Model");
const Settings = require("../models/Settings");

/*
 * Admin seats — one place that answers "how many admins are allowed and how
 * many exist". Used by signup (to reject the overflow), by the landing page and
 * signup page (through the public endpoint) and by the admin dashboard.
 *
 * Resolution order: the admin-editable Settings value (1–5) wins, otherwise the
 * MAX_ADMINS env var, otherwise 5.
 */
const HARD_CAP = 5;
const DEFAULT_MAX = 5;

const envMax = () => {
  const parsed = Number(process.env.MAX_ADMINS);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : DEFAULT_MAX;
};

const getMaxAdmins = async () => {
  try {
    const doc = await Settings.findOne({ key: "maxAdmins" });
    const stored = Number(doc?.value);
    if (Number.isFinite(stored) && stored >= 1 && stored <= HARD_CAP) return stored;
  } catch (error) {
    // Settings is optional configuration — never let it break a read path.
    console.error("ADMIN SEATS:", error.message);
  }
  return envMax();
};

const getAdminSlotInfo = async () => {
  const [max, current] = await Promise.all([
    getMaxAdmins(),
    User.countDocuments({ role: "admin" })
  ]);
  return { current, max, full: current >= max };
};

module.exports = { getMaxAdmins, getAdminSlotInfo, HARD_CAP };

const express = require("express");
const isAuth = require("../middlewares/isAuth.js");
const requireRole = require("../middlewares/requireRole.js");
const { getAdminSlotInfo } = require("../utils/adminSeats");
const {
    getPlatformStats,
    getPlatformActivity,
    getAllUsers,
    updateUserRole,
    banUser,
    unbanUser,
    getAllOrders,
    getAllDonations,
    getAllShops,
    getAllVendors,
    verifyVendor,
    suspendVendor,
    getAdminList,
    manageAdminSlots,
    getFraudSignals,
    getSettings,
    updateSettings
} = require("../controllers/adminController.js");

const router = express.Router();

/* Second gate for the irreversible powers: changing a role, banning someone and
   moving the admin-seat limit all belong to the founding admin only. isAuth has
   already loaded req.user, so this costs no extra query. */
const requireFirstAdmin = (req, res, next) => {
    if (!req.user?.isFirstAdmin) {
        return res.status(403).json({ message: "Only the founding admin can do this" });
    }
    next();
};

/*
 * Public — deliberately registered BEFORE the auth gate. The landing page and the
 * signup screen need to know whether an Admin option should be offered *before*
 * anyone has an account, and it exposes nothing but two counts.
 */
router.get("/slots-public", async (req, res) => {
    try {
        const slots = await getAdminSlotInfo();
        return res.status(200).json(slots);
    } catch (error) {
        console.error("ADMIN SLOTS PUBLIC ERROR:", error.message);
        return res.status(500).json({ message: "Could not read admin seats" });
    }
});

/* ---- everything below is admin-only ---- */
router.use(isAuth, requireRole("admin"));

router.get("/stats", getPlatformStats);
router.get("/activity", getPlatformActivity);

router.get("/users", getAllUsers);
router.patch("/users/:userId/role", requireFirstAdmin, updateUserRole);
router.patch("/users/:userId/ban", requireFirstAdmin, banUser);
router.patch("/users/:userId/unban", requireFirstAdmin, unbanUser);

router.get("/orders", getAllOrders);
router.get("/donations", getAllDonations);
router.get("/shops", getAllShops);

router.get("/vendors", getAllVendors);
router.patch("/vendors/:vendorId/verify", verifyVendor);
router.patch("/vendors/:vendorId/suspend", suspendVendor);

router.get("/admins", getAdminList);
router.patch("/slots", requireFirstAdmin, manageAdminSlots);

router.get("/fraud", getFraudSignals);

router.get("/settings", requireFirstAdmin, getSettings);
router.patch("/settings", requireFirstAdmin, updateSettings);

module.exports = router;

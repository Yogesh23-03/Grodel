const express = require("express");
const multer = require("multer");
const isAuth = require("../middlewares/isAuth.js");
const {
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
} = require("../controllers/vendorController.js");

const router = express.Router();

// Memory storage for image uploads (no disk writes needed for AI analysis)
const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// --- Registration ---
router.post("/register/voice", registerViaVoice);
router.post("/register/helper", isAuth, registerViaHelper);
router.post("/register-helper", registerHelper);

// --- Portal info (static routes MUST come before /:vendorId) ---
router.get("/whatsapp-info", getWhatsappInfo);
router.get("/stats", getVendorStats);

// --- Customer produce orders (static before dynamic) ---
router.post("/orders", isAuth, placeVendorOrder);
router.get("/orders/mine", isAuth, getMyVendorOrders);
router.get("/orders/incoming", isAuth, getVendorIncomingOrders);
router.patch("/orders/:orderId/status", isAuth, updateVendorOrderStatus);
router.post("/orders/:orderId/cancel", isAuth, cancelVendorOrderByCustomer);

// --- AI photo analysis & listing ---
router.post("/analyse-photo", isAuth, memoryUpload.single("image"), analyseProducePhoto);
router.post("/upload-photo", isAuth, memoryUpload.single("image"), uploadListingPhoto);
router.post("/confirm-listing", isAuth, confirmListing);

// --- Voice price parsing ---
router.post("/parse-voice-price", parseVoicePrice);

// --- Vendor dashboard ---
router.patch("/toggle", isAuth, toggleAvailability);
router.get("/dashboard", isAuth, getMyDashboard);
router.put("/listing/:listingId", isAuth, updateListing);
router.delete("/listing/:listingId", isAuth, deleteListing);

// --- Customer discovery ---
router.get("/nearby", getNearbyVendors);
router.get("/:vendorId", getVendorById);
router.post("/:vendorId/rate", isAuth, rateVendor);

// --- WhatsApp webhook (Twilio) ---
router.post("/whatsapp-webhook", handleWhatsappWebhook);

module.exports = router;

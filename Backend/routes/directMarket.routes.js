const express = require("express");
const isAuth = require("../middlewares/isAuth.js");
const {
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
  getNotifications,
  markNotificationsRead,
  getFraudSignals
} = require("../controllers/directMarket.controller.js");

const router = express.Router();

// --- Farmer identity ---
router.put("/farmer/profile", isAuth, upsertFarmerProfile);

// --- Buyer identity ---
router.get("/buyer/profile", isAuth, getBuyerProfile);
router.put("/buyer/profile", isAuth, saveBuyerProfile);
router.get("/buyer/matches", isAuth, getBuyerMatches);
router.get("/buyer/purchases", isAuth, getBuyerPurchases);

// --- Threads & negotiation (farmer + buyer) ---
router.post("/threads", isAuth, startThread);
router.get("/threads", isAuth, getMyThreads);
router.get("/threads/:threadId", isAuth, getThread);
router.post("/threads/:threadId/messages", isAuth, postMessage);
router.post("/threads/:threadId/offers", isAuth, postOffer);
router.patch("/threads/:threadId/offers/respond", isAuth, respondOffer);
router.post("/threads/:threadId/convert", isAuth, convertOfferToOrder);

// --- Farmer order queue / earnings ---
router.get("/farmer/orders", isAuth, getFarmerOrders);
router.get("/farmer/earnings", isAuth, getFarmerEarnings);
router.post("/orders/:orderId/rate-buyer", isAuth, rateBuyer);

// --- Cooperative bulk orders ---
router.post("/coop/propose", isAuth, proposeCoopSplit);
router.patch("/coop/:coopId/shares/:shareIndex/respond", isAuth, respondCoopShare);

// --- Market prices & alerts ---
router.get("/prices/band", getPriceBand);
router.post("/prices/report", isAuth, reportPrice);
router.post("/prices/admin", isAuth, adminUpsertPrice);
router.post("/prices/alerts", isAuth, subscribePriceAlert);
router.patch("/prices/alerts/:alertId", isAuth, unsubscribePriceAlert);

// --- Notifications ---
router.get("/notifications", isAuth, getNotifications);
router.patch("/notifications/read", isAuth, markNotificationsRead);

// --- Admin fraud signals ---
router.get("/admin/fraud-signals", isAuth, getFraudSignals);

module.exports = router;

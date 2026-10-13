const express = require("express")
const isAuth = require("../middlewares/isAuth.js")
const requireRole = require("../middlewares/requireRole.js")
const {
    getOwnerAnalysis,
    getVendorAnalysis,
    getDeliveryAnalysis
} = require("../controllers/businessAnalysisController.js")

const businessAnalysisRouter = express.Router()

/* Each role gets its own endpoint and its own role guard — an owner can never
   pull a delivery partner's numbers, and vice versa. */
businessAnalysisRouter.get("/owner", isAuth, requireRole("owner"), getOwnerAnalysis)
businessAnalysisRouter.get("/vendor", isAuth, requireRole("vendor"), getVendorAnalysis)
businessAnalysisRouter.get("/delivery", isAuth, requireRole("deliveryBoy"), getDeliveryAnalysis)

module.exports = businessAnalysisRouter

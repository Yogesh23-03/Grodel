const express = require("express")
const isAuth = require("../middlewares/isAuth.js")
const requireRole = require("../middlewares/requireRole.js")
const {
    placeBulkOrder,
    getMyBulkOrders,
    updateBulkOrderStatus
} = require("../controllers/bulkOrderController.js")

const bulkOrderRouter = express.Router()

/* Any signed-in role can request a bulk order (offices, canteens, events). */
bulkOrderRouter.post("/", isAuth, placeBulkOrder)
bulkOrderRouter.get("/my", isAuth, getMyBulkOrders)

/* Only the receiving shop's owner can action a request. */
bulkOrderRouter.patch("/:bulkOrderId", isAuth, requireRole("owner"), updateBulkOrderStatus)

module.exports = bulkOrderRouter

const BulkOrder = require("../models/BulkOrder.js")
const Shop = require("../models/shop.Model.js")
const Item = require("../models/item.Model.js")
const User = require("../models/user.Model.js")
const { sendNotificationMail } = require("../utils/mail")
const { clean, cleanNumber, isValidObjectId } = require("../utils/sanitize")

/* Minimum a bulk request must reach before an owner will consider it. */
const MINIMUM_ORDER = Number(process.env.BULK_ORDER_MINIMUM) || 500

const STATUSES = ["pending", "accepted", "rejected", "preparing", "delivered"]

const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const placeBulkOrder = async (req, res) => {
    try {
        const shopId = clean(req.body?.shopId, 40)
        if (!isValidObjectId(shopId)) {
            return res.status(400).json({ message: "A valid shopId is required" })
        }

        const shop = await Shop.findById(shopId).populate("owner", "fullName email")
        if (!shop) {
            return res.status(404).json({ message: "shop not found" })
        }

        const submitted = Array.isArray(req.body?.items) ? req.body.items : []
        const wanted = submitted
            .filter(line => isValidObjectId(line?.itemId) && cleanNumber(line?.quantity) > 0)

        if (wanted.length === 0) {
            return res.status(400).json({ message: "Add at least one item with a quantity above zero" })
        }

        /* Re-price every line from the database. The client also sends a price,
           but taking money values from the request body would let anyone place a
           ₹10,000 request for ₹1 — and would ignore the owner's live discounts,
           since Item.price already holds the discounted amount. */
        const catalogue = await Item.find({
            _id: { $in: wanted.map(line => line.itemId) },
            shop: shop._id
        }).select("name price")

        const byId = new Map(catalogue.map(item => [String(item._id), item]))

        const items = wanted
            .map(line => {
                const item = byId.get(String(line.itemId))
                if (!item) return null
                const quantity = cleanNumber(line.quantity, { min: 1, fallback: 1 })
                const unit = clean(line.unit, 30) || "pieces"
                return {
                    itemId: item._id,
                    name: item.name,
                    price: item.price,
                    quantity,
                    unit,
                    totalPrice: Math.round(item.price * quantity * 100) / 100
                }
            })
            .filter(Boolean)

        if (items.length === 0) {
            return res.status(400).json({ message: "None of those items are on this shop's menu" })
        }

        const totalAmount = Math.round(items.reduce((sum, line) => sum + line.totalPrice, 0) * 100) / 100
        const deliveryDate = req.body?.deliveryDate ? new Date(req.body.deliveryDate) : null
        const isForEvent = Boolean(req.body?.isForEvent)

        const bulkOrder = await BulkOrder.create({
            placedBy: req.userId,
            shopId: shop._id,
            shopName: shop.name,
            items,
            totalAmount,
            deliveryAddress: clean(req.body?.deliveryAddress, 500),
            deliveryDate: deliveryDate && !Number.isNaN(deliveryDate.getTime()) ? deliveryDate : null,
            note: clean(req.body?.note, 500),
            status: "pending",
            paymentMethod: req.body?.paymentMethod === "online" ? "online" : "cash",
            isForEvent,
            eventName: isForEvent ? clean(req.body?.eventName, 160) : "",
            minimumOrderMet: totalAmount >= MINIMUM_ORDER
        })

        /* Notify the owner. Best-effort: the request is already saved, so a mail
           outage must not roll it back or fail the customer's submission. */
        const ownerEmail = shop.owner?.email
        if (ownerEmail) {
            const rows = items
                .map(line => `<li>${escapeHtml(line.name)} — ${line.quantity} ${escapeHtml(line.unit)} × ₹${line.price} = ₹${line.totalPrice}</li>`)
                .join("")

            try {
                await sendNotificationMail(
                    ownerEmail,
                    `New Bulk Order Request — ₹${totalAmount}`,
                    `<p>Hello ${escapeHtml(shop.owner?.fullName || shop.name)},</p>
                     <p>A new bulk order request has arrived on GroDel.</p>
                     <p><b>Items:</b></p><ul>${rows}</ul>
                     <p><b>Total:</b> ₹${totalAmount}</p>
                     <p><b>Delivery date:</b> ${bulkOrder.deliveryDate ? escapeHtml(bulkOrder.deliveryDate.toDateString()) : "not specified"}</p>
                     <p><b>Delivery address:</b> ${escapeHtml(bulkOrder.deliveryAddress) || "not specified"}</p>
                     ${isForEvent ? `<p><b>Event:</b> ${escapeHtml(bulkOrder.eventName) || "yes"}</p>` : ""}
                     ${bulkOrder.note ? `<p><b>Note from customer:</b> ${escapeHtml(bulkOrder.note)}</p>` : ""}
                     <p>Open your GroDel dashboard to accept or reject it.</p>`
                )
            } catch (mailError) {
                console.error("BULK ORDER MAIL ERROR:", mailError.message)
            }
        }

        return res.status(201).json({ success: true, bulkOrder })
    } catch (error) {
        console.error("PLACE BULK ORDER ERROR:", error.message)
        return res.status(500).json({ message: "Could not place the bulk order" })
    }
}

const getMyBulkOrders = async (req, res) => {
    try {
        /* isAuth only puts userId on the request, so the role is read here. */
        const user = await User.findById(req.userId).select("role").lean()
        let query

        if (user?.role === "owner") {
            /* Owners see everything addressed to any shop they run. */
            const shops = await Shop.find({ owner: req.userId }).select("_id")
            query = { shopId: { $in: shops.map(shop => shop._id) } }
        } else {
            query = { placedBy: req.userId }
        }

        const bulkOrders = await BulkOrder.find(query)
            .sort({ createdAt: -1 })
            .populate("placedBy", "fullName email mobile")
            .lean()

        return res.status(200).json({ bulkOrders })
    } catch (error) {
        console.error("GET MY BULK ORDERS ERROR:", error.message)
        return res.status(500).json({ message: "Could not load your bulk orders" })
    }
}

const updateBulkOrderStatus = async (req, res) => {
    try {
        const { status, ownerNote } = req.body || {}
        if (!STATUSES.includes(status)) {
            return res.status(400).json({ message: `status must be one of: ${STATUSES.join(", ")}` })
        }

        const bulkOrder = await BulkOrder.findById(req.params.bulkOrderId)
        if (!bulkOrder) {
            return res.status(404).json({ message: "bulk order not found" })
        }

        /* An owner may only touch requests addressed to a shop they own. */
        const shop = await Shop.findOne({ _id: bulkOrder.shopId, owner: req.userId }).select("_id")
        if (!shop) {
            return res.status(403).json({ message: "this bulk order is not for your shop" })
        }

        bulkOrder.status = status
        if (ownerNote !== undefined) {
            bulkOrder.ownerNote = clean(ownerNote, 500)
        }
        await bulkOrder.save()

        return res.status(200).json({ success: true, bulkOrder })
    } catch (error) {
        console.error("UPDATE BULK ORDER ERROR:", error.message)
        return res.status(500).json({ message: "Could not update the bulk order" })
    }
}

module.exports = { placeBulkOrder, getMyBulkOrders, updateBulkOrderStatus }

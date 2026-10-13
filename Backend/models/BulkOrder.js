const mongoose = require("mongoose")

/*
 * A bulk order is a catering-style request: a customer picks quantities off an
 * existing shop menu, and the owner accepts or rejects it. It is deliberately
 * separate from Order — a bulk order has no cart, no delivery assignment and no
 * payment capture until the owner accepts.
 */

const bulkOrderItemSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item"
    },
    name: String,
    price: Number,
    quantity: Number,
    unit: String,
    totalPrice: Number
}, { _id: false })

const bulkOrderSchema = new mongoose.Schema({
    placedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
        required: true,
        index: true
    },
    shopName: String,
    items: [bulkOrderItemSchema],
    totalAmount: Number,
    deliveryAddress: String,
    deliveryDate: Date,
    note: String,
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected", "preparing", "delivered"],
        default: "pending"
    },
    paymentMethod: {
        type: String,
        enum: ["cash", "online"],
        default: "cash"
    },
    isForEvent: Boolean,
    eventName: String,
    minimumOrderMet: Boolean,
    ownerNote: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true })

const BulkOrder = mongoose.models.BulkOrder || mongoose.model("BulkOrder", bulkOrderSchema)
module.exports = BulkOrder

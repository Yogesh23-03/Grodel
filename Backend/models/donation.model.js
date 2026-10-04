const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
    {
        donorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        donorRole: {
            type: String,
            enum: ["customer", "owner", "deliveryBoy", "supplier"],
            required: true
        },
        foodItems: [{
            name: {
                type: String,
                required: true,
                trim: true
            },
            quantity: {
                type: String,
                required: true,
                trim: true
            },
            unit: {
                type: String,
                required: true,
                trim: true
            }
        }],
        foodDescription: {
            type: String,
            trim: true
        },
        pickupAddress: {
            type: String,
            required: true,
            trim: true
        },
        pickupLocation: {
            lat: Number,
            lng: Number
        },
        pickupTime: {
            type: Date,
            required: true
        },
        expiryTime: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "picked_up", "delivered", "cancelled"],
            default: "pending"
        },
        assignedTrustId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Trust",
            default: null
        },
        assignedDeliveryBoyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        deliveryCharge: {
            type: Number,
            default: 50
        },
        deliveryChargePaymentMethod: {
            type: String,
            enum: ["pending", "online", "offline"],
            default: "pending"
        },
        deliveryChargePaymentStatus: {
            type: String,
            enum: ["pending", "paid"],
            default: "pending"
        },
        deliveryAssignmentMethod: {
            type: String,
            enum: ["none", "deliveryBoyAccepted", "trustAssigned"],
            default: "none"
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

const Donation = mongoose.models.Donation || mongoose.model("Donation", donationSchema);
module.exports = Donation;

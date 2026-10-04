const mongoose = require("mongoose");

const trustSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        address: {
            type: String,
            required: true,
            trim: true
        },
        location: {
            lat: {
                type: Number,
                required: true
            },
            lng: {
                type: Number,
                required: true
            }
        },
        contactNumber: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        registrationNumber: {
            type: String,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        capacityPerDay: {
            type: String,
            trim: true
        },
        googlePayNumber: {
            type: String,
            trim: true
        },
        bankDetails: {
            type: String,
            trim: true
        },
        photo: {
            type: String,
            trim: true
        },
        acceptedFoodTypes: [{
            type: String,
            trim: true
        }],
        isVerified: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

const Trust = mongoose.models.Trust || mongoose.model("Trust", trustSchema);
module.exports = Trust;

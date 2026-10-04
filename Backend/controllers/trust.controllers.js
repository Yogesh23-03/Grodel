const Trust = require("../models/trust.model.js");
const { uploadOnCloudinary } = require("../utils/cloudinary.js");

// Create a new trust
const createTrust = async (req, res) => {
    try {
        const { name, address, lat, lng, contactNumber, email, acceptedFoodTypes, registrationNumber, description, capacityPerDay, googlePayNumber, bankDetails } = req.body;
        const userId = req.user?.id;

        let photo = null;
        if (req.file) {
            photo = await uploadOnCloudinary(req.file.path);
        }

        const acceptedFoodArray = acceptedFoodTypes 
            ? acceptedFoodTypes.split(",").map(type => type.trim())
            : [];

        const trust = new Trust({
            name,
            address,
            location: {
                lat: parseFloat(lat),
                lng: parseFloat(lng)
            },
            contactNumber,
            email,
            acceptedFoodTypes: acceptedFoodArray,
            registrationNumber,
            description,
            capacityPerDay,
            googlePayNumber,
            bankDetails,
            photo: photo || null,
            owner: userId || null
        });

        await trust.save();

        res.status(201).json({
            success: true,
            message: "Trust created successfully",
            data: trust
        });
    } catch (error) {
        console.error("Create trust error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create trust"
        });
    }
};

// Get all trusts
const getAllTrusts = async (req, res) => {
    try {
        const trusts = await Trust.find().populate("owner", "name email contactNumber");
        res.status(200).json({
            success: true,
            data: trusts
        });
    } catch (error) {
        console.error("Get trusts error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch trusts"
        });
    }
};

// Get trust by ID
const getTrustById = async (req, res) => {
    try {
        const { id } = req.params;
        const trust = await Trust.findById(id).populate("owner", "name email contactNumber");

        if (!trust) {
            return res.status(404).json({
                success: false,
                message: "Trust not found"
            });
        }

        res.status(200).json({
            success: true,
            data: trust
        });
    } catch (error) {
        console.error("Get trust by ID error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch trust"
        });
    }
};

// Update trust
const updateTrust = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, lat, lng, contactNumber, email, acceptedFoodTypes, registrationNumber, description, capacityPerDay, googlePayNumber, bankDetails } = req.body;

        const updateFields = {
            name,
            address,
            contactNumber,
            email,
            registrationNumber,
            description,
            capacityPerDay,
            googlePayNumber,
            bankDetails
        };

        if (lat && lng) {
            updateFields.location = {
                lat: parseFloat(lat),
                lng: parseFloat(lng)
            };
        }

        if (acceptedFoodTypes) {
            updateFields.acceptedFoodTypes = acceptedFoodTypes.split(",").map(type => type.trim());
        }

        if (req.file) {
            const photoUrl = await uploadOnCloudinary(req.file.path);
            updateFields.photo = photoUrl || null;
        }

        const trust = await Trust.findByIdAndUpdate(id, updateFields, { new: true }).populate("owner", "name email contactNumber");

        if (!trust) {
            return res.status(404).json({
                success: false,
                message: "Trust not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Trust updated successfully",
            data: trust
        });
    } catch (error) {
        console.error("Update trust error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update trust"
        });
    }
};

// Delete trust
const deleteTrust = async (req, res) => {
    try {
        const { id } = req.params;
        const trust = await Trust.findByIdAndDelete(id);

        if (!trust) {
            return res.status(404).json({
                success: false,
                message: "Trust not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Trust deleted successfully"
        });
    } catch (error) {
        console.error("Delete trust error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete trust"
        });
    }
};

// Get trusts by city/location
const getTrustsByLocation = async (req, res) => {
    try {
        const { lat, lng, radius = 50 } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: "Latitude and longitude are required"
            });
        }

        const trusts = await Trust.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: radius * 1000
                }
            }
        }).populate("owner", "name email contactNumber");

        res.status(200).json({
            success: true,
            data: trusts
        });
    } catch (error) {
        console.error("Get trusts by location error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch trusts"
        });
    }
};

module.exports = {
    createTrust,
    getAllTrusts,
    getTrustById,
    updateTrust,
    deleteTrust,
    getTrustsByLocation
};

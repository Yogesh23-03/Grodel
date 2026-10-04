const Donation = require("../models/donation.model.js");
const Trust = require("../models/trust.model.js");
const User = require("../models/user.Model.js");
const { sendDonationTrustMail } = require("../utils/mail.js");
const { uploadOnCloudinary } = require("../utils/cloudinary.js");

const allowedDonationStatuses = ["pending", "accepted", "picked_up", "delivered", "cancelled"];

const roleToDonorRole = (role) => {
    if (role === "user") return "customer";
    if (["owner", "deliveryBoy", "supplier"].includes(role)) return role;
    return null;
};

const isAdminUser = (user) => user?.role === "admin";
const isTrustManager = (user) => user?.role === "trustMember" || user?.role === "admin";

const toNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const haversineDistance = (pointA, pointB) => {
    const earthRadiusKm = 6371;
    const dLat = ((pointB.lat - pointA.lat) * Math.PI) / 180;
    const dLng = ((pointB.lng - pointA.lng) * Math.PI) / 180;
    const lat1 = (pointA.lat * Math.PI) / 180;
    const lat2 = (pointB.lat * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const populateDonation = (query) => query
    .populate("donorId", "fullName email mobile role")
    .populate("assignedTrustId")
    .populate("assignedDeliveryBoyId", "fullName email mobile role");

const getManagedTrust = async (user) => {
    if (user?.role === "admin") return null;
    return Trust.findOne({ owner: user?._id });
};

const canManageDonation = async (user, donation) => {
    if (user?.role === "admin") return true;
    if (user?.role !== "trustMember") return false;
    const trust = await getManagedTrust(user);
    return String(trust?._id || "") === String(donation.assignedTrustId || "");
};

const notifyDeliveryBoys = async (req, donation) => {
    const io = req.app.get("io");
    if (!io) return;
    const deliveryBoys = await User.find({ role: "deliveryBoy", isOnline: true, socketId: { $ne: null } }).select("socketId");
    deliveryBoys.forEach((boy) => {
        io.to(boy.socketId).emit("newDonationDelivery", {
            donationId: donation._id,
            pickupAddress: donation.pickupAddress,
            trustName: donation.assignedTrustId?.name,
            deliveryCharge: donation.deliveryCharge
        });
    });
};

const createDonation = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(401).json({ message: "User not found" });

        const donorRole = roleToDonorRole(user.role);
        if (!donorRole) {
            return res.status(403).json({ message: "Your role cannot create donations" });
        }

        const {
            foodItems,
            foodDescription,
            pickupAddress,
            pickupLat,
            pickupLng,
            pickupTime,
            expiryTime,
            trustId
        } = req.body;

        if (!Array.isArray(foodItems) || foodItems.length === 0) {
            return res.status(400).json({ message: "At least one food item is required" });
        }
        if (!pickupAddress || !pickupTime || !expiryTime || !trustId) {
            return res.status(400).json({ message: "Pickup address, pickup time, expiry time and trust selection are required" });
        }
        const selectedTrust = await Trust.findOne({ _id: trustId, isVerified: true });
        if (!selectedTrust) return res.status(404).json({ message: "Selected trust not found" });

        const cleanedItems = foodItems
            .map((item) => ({
                name: item.name?.trim(),
                quantity: String(item.quantity || "").trim(),
                unit: item.unit?.trim()
            }))
            .filter((item) => item.name && item.quantity && item.unit);

        if (cleanedItems.length === 0) {
            return res.status(400).json({ message: "Food item name, quantity and unit are required" });
        }

        const pickupDate = new Date(pickupTime);
        const expiryDate = new Date(expiryTime);
        if (Number.isNaN(pickupDate.getTime()) || Number.isNaN(expiryDate.getTime())) {
            return res.status(400).json({ message: "Invalid pickup or expiry time" });
        }
        if (expiryDate <= pickupDate) {
            return res.status(400).json({ message: "Expiry time must be after pickup time" });
        }

        const lat = toNumber(pickupLat);
        const lng = toNumber(pickupLng);
        const pickupLocation = lat !== null && lng !== null ? { lat, lng } : undefined;
        let donation = await Donation.create({
            donorId: req.userId,
            donorRole,
            foodItems: cleanedItems,
            foodDescription,
            pickupAddress,
            pickupLocation,
            pickupTime: pickupDate,
            expiryTime: expiryDate,
            assignedTrustId: selectedTrust._id
        });

        donation = await populateDonation(Donation.findById(donation._id));

        try {
            await sendDonationTrustMail(selectedTrust.email, donation, selectedTrust);
        } catch (mailError) {
            console.log("Donation trust email failed:", mailError.message);
        }
        console.log(`Donation ${donation._id} sent to trust ${selectedTrust.name} (${selectedTrust.email})`);

        return res.status(201).json({
            message: `Donation created and sent to ${selectedTrust.name}`,
            donation,
            matchedTrust: selectedTrust
        });
    } catch (error) {
        return res.status(500).json({ message: `create donation error ${error.message}` });
    }
};

const getMyDonations = async (req, res) => {
    try {
        const donations = await populateDonation(
            Donation.find({ donorId: req.userId }).sort({ createdAt: -1 })
        );
        return res.status(200).json(donations);
    } catch (error) {
        return res.status(500).json({ message: `get my donations error ${error.message}` });
    }
};

const getAllDonations = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!isTrustManager(user)) {
            return res.status(403).json({ message: "Only admin/trust members can view managed donations" });
        }

        const filter = {};
        if (user.role === "trustMember") {
            const trust = await getManagedTrust(user);
            if (!trust) return res.status(200).json([]);
            filter.assignedTrustId = trust._id;
        }
        const donations = await populateDonation(
            Donation.find(filter).sort({ createdAt: -1 })
        );
        return res.status(200).json(donations);
    } catch (error) {
        return res.status(500).json({ message: `get donations error ${error.message}` });
    }
};

const updateDonationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!allowedDonationStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid donation status" });
        }

        const user = await User.findById(req.userId);
        const donation = await Donation.findById(req.params.id);
        if (!donation) return res.status(404).json({ message: "Donation not found" });

        const isAssignedDeliveryBoy = String(donation.assignedDeliveryBoyId || "") === String(req.userId);
        const isManager = await canManageDonation(user, donation);
        if (!isManager && !isAssignedDeliveryBoy) {
            return res.status(403).json({ message: "Only admin/trust member or assigned delivery boy can update status" });
        }

        donation.status = status;
        if (isManager && status === "accepted") {
            const { deliveryChargePaymentMethod, deliveryChargePaymentStatus } = req.body;
            if (["online", "offline"].includes(deliveryChargePaymentMethod)) {
                donation.deliveryChargePaymentMethod = deliveryChargePaymentMethod;
            }
            if (deliveryChargePaymentStatus === "paid") {
                donation.deliveryChargePaymentStatus = "paid";
            }
        }
        await donation.save();
        const updatedDonation = await populateDonation(Donation.findById(donation._id));
        if (status === "accepted" && !updatedDonation.assignedDeliveryBoyId) {
            await notifyDeliveryBoys(req, updatedDonation);
        }
        return res.status(200).json({ message: "Donation status updated", donation: updatedDonation });
    } catch (error) {
        return res.status(500).json({ message: `update donation status error ${error.message}` });
    }
};

const cancelDonation = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) return res.status(404).json({ message: "Donation not found" });
        if (String(donation.donorId) !== String(req.userId)) {
            return res.status(403).json({ message: "You can only cancel your own donation" });
        }
        if (donation.status !== "pending") {
            return res.status(400).json({ message: "Only pending donations can be cancelled" });
        }

        donation.status = "cancelled";
        await donation.save();
        const updatedDonation = await populateDonation(Donation.findById(donation._id));
        return res.status(200).json({ message: "Donation cancelled", donation: updatedDonation });
    } catch (error) {
        return res.status(500).json({ message: `cancel donation error ${error.message}` });
    }
};

const createTrust = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!isTrustManager(user)) {
            return res.status(403).json({ message: "Only admin/trust members can add trusts" });
        }

        const { name, address, lat, lng, contactNumber, email, acceptedFoodTypes, isVerified, registrationNumber, description, capacityPerDay, googlePayNumber, bankDetails, ownerId } = req.body;
        const latitude = toNumber(lat);
        const longitude = toNumber(lng);

        if (!name || !address || latitude === null || longitude === null || !contactNumber || !email) {
            return res.status(400).json({ message: "Name, address, lat, lng, contact number and email are required" });
        }

        if (user.role === "trustMember") {
            const existingTrust = await Trust.findOne({ owner: user._id });
            if (existingTrust) return res.status(400).json({ message: "Your trust is already registered" });
        }

        let photo;
        if (req.file) {
            photo = await uploadOnCloudinary(req.file.path);
        }

        const trust = await Trust.create({
            name,
            address,
            location: { lat: latitude, lng: longitude },
            contactNumber,
            email,
            owner: user.role === "admin" ? ownerId || null : user._id,
            registrationNumber,
            description,
            capacityPerDay,
            googlePayNumber,
            bankDetails,
            photo,
            acceptedFoodTypes: Array.isArray(acceptedFoodTypes)
                ? acceptedFoodTypes
                : String(acceptedFoodTypes || "").split(",").map((type) => type.trim()).filter(Boolean),
            isVerified: isVerified !== undefined ? Boolean(isVerified) : true
        });

        return res.status(201).json({ message: "Trust added", trust });
    } catch (error) {
        return res.status(500).json({ message: `create trust error ${error.message}` });
    }
};

const updateTrust = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!isTrustManager(user)) {
            return res.status(403).json({ message: "Only admin/trust members can edit trusts" });
        }

        const trust = await Trust.findById(req.params.id);
        if (!trust) return res.status(404).json({ message: "Trust not found" });
        if (user.role === "trustMember" && String(trust.owner) !== String(user._id)) {
            return res.status(403).json({ message: "You can only edit your own trust" });
        }

        const { name, address, lat, lng, contactNumber, email, acceptedFoodTypes, isVerified, registrationNumber, description, capacityPerDay, googlePayNumber, bankDetails } = req.body;
        const latitude = lat !== undefined ? toNumber(lat) : null;
        const longitude = lng !== undefined ? toNumber(lng) : null;

        const updateFields = {};
        if (name !== undefined) updateFields.name = name;
        if (address !== undefined) updateFields.address = address;
        if (contactNumber !== undefined) updateFields.contactNumber = contactNumber;
        if (email !== undefined) updateFields.email = email;
        if (registrationNumber !== undefined) updateFields.registrationNumber = registrationNumber;
        if (description !== undefined) updateFields.description = description;
        if (capacityPerDay !== undefined) updateFields.capacityPerDay = capacityPerDay;
        if (googlePayNumber !== undefined) updateFields.googlePayNumber = googlePayNumber;
        if (bankDetails !== undefined) updateFields.bankDetails = bankDetails;
        if (isVerified !== undefined) updateFields.isVerified = Boolean(isVerified);
        if (acceptedFoodTypes !== undefined) {
            updateFields.acceptedFoodTypes = Array.isArray(acceptedFoodTypes)
                ? acceptedFoodTypes
                : String(acceptedFoodTypes || "").split(",").map((type) => type.trim()).filter(Boolean);
        }
        if ((lat !== undefined || lng !== undefined) && (latitude === null || longitude === null)) {
            return res.status(400).json({ message: "Latitude and longitude must be valid numbers" });
        }
        if (latitude !== null && longitude !== null) {
            updateFields.location = { lat: latitude, lng: longitude };
        }

        if (req.file) {
            updateFields.photo = await uploadOnCloudinary(req.file.path);
        }

        const updatedTrust = await Trust.findByIdAndUpdate(req.params.id, updateFields, { new: true });
        return res.status(200).json({ message: "Trust updated", trust: updatedTrust });
    } catch (error) {
        return res.status(500).json({ message: `update trust error ${error.message}` });
    }
};

const getTrusts = async (req, res) => {
    try {
        const lat = toNumber(req.query.lat);
        const lng = toNumber(req.query.lng);
        let trusts = await Trust.find({ isVerified: true }).sort({ createdAt: -1 }).lean();

        if (lat !== null && lng !== null) {
            trusts = trusts
                .map((trust) => ({
                    ...trust,
                    distanceKm: Number(haversineDistance({ lat, lng }, trust.location).toFixed(2))
                }))
                .sort((a, b) => a.distanceKm - b.distanceKm);
        }

        return res.status(200).json(trusts);
    } catch (error) {
        return res.status(500).json({ message: `get trusts error ${error.message}` });
    }
};

const assignTrust = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!isTrustManager(user)) {
            return res.status(403).json({ message: "Only admin/trust members can assign trusts" });
        }

        const { trustId } = req.body;
        const trust = await Trust.findById(trustId);
        if (!trust) return res.status(404).json({ message: "Trust not found" });

        const donation = await Donation.findByIdAndUpdate(
            req.params.id,
            { assignedTrustId: trustId, status: "accepted" },
            { new: true }
        );
        if (!donation) return res.status(404).json({ message: "Donation not found" });

        const updatedDonation = await populateDonation(Donation.findById(donation._id));
        return res.status(200).json({ message: "Trust assigned", donation: updatedDonation });
    } catch (error) {
        return res.status(500).json({ message: `assign trust error ${error.message}` });
    }
};

const assignDeliveryBoy = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!isTrustManager(user)) {
            return res.status(403).json({ message: "Only admin/trust members can assign delivery boys" });
        }

        const { deliveryBoyId } = req.body;
        const deliveryBoy = await User.findOne({ _id: deliveryBoyId, role: "deliveryBoy" });
        if (!deliveryBoy) return res.status(404).json({ message: "Delivery boy not found" });

        const donation = await Donation.findByIdAndUpdate(
            req.params.id,
            { assignedDeliveryBoyId: deliveryBoyId, deliveryAssignmentMethod: "trustAssigned" },
            { new: true }
        );
        if (!donation) return res.status(404).json({ message: "Donation not found" });

        const updatedDonation = await populateDonation(Donation.findById(donation._id));
        return res.status(200).json({ message: "Delivery boy assigned", donation: updatedDonation });
    } catch (error) {
        return res.status(500).json({ message: `assign delivery boy error ${error.message}` });
    }
};

const getDeliveryBoys = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!isTrustManager(user)) {
            return res.status(403).json({ message: "Only admin/trust members can view delivery boys" });
        }

        const deliveryBoys = await User.find({ role: "deliveryBoy" }).select("fullName email mobile role");
        return res.status(200).json(deliveryBoys);
    } catch (error) {
        return res.status(500).json({ message: `get delivery boys error ${error.message}` });
    }
};

const getAvailableDonationDeliveries = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (user?.role !== "deliveryBoy") return res.status(403).json({ message: "Only delivery boys can view donation deliveries" });

        const donations = await populateDonation(
            Donation.find({ status: "accepted", assignedDeliveryBoyId: null }).sort({ updatedAt: -1 })
        );
        return res.status(200).json(donations);
    } catch (error) {
        return res.status(500).json({ message: `get donation deliveries error ${error.message}` });
    }
};

const acceptDonationDelivery = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (user?.role !== "deliveryBoy") return res.status(403).json({ message: "Only delivery boys can accept donation deliveries" });

        const activeDonation = await Donation.findOne({
            assignedDeliveryBoyId: req.userId,
            status: { $in: ["accepted", "picked_up"] }
        });
        if (activeDonation) return res.status(400).json({ message: "You already have an active donation delivery" });

        const donation = await Donation.findOneAndUpdate(
            { _id: req.params.id, status: "accepted", assignedDeliveryBoyId: null },
            { assignedDeliveryBoyId: req.userId, deliveryAssignmentMethod: "deliveryBoyAccepted" },
            { new: true }
        );
        if (!donation) return res.status(404).json({ message: "Donation is not available" });

        const updatedDonation = await populateDonation(Donation.findById(donation._id));
        return res.status(200).json({ message: "Donation delivery accepted", donation: updatedDonation });
    } catch (error) {
        return res.status(500).json({ message: `accept donation delivery error ${error.message}` });
    }
};

const getCurrentDonationDelivery = async (req, res) => {
    try {
        const donation = await populateDonation(
            Donation.findOne({
                assignedDeliveryBoyId: req.userId,
                status: { $in: ["accepted", "picked_up"] }
            }).sort({ updatedAt: -1 })
        );
        if (!donation) return res.status(404).json({ message: "No current donation delivery" });
        return res.status(200).json(donation);
    } catch (error) {
        return res.status(500).json({ message: `get current donation delivery error ${error.message}` });
    }
};

module.exports = {
    createDonation,
    getMyDonations,
    getAllDonations,
    updateDonationStatus,
    cancelDonation,
    createTrust,
    updateTrust,
    getTrusts,
    assignTrust,
    assignDeliveryBoy,
    getDeliveryBoys,
    getAvailableDonationDeliveries,
    acceptDonationDelivery,
    getCurrentDonationDelivery
};

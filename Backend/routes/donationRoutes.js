const express = require("express");
const isAuth = require("../middlewares/isAuth.js");
const upload = require("../middlewares/multer.js");
const {
    createDonation,
    getMyDonations,
    getAllDonations,
    updateDonationStatus,
    cancelDonation,
    createTrust,
    getTrusts,
    assignTrust,
    assignDeliveryBoy,
    getDeliveryBoys,
    getAvailableDonationDeliveries,
    acceptDonationDelivery,
    getCurrentDonationDelivery,
    updateTrust
} = require("../controllers/donation.controllers.js");

const donationRouter = express.Router();

donationRouter.post("/donations", isAuth, createDonation);
donationRouter.get("/donations/my", isAuth, getMyDonations);
donationRouter.get("/donations", isAuth, getAllDonations);
donationRouter.patch("/donations/:id/status", isAuth, updateDonationStatus);
donationRouter.patch("/donations/:id/cancel", isAuth, cancelDonation);
donationRouter.patch("/donations/:id/assign-trust", isAuth, assignTrust);
donationRouter.patch("/donations/:id/assign-delivery", isAuth, assignDeliveryBoy);
donationRouter.get("/donation-deliveries/available", isAuth, getAvailableDonationDeliveries);
donationRouter.get("/donation-deliveries/current", isAuth, getCurrentDonationDelivery);
donationRouter.patch("/donations/:id/accept-delivery", isAuth, acceptDonationDelivery);

donationRouter.post("/trusts", isAuth, upload.single("photo"), createTrust);
donationRouter.patch("/trusts/:id", isAuth, upload.single("photo"), updateTrust);
donationRouter.get("/trusts", isAuth, getTrusts);
donationRouter.get("/delivery-boys", isAuth, getDeliveryBoys);

module.exports = donationRouter;

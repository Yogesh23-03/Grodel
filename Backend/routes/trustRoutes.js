const express = require("express");
const router = express.Router();
const isAuth = require("../middlewares/isAuth.js");
const upload = require("../middlewares/multer.js");
const {
    createTrust,
    getAllTrusts,
    getTrustById,
    updateTrust,
    deleteTrust,
    getTrustsByLocation
} = require("../controllers/trust.controllers.js");

// Public routes
router.get("/", getAllTrusts);
router.get("/location", getTrustsByLocation);
router.get("/:id", getTrustById);

// Protected routes (require authentication)
router.post("/", isAuth, upload.single("photo"), createTrust);
router.patch("/:id", isAuth, upload.single("photo"), updateTrust);
router.delete("/:id", isAuth, deleteTrust);

module.exports = router;

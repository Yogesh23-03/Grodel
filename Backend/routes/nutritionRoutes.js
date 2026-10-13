const express = require("express")
const { getNutrition } = require("../controllers/nutritionController")

const router = express.Router()

router.get("/nutrition", getNutrition)

module.exports = router

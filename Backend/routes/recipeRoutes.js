const express = require("express")
const { getRecipe } = require("../controllers/recipeController")

const router = express.Router()

router.get("/recipe", getRecipe)

module.exports = router

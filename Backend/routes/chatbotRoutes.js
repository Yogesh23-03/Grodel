const express = require("express")
const { chat } = require("../controllers/chatbotController")

const router = express.Router()

router.post("/chatbot", chat)

module.exports = router

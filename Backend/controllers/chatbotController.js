const Shop = require("../models/shop.Model.js")
const Item = require("../models/item.Model.js")
const { groqChat } = require("../utils/groq.js")

/* Keep the payload (and the model's context) small — last 10 turns only. */
const MAX_HISTORY = 10

const sanitizeHistory = (history) => {
    if (!Array.isArray(history)) return []
    return history
        .filter(entry => entry && (entry.role === "user" || entry.role === "assistant") && typeof entry.content === "string")
        .slice(-MAX_HISTORY)
        .map(entry => ({ role: entry.role, content: entry.content.slice(0, 1000) }))
}

/* Build the live menu context for the customer's city from MongoDB. */
const buildMenuContext = async (city) => {
    const cityFilter = city ? { city: new RegExp(city, "i") } : {}
    const shops = await Shop.find(cityFilter).select("name city items")
    if (!shops.length) return ""

    const shopIds = shops.map(shop => shop._id)
    const items = await Item.find({ shop: { $in: shopIds } }).select("name price shop foodType")

    return shops.map(shop => {
        const menu = items
            .filter(item => String(item.shop) === String(shop._id))
            .map(item => `${item.name} ₹${item.price}${item.foodType === "veg" ? " (veg)" : item.foodType ? " (non-veg)" : ""}`)
            .join(", ")
        return `Restaurant: ${shop.name} (${shop.city || city || "unknown city"})
                Items: ${menu || "no items listed"}`
    }).join("\n\n")
}

const buildSystemPrompt = (city, menuContext, language) => `You are GroDel's friendly food assistant for ${city || "the customer's city"}.
     You help customers find food, suggest dishes, answer questions
     about ingredients, nutrition and cooking.

     Available restaurants and menu in ${city || "the customer's city"}:
     ${menuContext || "No restaurants have listed items in this city yet."}

     Rules:
     - Only recommend items actually in the menu above
     - If asked about something not in menu, say it's not available
       and suggest the closest alternative from the menu
     - Keep responses short and friendly (2-4 sentences max)
     - Use the user's language: ${language || "en"}
     - Always mention the restaurant name when recommending
     - If user asks to order something, say "Add it to your cart!"
     - You can answer nutrition questions, suggest by mood/health goal,
       find items by price range, and help with group orders`

const chat = async (req, res) => {
    try {
        const { message, conversationHistory, city, language } = req.body || {}

        if (!message || !String(message).trim()) {
            return res.status(400).json({ message: "message is required" })
        }

        const menuContext = await buildMenuContext(String(city || "").trim())
        const messages = [
            { role: "system", content: buildSystemPrompt(city, menuContext, language) },
            ...sanitizeHistory(conversationHistory),
            { role: "user", content: String(message).slice(0, 1000) }
        ]

        const reply = await groqChat(messages, { temperature: 0.8, maxTokens: 300 })

        return res.status(200).json({ reply, timestamp: new Date() })
    } catch (error) {
        console.error("CHATBOT ERROR:", error.message)
        if (error.code === "AI_NOT_CONFIGURED") {
            return res.status(503).json({ message: "AI is not configured on the server" })
        }
        return res.status(500).json({ message: "The food assistant is unavailable right now" })
    }
}

module.exports = { chat }

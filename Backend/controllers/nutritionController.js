const NutritionCache = require("../models/NutritionCache.js")
const { groqChat, parseGroqJson } = require("../utils/groq.js")

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

const buildMessages = (name) => [
    {
        role: "system",
        content: `You are a nutrition expert. Always respond with valid JSON only.
                  No markdown, no explanation, just the JSON object.`
    },
    {
        role: "user",
        content: `Give complete nutrition information for: "${name}"
          This could be a food dish, vegetable, fruit, or any food product
          commonly found in India.

          Return ONLY this JSON:
          {
            "calories": <number per 100g or per serving>,
            "protein": <grams>,
            "carbohydrates": <grams>,
            "fat": <grams>,
            "fiber": <grams>,
            "sugar": <grams>,
            "sodium": <mg>,
            "servingSize": "100g or 1 piece etc",
            "vitamins": ["Vitamin C", "Vitamin A"],
            "minerals": ["Iron", "Calcium"],
            "healthBenefits": ["Good for immunity", "Rich in antioxidants"],
            "suitableFor": ["diabetics", "weight loss", "vegetarians"],
            "notSuitableFor": ["lactose intolerant"],
            "allergens": ["gluten", "dairy"],
            "dietType": "veg|non-veg|vegan"
          }
          Use an empty array when a list does not apply.`
    }
]

const getNutrition = async (req, res) => {
    try {
        const name = String(req.query.name || "").trim()
        const language = String(req.query.language || "en").trim()

        if (!name) {
            return res.status(400).json({ message: "name is required" })
        }

        const normalizedName = name.toLowerCase()
        const cached = await NutritionCache.findOne({ normalizedName })

        if (cached && Date.now() - new Date(cached.createdAt).getTime() < SEVEN_DAYS) {
            return res.status(200).json({ itemName: cached.itemName, nutrition: cached.nutrition, cached: true })
        }

        // 1500, not a tight budget: gpt-oss counts its reasoning tokens against
        // max_tokens, and a truncated answer makes Groq reject the JSON outright
        // (json_validate_failed). Verified: 600 fails for real items, 1500 parses.
        const text = await groqChat(buildMessages(name), { json: true, maxTokens: 1500 })
        const nutrition = parseGroqJson(text)

        await NutritionCache.findOneAndUpdate(
            { normalizedName },
            { itemName: name, normalizedName, nutrition, language, createdAt: new Date() },
            { upsert: true, new: true }
        )

        return res.status(200).json({ itemName: name, nutrition, cached: false })
    } catch (error) {
        console.error("GET NUTRITION ERROR:", error.message)
        if (error.code === "AI_NOT_CONFIGURED") {
            return res.status(503).json({ message: "AI is not configured on the server" })
        }
        return res.status(500).json({ message: "Could not load nutrition information" })
    }
}

module.exports = { getNutrition }

const RecipeCache = require("../models/RecipeCache.js")
const { groqChat, parseGroqJson } = require("../utils/groq.js")

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

const buildMessages = (name) => [
    {
        role: "system",
        content: `You are a professional Indian chef and recipe writer.
                  Always respond with valid JSON only. No markdown.`
    },
    {
        role: "user",
        content: `Give a complete recipe and cooking instructions for: "${name}"
          This is for an Indian food delivery app.
          If this is a raw ingredient (tomato, onion etc), give the most
          popular Indian dish made from it.
          If this is already a dish (biryani, dosa etc), give the recipe for it.

          Return ONLY this JSON:
          {
            "dishName": "exact dish name",
            "description": "2 sentence appetizing description",
            "prepTime": "15 minutes",
            "cookTime": "30 minutes",
            "servings": 4,
            "difficulty": "Easy|Medium|Hard",
            "cuisineType": "South Indian|North Indian|etc",
            "mealType": "Breakfast|Lunch|Dinner|Snack",
            "ingredients": [
              { "name": "tomatoes", "quantity": "3", "unit": "medium", "optional": false }
            ],
            "steps": [
              {
                "stepNumber": 1,
                "title": "Prepare masala",
                "instruction": "detailed instruction here",
                "duration": "5 minutes"
              }
            ],
            "tips": ["tip 1", "tip 2"],
            "variations": ["variation 1"],
            "servingSuggestion": "Serve hot with..."
          }`
    }
]

const getRecipe = async (req, res) => {
    try {
        const name = String(req.query.name || "").trim()
        const language = String(req.query.language || "en").trim()

        if (!name) {
            return res.status(400).json({ message: "name is required" })
        }

        const normalizedName = name.toLowerCase()
        const cached = await RecipeCache.findOne({ normalizedName })

        if (cached && Date.now() - new Date(cached.createdAt).getTime() < THIRTY_DAYS) {
            return res.status(200).json({ itemName: cached.itemName, recipe: cached.recipe, cached: true })
        }

        // 3000, not a tight budget: a full recipe (ingredients + steps + tips +
        // variations) does not fit when gpt-oss spends max_tokens on reasoning,
        // and a truncated reply is rejected by Groq / by parseGroqJson.
        const text = await groqChat(buildMessages(name), { json: true, maxTokens: 3000 })
        const recipe = parseGroqJson(text)

        await RecipeCache.findOneAndUpdate(
            { normalizedName },
            { itemName: name, normalizedName, recipe, language, createdAt: new Date() },
            { upsert: true, new: true }
        )

        return res.status(200).json({ itemName: name, recipe, cached: false })
    } catch (error) {
        console.error("GET RECIPE ERROR:", error.message)
        if (error.code === "AI_NOT_CONFIGURED") {
            return res.status(503).json({ message: "AI is not configured on the server" })
        }
        return res.status(500).json({ message: "Could not load the recipe" })
    }
}

module.exports = { getRecipe }

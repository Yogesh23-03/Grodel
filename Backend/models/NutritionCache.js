const mongoose = require("mongoose")

/*
 * NutritionCache — one document per food item so the Groq nutrition call
 * runs once per item instead of on every card open. Entries older than
 * 7 days are treated as stale and regenerated.
 */
const nutritionCacheSchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    normalizedName: { type: String, required: true, unique: true },
    nutrition: {
        calories: Number,
        protein: Number,
        carbohydrates: Number,
        fat: Number,
        fiber: Number,
        sugar: Number,
        sodium: Number,
        vitamins: [String],
        minerals: [String],
        servingSize: String,
        healthBenefits: [String],
        suitableFor: [String],
        notSuitableFor: [String],
        allergens: [String],
        dietType: String
    },
    language: { type: String, default: "en" },
    createdAt: { type: Date, default: Date.now }
})

const NutritionCache = mongoose.models.NutritionCache || mongoose.model("NutritionCache", nutritionCacheSchema)

module.exports = NutritionCache

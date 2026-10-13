const mongoose = require("mongoose")

/*
 * RecipeCache — recipes barely change, so this cache lives for 30 days.
 */
const recipeCacheSchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    normalizedName: { type: String, required: true, unique: true },
    recipe: {
        dishName: String,
        description: String,
        prepTime: String,
        cookTime: String,
        servings: Number,
        difficulty: String,
        ingredients: [{
            name: String,
            quantity: String,
            unit: String,
            optional: Boolean
        }],
        steps: [{
            stepNumber: Number,
            title: String,
            instruction: String,
            duration: String
        }],
        tips: [String],
        variations: [String],
        cuisineType: String,
        mealType: String,
        servingSuggestion: String
    },
    language: { type: String, default: "en" },
    createdAt: { type: Date, default: Date.now }
})

const RecipeCache = mongoose.models.RecipeCache || mongoose.model("RecipeCache", recipeCacheSchema)

module.exports = RecipeCache

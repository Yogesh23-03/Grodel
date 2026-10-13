const { groqChat, groqVision, parseGroqJson } = require("../utils/groq")
const { clean } = require("../utils/sanitize")

/*
 * AI MENU DESCRIPTION WRITER — owners only.
 *
 * Turns a few fields (and optionally a photo) into ready-to-publish menu copy.
 * The photo path uses the vision model so the description can reference what is
 * actually on the plate; without a photo we fall back to a text completion.
 */

const SPICE_LEVELS = ["Mild", "Medium", "Spicy", "Very Spicy"]

const buildPrompt = ({ dishName, cuisine, isVeg, spiceLevel, keyIngredients, hasImage }) => {
    const subject = hasImage
        ? `This is a photo of "${dishName}" from an Indian restaurant.`
        : `Write menu copy for the Indian restaurant dish "${dishName}".`

    return `${subject}
Write a mouth-watering menu description for this dish.
Details: cuisine=${cuisine || "Indian"}, veg=${isVeg === "veg" ? "yes" : "no"},
spice level=${spiceLevel || "Medium"}, key ingredients=${keyIngredients || "not specified"}

Base the description only on the details given — do not invent ingredients
that were not listed.

Return ONLY this JSON:
{
  "description": "2-3 sentence appetizing description for menu",
  "shortTag": "one catchy 4-word tagline",
  "highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "bestPairedWith": "suggestion for what to pair it with",
  "spiceLevel": "Mild|Medium|Spicy|Very Spicy"
}`
}

const generateMenuDescription = async (req, res) => {
    try {
        const dishName = clean(req.body?.dishName, 120)
        if (!dishName) {
            return res.status(400).json({ message: "dishName is required" })
        }

        const cuisine = clean(req.body?.cuisine, 60)
        const isVeg = clean(req.body?.isVeg, 20) === "veg" ? "veg" : "non veg"
        const spiceLevel = clean(req.body?.spiceLevel, 20)
        const keyIngredients = clean(req.body?.keyIngredients, 300)

        const file = req.file
        const hasImage = Boolean(file?.buffer?.length)

        const prompt = buildPrompt({ dishName, cuisine, isVeg, spiceLevel, keyIngredients, hasImage })

        /* Vision model returns prose-wrapped JSON (no response_format support),
           so every reply goes through parseGroqJson which strips fences and
           refuses a truncated object. */
        const raw = hasImage
            ? await groqVision(file.buffer.toString("base64"), file.mimetype, prompt)
            : await groqChat([
                { role: "system", content: "You are a restaurant menu copywriter. Return only valid JSON." },
                { role: "user", content: prompt }
            ], { json: true, maxTokens: 700 })

        const generated = parseGroqJson(raw)

        if (!generated?.description) {
            return res.status(502).json({ message: "AI returned an unusable description" })
        }

        const requestedSpice = SPICE_LEVELS.find(level => level.toLowerCase() === spiceLevel.toLowerCase())

        return res.status(200).json({
            description: clean(generated.description, 800),
            shortTag: clean(generated.shortTag, 80),
            highlights: Array.isArray(generated.highlights)
                ? generated.highlights.map(item => clean(item, 120)).filter(Boolean).slice(0, 4)
                : [],
            bestPairedWith: clean(generated.bestPairedWith, 160),
            /* Prefer the level the owner picked over whatever the model echoed. */
            spiceLevel: requestedSpice
                || SPICE_LEVELS.find(level => level.toLowerCase() === clean(generated.spiceLevel).toLowerCase())
                || "Medium"
        })
    } catch (error) {
        if (error?.code === "AI_NOT_CONFIGURED") {
            return res.status(503).json({ message: error.message })
        }
        if (error?.code === "AI_BAD_JSON") {
            return res.status(502).json({ message: "AI response was incomplete — please try again" })
        }
        console.error("GENERATE MENU DESCRIPTION ERROR:", error.message)
        return res.status(500).json({ message: "Could not generate a description right now" })
    }
}

module.exports = { generateMenuDescription }

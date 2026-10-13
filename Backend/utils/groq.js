const Groq = require("groq-sdk")

/*
 * Shared Groq wrapper — EVERY AI call in GroDel goes through this file.
 * Controllers never talk to the SDK directly so the model, limits and
 * JSON handling stay in one place.
 */

let client = null

const getClient = () => {
    if (!process.env.GROQ_API_KEY) {
        const error = new Error("AI is not configured — GROQ_API_KEY is missing on the server")
        error.code = "AI_NOT_CONFIGURED"
        throw error
    }
    if (!client) {
        client = new Groq({ apiKey: process.env.GROQ_API_KEY })
    }
    return client
}

const TEXT_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b"

// Vision: the Llama-4 Scout/Maverick vision models are retired on Groq (Maverick
// shut down 2026-03-09, Scout 2026-07-17), which is why this account returns
// model_not_found for them. qwen/qwen3.8-27b is Groq's current image-input model
// and is what this account can actually reach. Override with GROQ_VISION_MODEL.
const VISION_MODEL = process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b"

/* Groq answers a too-small JSON budget with an empty generation rather than a
   truncated one. We retry once at a larger budget instead of making every
   caller guess a safe number. */
const JSON_RETRY_CEILING = 2000
const isJsonBudgetFailure = (error) =>
    error?.status === 400 && /json_validate_failed|Failed to validate JSON/i.test(String(error?.message))

const groqChat = async (messages, options = {}) => {
    const budget = options.maxTokens || 1000

    const run = (maxTokens) => getClient().chat.completions.create({
        model: options.model || TEXT_MODEL,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: maxTokens,
        response_format: options.json ? { type: "json_object" } : undefined
    })

    let response
    try {
        response = await run(budget)
    } catch (error) {
        if (!options.json || !isJsonBudgetFailure(error) || budget >= JSON_RETRY_CEILING) throw error
        response = await run(Math.min(budget * 3, JSON_RETRY_CEILING))
    }

    return response.choices[0]?.message?.content || ""
}

const groqVision = async (base64Image, mimeType, prompt) => {
    const response = await getClient().chat.completions.create({
        model: VISION_MODEL,
        messages: [{
            role: "user",
            content: [
                {
                    type: "image_url",
                    image_url: {
                        url: `data:${mimeType};base64,${base64Image}`
                    }
                },
                { type: "text", text: prompt }
            ]
        }],
        max_tokens: 500
    })
    return response.choices[0]?.message?.content || ""
}

/*
 * A reply cut off by max_tokens is NOT valid JSON — parsing it would silently
 * cache a half-finished recipe for 30 days. So every candidate must be
 * structurally balanced (braces/brackets closed, no unterminated string)
 * before it is allowed to parse.
 */
const isBalancedJson = (text) => {
    let depth = 0
    let inString = false
    let escaped = false
    for (const char of text) {
        if (escaped) { escaped = false; continue }
        if (char === "\\") { escaped = true; continue }
        if (char === '"') { inString = !inString; continue }
        if (inString) continue
        if (char === "{" || char === "[") depth++
        else if (char === "}" || char === "]") {
            depth--
            if (depth < 0) return false
        }
    }
    return depth === 0 && !inString
}

/* Models sometimes wrap JSON in ```json fences — strip them before parsing. */
const parseGroqJson = (rawText) => {
    const cleaned = String(rawText || "").replace(/```json|```/g, "").trim()
    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")

    const candidates = [cleaned]
    if (start !== -1 && end > start) candidates.push(cleaned.slice(start, end + 1))

    for (const candidate of candidates) {
        if (!isBalancedJson(candidate)) continue
        try {
            return JSON.parse(candidate)
        } catch (err) {
            // fall through to the next candidate
        }
    }

    const error = new Error("AI response was incomplete or not valid JSON")
    error.code = "AI_BAD_JSON"
    throw error
}

module.exports = { groqChat, groqVision, parseGroqJson }

/*
 * Input sanitisation helper — every controller that writes user-supplied text
 * to MongoDB funnels it through `clean()` first so a request can't stash a
 * 10MB string (or a non-string object) in a field that should be plain text.
 */
const clean = (value, maxLength = 500) =>
    String(value ?? "").trim().slice(0, maxLength)

/* Same as clean(), but for arrays of strings (ingredients, highlights, tags). */
const cleanList = (value, maxItems = 20, maxLength = 200) => {
    const list = Array.isArray(value) ? value : String(value ?? "").split(",")
    return list
        .map(entry => clean(entry, maxLength))
        .filter(Boolean)
        .slice(0, maxItems)
}

/* Numbers arrive from FormData as strings — coerce defensively. */
const cleanNumber = (value, { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = 0 } = {}) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    return Math.min(Math.max(parsed, min), max)
}

/* Mongoose ObjectId check that never throws on malformed input. */
const isValidObjectId = (value) => {
    const mongoose = require("mongoose")
    return Boolean(value) && mongoose.Types.ObjectId.isValid(String(value))
}

module.exports = { clean, cleanList, cleanNumber, isValidObjectId }

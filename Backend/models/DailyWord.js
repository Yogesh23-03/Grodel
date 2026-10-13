const mongoose = require('mongoose')

/*
 * The daily food word for the Wordle-style puzzle.
 * One document per calendar date (YYYY-MM-DD). The word itself is only ever
 * read on the server — the client receives the length, hint and category.
 */
const dailyWordSchema = new mongoose.Schema({
    word: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true,
        unique: true
    },
    hint: String,
    category: String
}, { timestamps: true })

const DailyWord = mongoose.models.DailyWord || mongoose.model('DailyWord', dailyWordSchema)

module.exports = DailyWord

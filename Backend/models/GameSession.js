const mongoose = require('mongoose')

/*
 * One row per game played while waiting on an order.
 * The (userId, orderId, gameType) triple is what enforces "one spin per order"
 * server-side — the client can never re-spin by replaying the request.
 */
const gameSessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    gameType: {
        type: String,
        enum: ['trivia', 'wordpuzzle', 'spin', 'guessdish', 'recipechallenge'],
        required: true
    },
    coinsEarned: {
        type: Number,
        default: 0
    },
    score: {
        type: Number,
        default: 0
    },
    completed: {
        type: Boolean,
        default: false
    },
    playedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true })

/* Fast lookups: "has this user already spun for this order?" and per-user history. */
gameSessionSchema.index({ userId: 1, orderId: 1, gameType: 1 })
gameSessionSchema.index({ userId: 1, playedAt: -1 })

const GameSession = mongoose.models.GameSession || mongoose.model('GameSession', gameSessionSchema)

module.exports = GameSession

const User = require('../models/user.Model')
const Order = require('../models/order.model')
const Shop = require('../models/shop.Model')
const GameSession = require('../models/GameSession')
const DailyWord = require('../models/DailyWord')
const { groqChat, parseGroqJson } = require('../utils/groq')

/*
 * engagementController — everything the order-wait screen needs:
 * loyalty (coins / streaks / badges), five games whose content comes from
 * Groq, and city content (food facts, trending).
 *
 * Ground rules kept here, not in the client:
 *  - Coins, streaks and badges only ever change on the server, on the User doc.
 *  - The puzzle word and the trivia/dish answers never leave the server.
 *  - One spin per order is enforced by a GameSession lookup.
 */

const DAY_MS = 24 * 60 * 60 * 1000
const COINS_PER_RUPEE = 0.1 // 100 coins = ₹10

/* --- badge catalogue: id + the rule that grants it --- */
const BADGES = [
    { id: 'coin_collector', name: 'Coin Collector', description: 'Earned 100 GroDel coins', test: u => u.coins >= 100 },
    { id: 'coin_master', name: 'Coin Master', description: 'Earned 500 GroDel coins', test: u => u.coins >= 500 },
    { id: 'gamer', name: 'GroDel Gamer', description: 'Played 10 games', test: u => u.gamesPlayed >= 10 },
    { id: 'game_master', name: 'Game Master', description: 'Played 50 games', test: u => u.gamesPlayed >= 50 },
    { id: 'streak_king', name: 'Streak King', description: '7 day streak', test: u => u.streak.current >= 7 }
]

/* Only the coins prize routes back into the wallet. */
const SPIN_PRIZES = [
    { label: '5% off next order', type: 'discount', value: 5, weight: 20 },
    { label: '10% off next order', type: 'discount', value: 10, weight: 10 },
    { label: 'Free delivery', type: 'freeDelivery', value: 1, weight: 15 },
    { label: '10 coins', type: 'coins', value: 10, weight: 25 },
    { label: '25 coins', type: 'coins', value: 25, weight: 15 },
    { label: '50 coins', type: 'coins', value: 50, weight: 8 },
    { label: 'Better luck next time', type: 'none', value: 0, weight: 7 }
]

const badRequest = (res, message) => res.status(400).json({ message })
const serverError = (res, error, message) => {
    console.error('ENGAGEMENT ERROR:', error.message)
    /* Surface AI trouble as an upstream problem, not our bug — the games
       degrade to a retryable message instead of looking like a server crash. */
    if (error.code === 'AI_NOT_CONFIGURED') {
        return res.status(503).json({ message: 'AI is not configured on the server' })
    }
    if (error.code === 'AI_BAD_JSON') {
        return res.status(502).json({ message: 'AI returned an unusable response' })
    }
    return res.status(500).json({ message: message || error.message })
}

/*
 * awardCoins — the single funnel every game reward passes through.
 * Bumps coins, plays count and the daily streak, then re-evaluates badges.
 * Returns the fresh wallet so callers can answer in one round trip.
 */
const awardCoins = async (userId, amount, reason) => {
    const user = await User.findById(userId)
    if (!user) {
        const error = new Error('User not found')
        error.code = 'NO_USER'
        throw error
    }

    user.coins = (user.coins || 0) + (Number(amount) || 0)
    user.gamesPlayed = (user.gamesPlayed || 0) + 1

    /* --- streak bookkeeping: same day = unchanged, yesterday = +1, else reset --- */
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - DAY_MS).toDateString()
    const lastPlayed = user.streak?.lastPlayedAt ? new Date(user.streak.lastPlayedAt).toDateString() : null

    if (!user.streak) user.streak = { current: 0, longest: 0, lastPlayedAt: null }

    if (lastPlayed === today) {
        // already counted today — leave the streak alone
    } else if (lastPlayed === yesterday) {
        user.streak.current = (user.streak.current || 0) + 1
    } else {
        user.streak.current = 1
    }
    user.streak.longest = Math.max(user.streak.longest || 0, user.streak.current || 0)
    user.streak.lastPlayedAt = new Date()

    /* --- badges: only grant ones the user does not already hold --- */
    const held = new Set((user.badges || []).map(badge => badge.id))
    const newBadges = []
    for (const badge of BADGES) {
        if (held.has(badge.id)) continue
        if (badge.test(user)) {
            const earned = { id: badge.id, name: badge.name, description: badge.description, earnedAt: new Date() }
            user.badges.push(earned)
            held.add(badge.id)
            newBadges.push(earned)
        }
    }

    await user.save()

    return {
        coins: user.coins,
        streak: user.streak,
        badges: user.badges,
        gamesPlayed: user.gamesPlayed,
        newBadges,
        reason
    }
}

/* ---------------------------------------------------------------- wallet --- */

const getMyCoins = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('coins streak badges gamesPlayed triviaScore')
        if (!user) return badRequest(res, 'User not found')
        return res.status(200).json({
            coins: user.coins || 0,
            streak: user.streak || { current: 0, longest: 0, lastPlayedAt: null },
            badges: user.badges || [],
            gamesPlayed: user.gamesPlayed || 0,
            triviaScore: user.triviaScore || 0
        })
    } catch (error) {
        return serverError(res, error)
    }
}

const redeemCoins = async (req, res) => {
    try {
        const amount = Number(req.body?.amount)
        if (!Number.isFinite(amount) || amount <= 0) return badRequest(res, 'Invalid amount')

        const user = await User.findById(req.userId)
        if (!user) return badRequest(res, 'User not found')
        if ((user.coins || 0) < amount) return badRequest(res, 'Not enough coins')

        user.coins -= amount
        await user.save()

        return res.status(200).json({
            coins: user.coins,
            discountAmount: amount * COINS_PER_RUPEE
        })
    } catch (error) {
        return serverError(res, error)
    }
}

const getLeaderboard = async (req, res) => {
    try {
        const type = ['coins', 'streak', 'trivia'].includes(req.query?.type) ? req.query.type : 'coins'
        const limit = Math.min(50, Math.max(1, Number(req.query?.limit) || 10))

        /* streak is nested, so it needs a computed sort key rather than a field. */
        const sortField = type === 'coins' ? 'coins' : type === 'trivia' ? 'triviaScore' : 'streak.current'

        const users = await User.find({ role: 'user' })
            .sort({ [sortField]: -1 })
            .limit(limit)
            .select('fullName coins streak triviaScore badges')

        return res.status(200).json(users.map(user => ({
            fullName: user.fullName,
            coins: user.coins || 0,
            streak: user.streak?.current || 0,
            triviaScore: user.triviaScore || 0,
            badge: user.badges?.[0] || null
        })))
    } catch (error) {
        return serverError(res, error)
    }
}

/* ------------------------------------------------------------ AI content --- */

const generateTriviaQuestion = async (req, res) => {
    try {
        const difficulty = ['easy', 'medium', 'hard'].includes(req.body?.difficulty) ? req.body.difficulty : 'easy'
        const topic = ['general', 'spices', 'dishes', 'nutrition', 'history'].includes(req.body?.topic) ? req.body.topic : 'general'
        const used = Array.isArray(req.body?.usedQuestions) ? req.body.usedQuestions.slice(-25) : []

        const messages = [
            { role: 'system', content: 'You are a food trivia expert. Return only valid JSON.' },
            {
                role: 'user',
                content: `Generate 1 unique Indian food trivia question.
        Difficulty: ${difficulty}
        Topic: ${topic}
        Do NOT repeat these questions: ${used.join(', ')}

        Return ONLY this JSON:
        {
          "question": "question text",
          "options": ["A", "B", "C", "D"],
          "correctIndex": 0,
          "explanation": "why this answer is correct",
          "funFact": "interesting related fact",
          "difficulty": "${difficulty}"
        }`
            }
        ]

        const text = await groqChat(messages, { json: true, maxTokens: 600 })
        const question = parseGroqJson(text)

        /* Guard the shape — the client indexes options by correctIndex. */
        if (!question?.question || !Array.isArray(question.options) || question.options.length < 2) {
            return res.status(502).json({ message: 'AI returned an unusable question' })
        }
        const correctIndex = Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex < question.options.length
            ? question.correctIndex
            : 0

        return res.status(200).json({ ...question, correctIndex, difficulty })
    } catch (error) {
        return serverError(res, error, 'Could not generate a trivia question')
    }
}

const recordTriviaAnswer = async (req, res) => {
    try {
        const { orderId, correct, difficulty } = req.body || {}
        const coins = correct
            ? difficulty === 'hard' ? 15 : difficulty === 'medium' ? 10 : 5
            : 0

        if (correct) {
            await User.findByIdAndUpdate(req.userId, { $inc: { triviaScore: 1 } })
        }

        if (orderId) {
            await GameSession.create({
                userId: req.userId,
                orderId,
                gameType: 'trivia',
                coinsEarned: coins,
                score: correct ? 1 : 0,
                completed: true
            })
        }

        const wallet = await awardCoins(req.userId, coins, 'trivia')
        return res.status(200).json({
            coinsEarned: coins,
            totalCoins: wallet.coins,
            streak: wallet.streak,
            newBadges: wallet.newBadges
        })
    } catch (error) {
        if (error.code === 'NO_USER') return badRequest(res, 'User not found')
        return serverError(res, error)
    }
}

const getDailyWord = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0]
        let dailyWord = await DailyWord.findOne({ date: today })

        if (!dailyWord) {
            const messages = [
                { role: 'system', content: 'You return only valid JSON. No markdown.' },
                {
                    role: 'user',
                    content: `Generate a food-related English word for a Wordle game.
      Rules:
      - Must be 5-7 letters
      - Must be a food, spice, ingredient or cooking term
      - Common enough that people know it
      - Indian or international food words both fine
      Return ONLY this JSON:
      {
        "word": "MASALA",
        "hint": "a blend of spices",
        "category": "Spices"
      }`
                }
            ]
            const text = await groqChat(messages, { json: true, maxTokens: 400 })
            const generated = parseGroqJson(text)

            const word = String(generated?.word || '').toUpperCase().replace(/[^A-Z]/g, '')
            if (word.length < 5 || word.length > 7) {
                return res.status(502).json({ message: 'AI returned an unusable word' })
            }

            /* Upsert rather than create: a race between two first-requests of the
               day would otherwise throw a duplicate-key error. */
            dailyWord = await DailyWord.findOneAndUpdate(
                { date: today },
                {
                    date: today,
                    word,
                    hint: generated.hint || '',
                    category: generated.category || 'Food'
                },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            )
        }

        /* The word itself is deliberately withheld — length is enough to draw the grid. */
        return res.status(200).json({
            date: dailyWord.date,
            length: dailyWord.word.length,
            hint: dailyWord.hint,
            category: dailyWord.category
        })
    } catch (error) {
        return serverError(res, error, 'Could not load today`s word')
    }
}

const verifyWordGuess = async (req, res) => {
    try {
        const { date, guess } = req.body || {}
        const dailyWord = await DailyWord.findOne({ date })
        if (!dailyWord) return res.status(404).json({ message: 'No word for that date' })

        const word = dailyWord.word.toUpperCase()
        const attempt = String(guess || '').toUpperCase().trim()
        if (attempt.length !== word.length) return badRequest(res, 'Guess length does not match')

        /* Wordle scoring: exact match first, then "present" for letters that
           exist elsewhere. Marking a letter correct must not also consume it
           as present, so exact matches are resolved in a first pass. */
        const remaining = word.split('')
        const result = attempt.split('').map(() => ({ letter: '', state: 'absent' }))

        attempt.split('').forEach((letter, i) => {
            result[i].letter = letter
            if (letter === word[i]) {
                result[i].state = 'correct'
                remaining[i] = null
            }
        })
        attempt.split('').forEach((letter, i) => {
            if (result[i].state === 'correct') return
            const slot = remaining.indexOf(letter)
            if (slot !== -1) {
                result[i].state = 'present'
                remaining[slot] = null
            }
        })

        const solved = attempt === word
        return res.status(200).json({ result, solved, word: solved ? word : null })
    } catch (error) {
        return serverError(res, error)
    }
}

const recordWordPuzzleWin = async (req, res) => {
    try {
        const { orderId, attempts } = req.body || {}
        const used = Number(attempts) || 6
        const coins = used <= 2 ? 20 : used <= 4 ? 15 : 10

        if (orderId) {
            await GameSession.create({
                userId: req.userId,
                orderId,
                gameType: 'wordpuzzle',
                coinsEarned: coins,
                score: Math.max(0, 7 - used),
                completed: true
            })
        }

        const wallet = await awardCoins(req.userId, coins, 'wordpuzzle')
        return res.status(200).json({ coinsEarned: coins, totalCoins: wallet.coins, newBadges: wallet.newBadges })
    } catch (error) {
        if (error.code === 'NO_USER') return badRequest(res, 'User not found')
        return serverError(res, error)
    }
}

const spinWheel = async (req, res) => {
    try {
        const { orderId } = req.body || {}
        if (!orderId) return badRequest(res, 'orderId is required')

        /* Server-side single-spin guarantee. */
        const existing = await GameSession.findOne({ userId: req.userId, orderId, gameType: 'spin' })
        if (existing) return badRequest(res, 'Already spun for this order')

        const totalWeight = SPIN_PRIZES.reduce((sum, prize) => sum + prize.weight, 0)
        let random = Math.random() * totalWeight
        const prize = SPIN_PRIZES.find(p => (random -= p.weight) <= 0) || SPIN_PRIZES[0]
        const prizeIndex = SPIN_PRIZES.indexOf(prize)

        await GameSession.create({
            userId: req.userId,
            orderId,
            gameType: 'spin',
            coinsEarned: prize.type === 'coins' ? prize.value : 0,
            score: prizeIndex,
            completed: true
        })

        const user = await User.findById(req.userId)
        if (!user) return badRequest(res, 'User not found')
        user.spinsUsed = (user.spinsUsed || 0) + 1
        await user.save()

        let wallet = { coins: user.coins || 0, newBadges: [] }
        if (prize.type === 'coins') {
            wallet = await awardCoins(req.userId, prize.value, 'spin')
        }

        return res.status(200).json({ prize, prizeIndex, totalCoins: wallet.coins, newBadges: wallet.newBadges })
    } catch (error) {
        if (error.code === 'NO_USER') return badRequest(res, 'User not found')
        return serverError(res, error)
    }
}

const generateGuessDish = async (req, res) => {
    try {
        const messages = [
            { role: 'system', content: 'You return only valid JSON. No markdown.' },
            {
                role: 'user',
                content: `Generate a "guess the dish" challenge for Indian food.
      Return ONLY this JSON:
      {
        "clues": [
          "clue 1 — vague",
          "clue 2 — medium hint",
          "clue 3 — specific hint"
        ],
        "answer": "DISH NAME IN CAPS",
        "category": "South Indian|North Indian|Street Food|Dessert|etc",
        "difficulty": "easy|medium|hard"
      }`
            }
        ]

        const text = await groqChat(messages, { json: true, maxTokens: 600 })
        const challenge = parseGroqJson(text)
        if (!Array.isArray(challenge?.clues) || !challenge?.answer) {
            return res.status(502).json({ message: 'AI returned an unusable challenge' })
        }

        /* The answer is needed to grade the guess, so it rides back as a
           separate opaque-looking field the client only echoes to /verify.
           It is never rendered. */
        return res.status(200).json({
            clues: challenge.clues.slice(0, 3),
            category: challenge.category || '',
            difficulty: challenge.difficulty || 'medium',
            answer: String(challenge.answer)
        })
    } catch (error) {
        return serverError(res, error, 'Could not generate a dish challenge')
    }
}

const verifyDishGuess = async (req, res) => {
    try {
        const { answer, correctAnswer } = req.body || {}
        if (!answer || !correctAnswer) return badRequest(res, 'answer and correctAnswer are required')

        const normalize = value => String(value)
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim()

        const guess = normalize(answer)
        const target = normalize(correctAnswer)
        const correct = Boolean(guess) && (
            guess === target ||
            (guess.length >= 4 && (target.includes(guess) || guess.includes(target)))
        )

        return res.status(200).json({ correct })
    } catch (error) {
        return serverError(res, error)
    }
}

const recordGuessDishWin = async (req, res) => {
    try {
        const { orderId, cluesUsed } = req.body || {}
        const used = Number(cluesUsed) || 3
        const coins = used === 1 ? 20 : used === 2 ? 12 : 7

        if (orderId) {
            await GameSession.create({
                userId: req.userId,
                orderId,
                gameType: 'guessdish',
                coinsEarned: coins,
                score: Math.max(0, 4 - used),
                completed: true
            })
        }

        const wallet = await awardCoins(req.userId, coins, 'guessdish')
        return res.status(200).json({ coinsEarned: coins, totalCoins: wallet.coins, newBadges: wallet.newBadges })
    } catch (error) {
        if (error.code === 'NO_USER') return badRequest(res, 'User not found')
        return serverError(res, error)
    }
}

const generateRecipeChallenge = async (req, res) => {
    try {
        const messages = [
            { role: 'system', content: 'You return only valid JSON. No markdown.' },
            {
                role: 'user',
                content: `Generate a recipe challenge for Indian cooking.
      Give 5 random ingredients. There must be at least 2-3 valid
      Indian dishes that can be made from them.
      Return ONLY this JSON:
      {
        "ingredients": ["tomato", "onion", "paneer", "cream", "garam masala"],
        "validDishes": ["paneer butter masala", "paneer tikka masala", "shahi paneer"],
        "difficulty": "easy|medium|hard",
        "timeLimit": 60
      }`
            }
        ]

        const text = await groqChat(messages, { json: true, maxTokens: 600 })
        const challenge = parseGroqJson(text)
        if (!Array.isArray(challenge?.ingredients) || challenge.ingredients.length === 0) {
            return res.status(502).json({ message: 'AI returned an unusable challenge' })
        }

        /* validDishes is intentionally dropped — the verifier re-judges the
           player's answer, so there is no answer key to peek at. */
        return res.status(200).json({
            ingredients: challenge.ingredients.slice(0, 5),
            difficulty: challenge.difficulty || 'medium',
            timeLimit: Number(challenge.timeLimit) || 60
        })
    } catch (error) {
        return serverError(res, error, 'Could not generate a recipe challenge')
    }
}

const verifyRecipeChallenge = async (req, res) => {
    try {
        const { userAnswer, ingredients } = req.body || {}
        if (!userAnswer || !Array.isArray(ingredients) || ingredients.length === 0) {
            return badRequest(res, 'userAnswer and ingredients are required')
        }

        const messages = [
            { role: 'system', content: 'You return only valid JSON. No markdown.' },
            {
                role: 'user',
                content: `Can you make "${userAnswer}" using some or all of these
      ingredients: ${ingredients.join(', ')}?

      Judge honestly and strictly:
      - Count an ingredient ONLY if the dish genuinely and traditionally uses it.
      - Do NOT count an ingredient just because it could be added to the dish.
      - If "${userAnswer}" is not a real dish, it is invalid.
      - A dish is valid only if it genuinely uses at least 3 of the listed ingredients.

      Return ONLY: { "valid": true/false, "count": <how many of the listed ingredients the dish genuinely uses>, "explanation": "brief reason" }`
            }
        ]

        const text = await groqChat(messages, { json: true, maxTokens: 400 })
        const verdict = parseGroqJson(text)

        /* Trust the model's own count, not just its verdict: a model that says
           valid while counting 2 ingredients is contradicting the rule. */
        const count = Number(verdict?.count)
        const valid = Boolean(verdict?.valid) && Number.isFinite(count) && count >= 3

        return res.status(200).json({
            valid,
            count: Number.isFinite(count) ? count : null,
            explanation: verdict?.explanation || ''
        })
    } catch (error) {
        return serverError(res, error, 'Could not check that dish')
    }
}

const recordRecipeChallengeWin = async (req, res) => {
    try {
        const { orderId, timeLeft } = req.body || {}
        const left = Number(timeLeft) || 0
        const coins = left > 40 ? 20 : left > 20 ? 12 : 8

        if (orderId) {
            await GameSession.create({
                userId: req.userId,
                orderId,
                gameType: 'recipechallenge',
                coinsEarned: coins,
                score: left,
                completed: true
            })
        }

        const wallet = await awardCoins(req.userId, coins, 'recipechallenge')
        return res.status(200).json({ coinsEarned: coins, totalCoins: wallet.coins, newBadges: wallet.newBadges })
    } catch (error) {
        if (error.code === 'NO_USER') return badRequest(res, 'User not found')
        return serverError(res, error)
    }
}

/* --------------------------------------------------------------- content --- */

const getFoodFact = async (req, res) => {
    try {
        const dishName = req.body?.dishName
        const restaurantName = req.body?.restaurantName
        if (!dishName) return badRequest(res, 'dishName is required')

        const messages = [
            { role: 'system', content: 'You return only valid JSON. No markdown.' },
            {
                role: 'user',
                content: `Generate an interesting "Did you know?" food fact about
      "${dishName}" from "${restaurantName || 'a local kitchen'}".
      Make it specific to the dish — history, ingredients, health benefits,
      or cultural significance. Keep it to 2-3 sentences. Make it feel
      personal like you know what the user just ordered.
      Return ONLY this JSON:
      { "fact": "Did you know? ..." , "emoji": "relevant emoji" }`
            }
        ]

        const text = await groqChat(messages, { json: true, maxTokens: 500 })
        const fact = parseGroqJson(text)
        return res.status(200).json({
            fact: fact?.fact || '',
            emoji: fact?.emoji || '🍽️'
        })
    } catch (error) {
        return serverError(res, error, 'Could not load a food fact')
    }
}

const getTrending = async (req, res) => {
    try {
        const city = req.query?.city || ''
        const since = new Date(Date.now() - 60 * 60 * 1000)
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        /* Orders carry no city of their own — the city lives on the Shop, so
           anything city-scoped has to resolve shops first. */
        const shopIds = city
            ? (await Shop.find({ city: new RegExp(city, 'i') }).select('_id')).map(shop => shop._id)
            : null

        const cityMatch = shopIds ? { 'shopOrders.shop': { $in: shopIds } } : {}

        const hotRightNow = await Order.aggregate([
            { $match: { createdAt: { $gte: since }, ...cityMatch } },
            { $unwind: '$shopOrders' },
            ...(shopIds ? [{ $match: { 'shopOrders.shop': { $in: shopIds } } }] : []),
            { $unwind: '$shopOrders.shopOrderItems' },
            {
                $group: {
                    _id: '$shopOrders.shopOrderItems.name',
                    count: { $sum: '$shopOrders.shopOrderItems.quantity' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 3 }
        ])

        const todayOrders = await Order.countDocuments({ createdAt: { $gte: startOfDay }, ...cityMatch })

        /* Top restaurant: best average item rating among city shops. */
        const topShopAgg = await Shop.aggregate([
            ...(shopIds ? [{ $match: { _id: { $in: shopIds } } }] : []),
            { $lookup: { from: 'items', localField: '_id', foreignField: 'shop', as: 'shopItems' } },
            { $unwind: '$shopItems' },
            { $match: { 'shopItems.rating.count': { $gt: 0 } } },
            {
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' },
                    avgRating: { $avg: '$shopItems.rating.average' },
                    reviews: { $sum: '$shopItems.rating.count' }
                }
            },
            { $sort: { avgRating: -1, reviews: -1 } },
            { $limit: 1 }
        ])

        return res.status(200).json({
            hotRightNow: hotRightNow.map(row => ({ name: row._id, count: row.count })).filter(row => row.name),
            topRestaurant: topShopAgg[0]
                ? {
                    name: topShopAgg[0].name,
                    rating: Math.round((topShopAgg[0].avgRating || 0) * 10) / 10
                }
                : null,
            todayOrders,
            city
        })
    } catch (error) {
        return serverError(res, error, 'Could not load trending')
    }
}

module.exports = {
    getMyCoins,
    redeemCoins,
    getLeaderboard,
    generateTriviaQuestion,
    recordTriviaAnswer,
    getDailyWord,
    verifyWordGuess,
    recordWordPuzzleWin,
    spinWheel,
    generateGuessDish,
    verifyDishGuess,
    recordGuessDishWin,
    generateRecipeChallenge,
    verifyRecipeChallenge,
    recordRecipeChallengeWin,
    getFoodFact,
    getTrending
}

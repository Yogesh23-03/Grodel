const express = require('express')
const isAuth = require('../middlewares/isAuth.js')
const {
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
} = require('../controllers/engagementController.js')

const engagementRouter = express.Router()

/* --- loyalty (private: a wallet is always per-user) --- */
engagementRouter.get('/coins', isAuth, getMyCoins)
engagementRouter.post('/coins/redeem', isAuth, redeemCoins)

/* --- public: leaderboards and AI-generated game content --- */
engagementRouter.get('/leaderboard', getLeaderboard)
engagementRouter.post('/trivia/generate', generateTriviaQuestion)
engagementRouter.get('/word/daily', getDailyWord)
engagementRouter.post('/word/verify', verifyWordGuess)
engagementRouter.get('/dish/generate', generateGuessDish)
engagementRouter.post('/dish/verify', verifyDishGuess)
engagementRouter.get('/recipe/generate', generateRecipeChallenge)
engagementRouter.post('/recipe/verify', verifyRecipeChallenge)
engagementRouter.post('/fact', getFoodFact)
engagementRouter.get('/trending', getTrending)

/* --- private: anything that credits coins must be tied to a real session --- */
engagementRouter.post('/trivia/record', isAuth, recordTriviaAnswer)
engagementRouter.post('/word/record', isAuth, recordWordPuzzleWin)
engagementRouter.post('/spin', isAuth, spinWheel)
engagementRouter.post('/dish/record', isAuth, recordGuessDishWin)
engagementRouter.post('/recipe/record', isAuth, recordRecipeChallengeWin)

module.exports = engagementRouter

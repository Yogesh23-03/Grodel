import axios from 'axios'
import { serverUrl } from '../../App'

/*
 * One place for every /api/engagement call, so the ten game components stay
 * about game logic rather than URL string building.
 *
 * `serverUrl` is read inside the functions, never at module scope: App.jsx
 * exports it and also (transitively) imports the tracking page, so evaluating
 * it at import time hits the circular-import temporal dead zone.
 */
const base = () => `${serverUrl}/api/engagement`

const get = (path, params) => axios.get(`${base()}${path}`, { params, withCredentials: true })
const post = (path, body) => axios.post(`${base()}${path}`, body, { withCredentials: true })

export const engagementApi = {
  /* wallet */
  getWallet: () => get('/coins'),
  redeem: amount => post('/coins/redeem', { amount }),
  leaderboard: type => get('/leaderboard', { type, limit: 10 }),

  /* trivia */
  generateTrivia: (difficulty, topic, usedQuestions) => post('/trivia/generate', { difficulty, topic, usedQuestions }),
  recordTrivia: (orderId, correct, difficulty) => post('/trivia/record', { orderId, correct, difficulty }),

  /* food wordle — the word itself never crosses this boundary */
  dailyWord: () => get('/word/daily'),
  verifyWord: (date, guess) => post('/word/verify', { date, guess }),
  recordWordWin: (orderId, attempts) => post('/word/record', { orderId, attempts }),

  /* spin */
  spin: orderId => post('/spin', { orderId }),

  /* guess the dish */
  generateDish: () => get('/dish/generate'),
  verifyDish: (answer, correctAnswer) => post('/dish/verify', { answer, correctAnswer }),
  recordDishWin: (orderId, cluesUsed) => post('/dish/record', { orderId, cluesUsed }),

  /* recipe challenge */
  generateRecipe: () => get('/recipe/generate'),
  verifyRecipe: (userAnswer, ingredients) => post('/recipe/verify', { userAnswer, ingredients }),
  recordRecipeWin: (orderId, timeLeft) => post('/recipe/record', { orderId, timeLeft }),

  /* content */
  foodFact: (dishName, restaurantName) => post('/fact', { dishName, restaurantName }),
  trending: city => get('/trending', { city })
}

/*
 * Groq can be slow on a cold cache. Every game screen needs the same three
 * states, so they share one tiny state machine instead of re-deriving it.
 */
export const readError = error =>
  error?.response?.data?.message || error?.message || 'error'

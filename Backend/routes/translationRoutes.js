const express = require('express')
const { translateBatch } = require('../controllers/translationController')

const router = express.Router()

router.post('/translate/batch', translateBatch)

module.exports = router

const mongoose = require('mongoose')

const translationCacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  sourceText: { type: String, required: true },
  translations: { type: Map, of: String, default: {} }
}, { timestamps: true })

const TranslationCache = mongoose.models.TranslationCache || mongoose.model('TranslationCache', translationCacheSchema)

function unflatten(obj) {
  const result = {}
  for (const key in obj) {
    const keys = key.split('.')
    keys.reduce((acc, part, i) => {
      if (i === keys.length - 1) acc[part] = obj[key]
      else acc[part] = acc[part] || {}
      return acc[part]
    }, result)
  }
  return result
}

async function translateText(value, targetLang) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY

  if (apiKey) {
    try {
      const params = new URLSearchParams({
        key: apiKey,
        q: value,
        source: 'en',
        target: targetLang,
        format: 'text'
      })

      const response = await fetch(`https://translation.googleapis.com/language/translate/v2?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        const translated = data?.data?.translations?.[0]?.translatedText
        if (translated) return translated
      }
    } catch (err) {
      console.log('Google Cloud Translate API failed, trying fallback:', err.message)
    }
  }

  // Free Google Translate endpoint fallback (no API key needed)
  try {
    const fallbackRes = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(value)}`
    )
    if (fallbackRes.ok) {
      const fallbackData = await fallbackRes.json()
      if (fallbackData?.[0]) {
        const fullTranslation = fallbackData[0].map(item => item?.[0] || '').join('')
        if (fullTranslation) return fullTranslation
      }
    }
  } catch (fallbackErr) {
    console.log('Free translation fallback failed:', fallbackErr.message)
  }

  return value
}

exports.translateBatch = async (req, res) => {
  try {
    const { texts, targetLang } = req.body

    if (!Array.isArray(texts) || !targetLang) {
      return res.status(400).json({ message: 'texts and targetLang are required' })
    }

    const translationsFlat = {}

    for (const item of texts) {
      const { key, value } = item

      if (!key || typeof value !== 'string') {
        continue
      }

      try {
        const cached = await TranslationCache.findOne({
          key,
          [`translations.${targetLang}`]: { $exists: true }
        })

        if (cached?.translations?.get(targetLang)) {
          translationsFlat[key] = cached.translations.get(targetLang)
          continue
        }

        const translatedText = await translateText(value, targetLang)

        await TranslationCache.findOneAndUpdate(
          { key },
          { $set: { [`translations.${targetLang}`]: translatedText, sourceText: value } },
          { upsert: true, new: true }
        )

        translationsFlat[key] = translatedText
      } catch (itemErr) {
        translationsFlat[key] = value
      }
    }

    res.json({ translations: unflatten(translationsFlat) })
  } catch (error) {
    console.log('translateBatch error:', error.message)
    res.json({ translations: {} })
  }
}


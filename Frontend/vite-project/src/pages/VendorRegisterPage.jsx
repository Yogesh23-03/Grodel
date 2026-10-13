import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { serverUrl } from '../App'
import { setUserData } from '../redux/userSlice'
import {
  FaMicrophone, FaCamera, FaArrowLeft, FaCheck, FaVolumeHigh,
  FaHandshake, FaRotateLeft, FaStore, FaPlus, FaCircleExclamation,
  FaBasketShopping, FaIndianRupeeSign, FaClipboardCheck
} from 'react-icons/fa6'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'
import { useAudioInstructions } from '../hooks/useAudioInstructions.js'
import { useLanguage } from '../context/LanguageContext.jsx'

const VENDOR_LANGS = [
  { code: 'en', label: 'English' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'hi', label: 'हिन्दी' }
]

const TOTAL_STEPS = 6
const UNITS = ['kg', 'g', 'dozen', 'bundle', 'piece', 'litre']

function VendorRegisterPage() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { setLanguage: setAppLanguage } = useLanguage()
  const { userData } = useSelector((state) => state.user)

  const [language, setLanguage] = useState(() => userData?.preferredLanguage || localStorage.getItem('grodel_lang') || 'kn')
  const { speakText, stopSpeaking } = useAudioInstructions()
  const { transcript, isListening, error: speechError, startListening, stopListening, resetTranscript } = useSpeechRecognition(language)

  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    phone: userData?.mobile || '',
    fullName: userData?.fullName || '',
    products: '',
    landmark: '',
    price: ''
  })
  const [unit, setUnit] = useState('kg')
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const spokenStep = useRef(-1)

  /* One question per screen, in the order an illiterate vendor can answer them. */
  const questions = useMemo(() => ([
    { key: 'phone', kind: 'tel', required: true, ask: t('vendor.askPhone'), placeholder: t('vendor.enterPhoneNumber') },
    { key: 'fullName', kind: 'text', required: true, ask: t('vendor.askName'), placeholder: t('vendor.vendorName') },
    { key: 'products', kind: 'text', required: true, ask: t('vendor.askProducts'), placeholder: t('vendor.productName') },
    { key: 'landmark', kind: 'text', required: false, ask: t('vendor.askLandmark'), placeholder: t('vendor.landmark') },
    { key: 'photo', kind: 'photo', required: false, ask: t('vendor.askPhoto'), placeholder: '' },
    { key: 'price', kind: 'price', required: false, ask: t('vendor.askPrice', { item: form.products || unit }), placeholder: t('vendor.speakInstruction') }
  ]), [t, form.products, unit])

  const current = questions[step]

  /* Every question is read out loud as soon as it appears. */
  useEffect(() => {
    if (result) return
    if (spokenStep.current === step) return
    spokenStep.current = step
    speakText(questions[step]?.ask || '', language)
  }, [step, result, questions, language])

  const listen = () => {
    stopSpeaking()
    setError('')
    resetTranscript()
    startListening()
  }

  const say = (text) => speakText(text, language)

  /* A spoken answer fills the field, is read back, and moves the flow on. */
  useEffect(() => {
    if (!transcript || isListening || result) return
    const question = questions[step]
    if (!question || question.kind === 'photo') return
    const heard = String(transcript).trim()

    if (question.kind === 'tel') {
      const digits = heard.replace(/\D/g, '')
      setForm((prev) => ({ ...prev, phone: digits || heard }))
      say(digits || heard)
    } else if (question.kind === 'price') {
      axios.post(`${serverUrl}/api/vendor/parse-voice-price`, { transcript: heard, language })
        .then((res) => setForm((prev) => ({ ...prev, price: res.data?.price ? String(res.data.price) : heard })))
        .catch(() => setForm((prev) => ({ ...prev, price: heard })))
      say(heard)
    } else {
      setForm((prev) => ({ ...prev, [question.key]: heard }))
      say(heard)
    }

    resetTranscript()
    window.setTimeout(() => setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1)), 700)
  }, [transcript, isListening, step, language, result, questions])

  const savePhoto = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
    setAnalysis(null)
    setError('')
  }

  const analysePhoto = async () => {
    if (!photo) return setError(t('vendor.noPhoto'))
    setPhotoBusy(true)
    setError('')
    stopSpeaking()
    try {
      const data = new FormData()
      data.append('image', photo)
      const res = await axios.post(`${serverUrl}/api/vendor/analyse-photo`, data, { withCredentials: true })
      const suggestion = res.data?.aiSuggestion || {}
      setAnalysis(suggestion)
      if (suggestion.unit) setUnit(UNITS.includes(suggestion.unit) ? suggestion.unit : 'kg')
      setForm((prev) => ({
        ...prev,
        products: prev.products || suggestion.name || '',
        price: prev.price || (suggestion.suggestedPrice ? String(suggestion.suggestedPrice) : '')
      }))
      const said = suggestion.suggestedPrice
        ? t('vendor.photoSaid', { name: suggestion.name || '', price: suggestion.suggestedPrice, unit: suggestion.unit || 'kg' })
        : t('vendor.photoNoPrice', { name: suggestion.name || '' })
      say(said)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setPhotoBusy(false)
    }
  }

  const submit = async () => {
    setBusy(true)
    setError('')
    stopSpeaking()
    const numericPrice = /^\d+(\.\d+)?$/.test(String(form.price).trim())
    try {
      const res = await axios.post(`${serverUrl}/api/vendor/register/voice`, {
        transcript: numericPrice ? '' : form.price,
        phoneNumber: form.phone,
        fullName: form.fullName,
        products: form.products,
        landmark: form.landmark,
        price: numericPrice ? form.price : '',
        unit,
        preferredLanguage: language
      }, { withCredentials: true })
      const data = res.data || {}
      setResult(data)
      /* The join itself signs the vendor in, but Redux still holds the old
         customer account — the /vendor pages are role guarded, so update it. */
      if (data.user) dispatch(setUserData({ ...(userData || {}), ...data.user }))
      const opening = data.created ? t('vendor.youAreIn') : t('vendor.youWereIn')
      const directions = data.directions || []
      speakText([opening, ...directions].join(' '), language)
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('vendor.voiceCommandFailed'))
    } finally {
      setBusy(false)
    }
  }

  const next = () => {
    if (!current) return
    const value = String(form[current.key] || '').trim()
    if (current.required && !value) return setError(t('vendor.answerNeeded'))
    if (current.key === 'phone' && value.replace(/\D/g, '').length < 10) return setError(t('vendor.phoneNeeded'))
    setError('')
    resetTranscript()
    stopSpeaking()
    if (step < TOTAL_STEPS - 1) setStep(step + 1)
    else submit()
  }

  const back = () => {
    setError('')
    resetTranscript()
    stopSpeaking()
    setStep((prev) => Math.max(0, prev - 1))
  }

  const repeat = () => {
    resetTranscript()
    say(current?.ask || '')
  }

  const directions = result?.directions || []
  const runShopSteps = [
    t('vendor.directionOpen'),
    t('vendor.directionAdd'),
    t('vendor.directionPrice'),
    t('vendor.directionOrders'),
    t('vendor.directionEarnings')
  ]

  /* ------------------------------- Success ------------------------------- */
  if (result) {
    return (
      <div className='w-full min-h-screen bg-[#fff9f6]'>
        <header className='glass-dark w-full flex items-center gap-3 px-4 py-3 text-white'>
          <button className='flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full text-sm' onClick={() => navigate('/')}>
            <FaArrowLeft />
            <span>{t('common.back')}</span>
          </button>
          <span className='font-black text-white text-xl'>GroDel <span className='text-[#ff4d2d]'>Fresh</span></span>
        </header>

        <div className='max-w-3xl mx-auto px-4 py-8'>
          <div className='glass-card border border-gray-100 p-8 text-center card-3d'>
            <FaCheck className='text-[#ff4d2d] text-5xl mx-auto' />
            <h1 className='text-2xl font-bold text-green-600 mt-3'>
              {result.created ? t('vendor.youAreIn') : t('vendor.youWereIn')}
            </h1>
            <button
              className='glass-dark inline-flex items-center gap-2 mt-3 text-white px-5 py-2.5 rounded-full text-sm font-semibold'
              onClick={() => say([t('vendor.youAreIn'), ...directions].join(' '))}
            >
              <FaVolumeHigh /> {t('vendor.hearDirections')}
            </button>

            {result.created && result.credentials ? (
              <div className='bg-gray-50 rounded-xl p-4 text-left mt-5'>
                <p className='text-xs uppercase tracking-wide font-semibold text-gray-500'>{t('vendor.loginDetails')}</p>
                <p className='text-sm font-semibold text-gray-600 mt-2'>{t('vendor.loginEmail')}</p>
                <p className='font-mono break-all'>{result.credentials.email}</p>
                <p className='text-sm font-semibold text-gray-600 mt-2'>{t('vendor.loginPassword')}</p>
                <p className='font-mono'>{result.credentials.password}</p>
                <p className='text-gray-400 text-xs mt-2'>{t('vendor.shopReadyHint')}</p>
              </div>
            ) : null}

            <div className='flex flex-wrap justify-center gap-3 mt-6'>
              <button className='btn-glow inline-flex items-center gap-2 px-6 py-3' onClick={() => navigate('/vendor/dashboard')}>
                <FaStore /> {t('vendor.openMyShop')}
              </button>
              <button className='glass-dark inline-flex items-center gap-2 text-white px-6 py-3 rounded-full font-semibold' onClick={() => navigate('/vendor/add-produce')}>
                <FaPlus /> {t('vendor.addFirstProduct')}
              </button>
            </div>
          </div>

          <section className='glass-card border border-gray-100 p-6 mt-5 card-3d'>
            <h2 className='text-lg font-bold text-[#07111c]'>{t('vendor.directionsTitle')}</h2>
            <p className='text-gray-500 text-sm mt-1'>{t('vendor.voiceBarHint')}</p>
            <ol className='mt-4 space-y-3'>
              {runShopSteps.map((line, index) => (
                <li key={line} className='flex items-start gap-3 stagger-item' style={{ animationDelay: `${index * 80}ms` }}>
                  <span className='shrink-0 h-7 w-7 rounded-full bg-[#ff4d2d]/10 text-[#ff4d2d] font-bold flex items-center justify-center text-sm'>{index + 1}</span>
                  <span className='text-gray-700 text-sm'>{line}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    )
  }

  /* -------------------------------- The flow -------------------------------- */
  return (
    <div className='w-full min-h-screen bg-[#fff9f6]'>
      <header className='glass-dark w-full flex items-center gap-3 px-4 py-3 text-white'>
        <button className='flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full text-sm' onClick={() => navigate('/vendor-portal')}>
          <FaArrowLeft />
          <span>{t('vendor.back')}</span>
        </button>
        <span className='font-black text-white text-xl'>GroDel <span className='text-[#ff4d2d]'>Fresh</span></span>
      </header>

      <div className='max-w-3xl mx-auto px-4 py-6'>
        <h1 className='text-2xl sm:text-3xl font-bold text-[#07111c]'>{t('vendor.joinTitle')}</h1>
        <p className='text-gray-500 mt-2'>{t('vendor.joinIntro')}</p>

        <div className='flex flex-wrap gap-2 mt-4'>
          {VENDOR_LANGS.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code)
                setAppLanguage(lang.code)
                resetTranscript()
                spokenStep.current = -1
              }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${language === lang.code ? 'bg-[#ff4d2d] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#ff4d2d]'}`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {userData?.role === 'vendor' ? (
          <div className='glass-card border border-gray-100 p-4 mt-5 flex flex-wrap items-center justify-between gap-3 card-3d'>
            <p className='text-gray-600 text-sm'>{t('vendor.youWereIn')}</p>
            <button className='glass-dark inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-full text-sm font-semibold' onClick={() => navigate('/vendor/dashboard')}>
              <FaStore /> {t('vendor.openMyShop')}
            </button>
          </div>
        ) : null}

        {/* Progress */}
        <div className='mt-5'>
          <div className='flex items-center justify-between text-xs font-semibold text-gray-500'>
            <span>{t('vendor.stepOf', { current: step + 1, total: TOTAL_STEPS })}</span>
            <span>{Math.round(((step + 1) / TOTAL_STEPS) * 100)}%</span>
          </div>
          <div className='h-2 bg-gray-200 rounded-full mt-2 overflow-hidden'>
            <div className='h-full bg-[#ff4d2d] transition-all' style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        {/* The question card */}
        <div className='glass-card border border-gray-100 p-6 mt-5 card-3d'>
          <div className='flex items-start gap-3'>
            {current?.kind === 'photo'
              ? <FaCamera className='text-[#ff4d2d] text-3xl shrink-0' />
              : <FaMicrophone className='text-[#ff4d2d] text-3xl shrink-0' />}
            <h2 className='text-xl font-bold text-[#07111c]'>{current?.ask}</h2>
          </div>

          <div className='flex flex-wrap items-center gap-2 mt-4'>
            <button
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-full font-semibold ${isListening ? 'bg-red-500 text-white' : 'bg-[#ff4d2d] text-white'}`}
              onClick={isListening ? stopListening : listen}
            >
              <FaMicrophone /> {isListening ? t('vendor.listeningNow') : t('vendor.tapToAnswer')}
            </button>
            <button className='inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-3 rounded-full text-sm font-semibold' onClick={repeat}>
              <FaVolumeHigh /> {t('vendor.speakAnswer')}
            </button>
          </div>
          {speechError && <p className='text-red-500 text-xs mt-2'>{speechError}</p>}

          {/* Answer field — always available so a helper can type too */}
          {current?.key !== 'photo' && (
            <div className='mt-4'>
              <label className='text-xs uppercase tracking-wide font-semibold text-gray-500'>
                {current?.kind === 'price' ? t('vendor.speakPrice') : t('vendor.orType')}
              </label>
              <div className='flex items-center gap-2 mt-1'>
                <input
                  type={current?.kind === 'tel' ? 'tel' : current?.kind === 'price' ? 'number' : 'text'}
                  inputMode={current?.kind === 'tel' ? 'numeric' : 'text'}
                  value={form[current?.key] || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [current.key]: e.target.value }))}
                  placeholder={current?.placeholder}
                  className='glass-input w-full text-lg'
                />
                {current?.kind === 'price' && (
                  <select value={unit} onChange={(e) => setUnit(e.target.value)} className='glass-input'>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                )}
              </div>
              {current?.key === 'phone' && (
                <p className='text-gray-400 text-xs mt-1'>{String(form.phone || '').replace(/\D/g, '').length}/10</p>
              )}
            </div>
          )}

          {/* Photo step */}
          {current?.key === 'photo' && (
            <div className='mt-4'>
              <input type='file' accept='image/*' capture='environment' onChange={savePhoto} className='glass-input w-full p-2' />
              {preview && <img src={preview} alt={t('vendor.takeShopPhoto')} className='mt-3 h-40 w-full object-cover rounded-xl' />}
              <button
                className='glass-dark inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-full text-sm font-semibold mt-3 disabled:opacity-50'
                onClick={analysePhoto}
                disabled={!photo || photoBusy}
              >
                <FaCamera /> {photoBusy ? t('vendor.photoReading') : t('vendor.analyse')}
              </button>
              {analysis && (
                <div className='mt-3 bg-gray-50 rounded-lg p-3'>
                  <p className='font-semibold text-[#ff4d2d]'>{analysis.name}</p>
                  <p className='text-gray-500 text-xs'>
                    {analysis.category} · {analysis.unit}
                    {analysis.suggestedPrice ? ` · ₹${analysis.suggestedPrice}` : ''}
                  </p>
                  {analysis.freshnessNote ? <p className='text-gray-500 text-xs mt-1'>{analysis.freshnessNote}</p> : null}
                </div>
              )}
            </div>
          )}

          {/* What has been heard so far */}
          <div className='flex flex-wrap gap-2 mt-5'>
            {form.phone ? <span className='badge bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full'>{form.phone}</span> : null}
            {form.fullName ? <span className='badge bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full'>{form.fullName}</span> : null}
            {form.products ? <span className='badge bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full'>{form.products}</span> : null}
            {form.landmark ? <span className='badge bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full'>{form.landmark}</span> : null}
            {form.price ? <span className='badge bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full'>₹{form.price}/{unit}</span> : null}
          </div>

          <div className='flex flex-wrap items-center gap-3 mt-6'>
            <button className='btn-glow px-7 py-3 disabled:opacity-60' onClick={next} disabled={busy}>
              <FaCheck className='inline-block mr-2' />
              {step === TOTAL_STEPS - 1 ? (busy ? t('vendor.processingVoice') : t('vendor.registerVendor')) : t('vendor.nextStep')}
            </button>
            {step > 0 && (
              <button className='inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-5 py-3 rounded-full text-sm font-semibold' onClick={back}>
                <FaRotateLeft /> {t('vendor.backStep')}
              </button>
            )}
            {step === 0 && (
              <button className='inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-5 py-3 rounded-full text-sm font-semibold' onClick={() => navigate('/helper/register-vendor')}>
                <FaHandshake /> {t('vendor.helperRegister')}
              </button>
            )}
          </div>

          {error && (
            <p className='flex items-center gap-2 text-red-500 text-sm mt-4'>
              <FaCircleExclamation /> {error}
            </p>
          )}
        </div>

        {/* Directions the vendor will follow to run the shop */}
        <section className='glass-card border border-gray-100 p-6 mt-5 card-3d'>
          <h2 className='flex items-center gap-2 text-lg font-bold text-[#07111c]'>
            <FaClipboardCheck className='text-[#ff4d2d]' /> {t('vendor.directionsTitle')}
          </h2>
          <div className='grid sm:grid-cols-2 gap-3 mt-4'>
            <p className='flex items-start gap-2 text-sm text-gray-600'><FaMicrophone className='text-[#ff4d2d] mt-0.5 shrink-0' /> {t('vendor.directionOpen')}</p>
            <p className='flex items-start gap-2 text-sm text-gray-600'><FaCamera className='text-[#ff4d2d] mt-0.5 shrink-0' /> {t('vendor.directionAdd')}</p>
            <p className='flex items-start gap-2 text-sm text-gray-600'><FaIndianRupeeSign className='text-[#ff4d2d] mt-0.5 shrink-0' /> {t('vendor.directionPrice')}</p>
            <p className='flex items-start gap-2 text-sm text-gray-600'><FaBasketShopping className='text-[#ff4d2d] mt-0.5 shrink-0' /> {t('vendor.directionOrders')}</p>
          </div>
          <p className='text-gray-400 text-xs mt-3'>{t('vendor.directionEarnings')}</p>
        </section>
      </div>
    </div>
  )
}

export default VendorRegisterPage

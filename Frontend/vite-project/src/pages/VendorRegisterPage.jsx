import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { serverUrl } from '../App'
import { FaMicrophone, FaCamera, FaWhatsapp, FaHandshake, FaArrowLeft, FaQrcode, FaCheck } from 'react-icons/fa6'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'
import { useLanguage } from '../context/LanguageContext.jsx'

const VENDOR_LANGS = [
  { code: 'en', label: 'English' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'hi', label: 'हिन्दी' }
]

function VendorRegisterPage() {
  const { t } = useTranslation()
  const { setLanguage: setAppLanguage } = useLanguage()
  const navigate = useNavigate()
  const { userData } = useSelector((state) => state.user)

  const [language, setLanguage] = useState('kn')
  const { transcript, isListening, error: speechError, startListening, stopListening, resetTranscript } = useSpeechRecognition(language)

  const [phone, setPhone] = useState(userData?.mobile || '')
  const [editableTranscript, setEditableTranscript] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [registeredUser, setRegisteredUser] = useState(null)

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoAi, setPhotoAi] = useState(null)
  const [photoProcessing, setPhotoProcessing] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState(null)

  useEffect(() => {
    if (transcript) setEditableTranscript(transcript)
  }, [transcript])

  useEffect(() => {
    axios.get(`${serverUrl}/api/vendor/whatsapp-info`, { withCredentials: true })
      .then((res) => setWhatsappNumber(res.data?.number))
      .catch(() => setWhatsappNumber(null))
  }, [])

  const waDigits = (whatsappNumber || '').replace(/\D/g, '')

  const handleVoiceRegister = async () => {
    if (!phone) {
      setError(t('vendor.enterPhoneNumber'))
      return
    }
    setProcessing(true)
    setError('')
    try {
      const res = await axios.post(
        `${serverUrl}/api/vendor/register/voice`,
        { transcript: editableTranscript, phoneNumber: phone, preferredLanguage: language },
        { withCredentials: true }
      )
      setRegisteredUser({ email: res.data?.user?.email, password: res.data?.user?.mobile })
    } catch (err) {
      setError(err.response?.data?.message || t('common.loading'))
    } finally {
      setProcessing(false)
    }
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoAi(null)
  }

  const handleAnalysePhoto = async () => {
    if (!photoFile) return
    setPhotoProcessing(true)
    setError('')
    try {
      const form = new FormData()
      form.append("image", photoFile)
      const res = await axios.post(`${serverUrl}/api/vendor/analyse-photo`, form, { withCredentials: true })
      setPhotoAi(res.data?.aiSuggestion)
      const name = res.data?.aiSuggestion?.name
      if (name && !editableTranscript.includes(name)) {
        setEditableTranscript(`my name ${name} near ${phone}`)
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('common.loading'))
    } finally {
      setPhotoProcessing(false)
    }
  }

  return (
    <div className='w-full min-h-screen bg-[#fff9f6]'>
      <header className='w-full flex items-center px-4 py-3 bg-[#07111c] text-white'>
        <button className='flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full text-sm' onClick={() => navigate('/vendor-portal')}>
          <FaArrowLeft />
          <span>{t('vendor.back')}</span>
        </button>
        <span className='ml-3 font-black text-white text-xl'>GroDel <span className='text-[#ff4d2d]'>Fresh</span></span>
      </header>

      <div className='max-w-5xl mx-auto px-4 py-8'>
        <h1 className='text-3xl font-bold text-[#07111c]'>{t('vendor.joinButton')}</h1>
        <p className='text-gray-500 mt-2'>{t('vendor.chooseMethod')}</p>

        <div className='flex flex-wrap gap-2 mt-4'>
          {VENDOR_LANGS.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code)
                setAppLanguage(lang.code)
                resetTranscript()
                setEditableTranscript('')
              }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${language === lang.code ? 'bg-[#ff4d2d] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#ff4d2d]'}`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {registeredUser ? (
  <div className='bg-white shadow-lg rounded-2xl border border-gray-100 p-8 text-center mt-8'>
    <FaCheck className='text-[#ff4d2d] text-5xl mx-auto' />
    <h2 className='text-2xl font-bold text-green-600 mt-3'>{t('vendor.registrationSuccess')}</h2>
    <p className='text-gray-500 mt-2'>{t('vendor.loginHint')}</p>
    <div className='bg-gray-50 rounded-xl p-4 text-left mt-4'>
      <p className='text-sm font-semibold text-gray-600'>{t('vendor.loginEmail')}</p>
      <p className='font-mono break-all'>{registeredUser.email}</p>
      <p className='text-sm font-semibold text-gray-600 mt-2'>{t('vendor.loginPassword')}</p>
      <p className='font-mono'>{registeredUser.password}</p>
    </div>
    <button className='bg-[#ff4d2d] text-white px-7 py-3 rounded-full font-semibold mt-5' onClick={() => navigate('/signin')}>
      {t('vendor.goToLogin')}
    </button>
  </div>
) : (
  <div className='grid grid-cols-1 md:grid-cols-2 gap-5 mt-6'>

    {/* CARD 1 — Voice */}
    <div className='bg-white shadow-lg rounded-2xl border border-gray-100 p-6'>
      <FaMicrophone className='text-[#ff4d2d] text-3xl' />
      <h2 className='text-lg font-bold text-[#07111c] mt-2'>{t('vendor.voiceRegister')}</h2>
      <p className='text-gray-500 text-sm mt-1'>{t('vendor.speakRegistration')}</p>
      <input
        type='tel'
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder={t('vendor.enterPhoneNumber')}
        className='w-full border border-gray-200 rounded-lg px-3 py-2 mt-3'
      />
      <textarea
        value={editableTranscript}
        onChange={(e) => setEditableTranscript(e.target.value)}
        rows={3}
        className='w-full border border-gray-200 rounded-lg px-3 py-2 mt-3'
      />
      <div className='flex flex-wrap gap-2 mt-3'>
        {isListening ? (
          <button className='bg-red-500 text-white px-4 py-2 rounded-full text-sm' onClick={stopListening}>
            {t('vendor.listening')}
          </button>
        ) : (
          <button className='bg-[#ff4d2d] text-white px-4 py-2 rounded-full text-sm' onClick={() => { setError(''); resetTranscript(); startListening(); }}>
            <FaMicrophone className='inline-block mr-1' /> {t('vendor.tapToSpeak')}
          </button>
        )}
        <button className='bg-[#07111c] text-white px-4 py-2 rounded-full text-sm' onClick={handleVoiceRegister} disabled={processing}>
          {processing ? t('vendor.processingVoice') : t('vendor.registerVendor')}
        </button>
      </div>
      {speechError && <p className='text-red-500 text-xs mt-2'>{speechError}</p>}
    </div>

    {/* CARD 2 — Photo */}
    <div className='bg-white shadow-lg rounded-2xl border border-gray-100 p-6'>
      <FaCamera className='text-[#ff4d2d] text-3xl' />
      <h2 className='text-lg font-bold text-[#07111c] mt-2'>{t('vendor.photoListing')}</h2>
      <p className='text-gray-500 text-sm mt-1'>{t('vendor.photoHelp')}</p>
      {userData?.role === 'vendor' ? (
        <>
          <input type='file' accept='image/*' capture='environment' onChange={handlePhotoChange} className='w-full border border-gray-200 rounded-lg p-2 mt-3' />
          {photoPreview && <img src={photoPreview} alt={t('vendor.takeShopPhoto')} className='mt-3 h-36 w-full object-cover rounded-xl' />}
          {photoAi && (
            <div className='mt-3 bg-gray-50 rounded-lg p-3'>
              <p className='font-semibold text-[#ff4d2d]'>{photoAi.name}</p>
              <p className='text-gray-500 text-xs'>{photoAi.category} · {photoAi.unit}</p>
            </div>
          )}
          <button className='bg-[#ff4d2d] text-white px-4 py-2 rounded-full text-sm mt-3' onClick={handleAnalysePhoto} disabled={!photoFile || photoProcessing}>
            {photoProcessing ? t('vendor.analysing') : t('vendor.analyse')}
          </button>
        </>
      ) : (
        <p className='text-gray-400 text-sm mt-3'>{t('vendor.needVendorAccount')}</p>
      )}
    </div>

    {/* CARD 3 — Helper */}
    <div className='bg-white shadow-lg rounded-2xl border border-gray-100 p-6'>
      <FaHandshake className='text-[#ff4d2d] text-3xl' />
      <h2 className='text-lg font-bold text-[#07111c] mt-2'>{t('vendor.helperRegister')}</h2>
      <p className='text-gray-500 text-sm mt-1'>{t('vendor.helperRegistrationSubtitle')}</p>
      <div className='mt-3 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4'>
        <FaQrcode className='text-[#ff4d2d] text-5xl' />
      </div>
      <p className='text-gray-400 text-xs mt-2'>{t('vendor.scanToRegister')}</p>
      <button className='bg-[#07111c] text-white px-4 py-2 rounded-full text-sm mt-3' onClick={() => navigate('/helper/register-vendor')}>
        {t('vendor.registerVendor')}
      </button>
    </div>

    {/* CARD 4 — WhatsApp */}
    <div className='bg-white shadow-lg rounded-2xl border border-gray-100 p-6'>
      <FaWhatsapp className='text-[#ff4d2d] text-3xl' />
      <h2 className='text-lg font-bold text-[#07111c] mt-2'>{t('vendor.whatsappMode')}</h2>
      <p className='text-gray-500 text-sm mt-1'>{t('vendor.whatsappInstructions')}</p>
      <p className='text-blue-600 font-semibold text-sm mt-3'>{whatsappNumber || ''}</p>
      <a href={`https://wa.me/${waDigits}`} target='_blank' rel='noopener noreferrer' className='inline-block bg-[#25d366] text-[#07111c] px-5 py-2.5 rounded-full font-semibold text-sm mt-3'>
        <FaWhatsapp className='inline-block mr-1' /> {t('vendor.openOnWhatsapp')}
      </a>
    </div>
{/* ===== CARDS2 ===== */}
  </div>
)}

{error && <p className='text-red-500 text-sm mt-4'>{error}</p>}
      </div>
    </div>
  )
}

export default VendorRegisterPage

import React, { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { serverUrl } from '../App'
import MarketNav from '../components/MarketNav.jsx'
import PricePad from '../components/PricePad.jsx'
import { FaArrowLeftLong, FaCamera, FaCheck, FaMicrophone, FaCircleExclamation, FaLeaf } from 'react-icons/fa6'
import PriceBandChip from '../components/PriceBandChip.jsx'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'

const CATEGORIES = ['vegetables', 'fruits', 'grains', 'dairy', 'herbs', 'spices', 'flowers', 'other']
const UNITS = ['kg', 'g', 'dozen', 'bundle', 'piece', 'litre']

function AddProducePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mode, setMode] = useState('ai')
  const [language, setLanguage] = useState('kn')
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [form, setForm] = useState({ name: '', category: 'vegetables', price: '', quantity: '', unit: 'kg', freshToday: false, grade: '', harvestDate: '', minOrderQty: '', negotiable: false, certifications: [], bulkMinQty: '', bulkPrice: '' })
  const [voiceField, setVoiceField] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const { transcript, isListening, resetTranscript, startListening } = useSpeechRecognition(language)

  const showToast = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    axios.get(`${serverUrl}/api/vendor/dashboard`, { withCredentials: true })
      .then(res => setLanguage(res.data?.vendorProfile?.preferredLanguage || 'kn'))
      .catch(err => setError(err.response?.data?.message || t('common.loading')))
  }, [])

  useEffect(() => {
    if (!transcript || isListening || !voiceField) return
    if (voiceField === 'price') {
      axios.post(`${serverUrl}/api/vendor/parse-voice-price`, { transcript, language }, { withCredentials: true })
        .then(res => res.data?.price && setForm(prev => ({ ...prev, price: String(res.data.price) })))
        .catch(() => setError(t('vendor.speakPrice')))
    } else setForm(prev => ({ ...prev, [voiceField]: transcript }))
    setVoiceField(''); resetTranscript()
  }, [transcript, isListening, voiceField, language])

  const handlePhoto = event => {
    const selected = event.target.files?.[0]
    if (!selected) return
    setPhoto(selected); setPreview(URL.createObjectURL(selected)); setAnalysis(null); setError('')
  }

  const toManual = () => {
    setMode('manual'); setError('')
    const suggestion = analysis?.aiSuggestion
    if (suggestion) setForm(prev => ({ ...prev, name: suggestion.name || prev.name, category: suggestion.category || prev.category, unit: suggestion.unit || prev.unit, price: suggestion.suggestedPrice ? String(suggestion.suggestedPrice) : prev.price }))
  }

  const analyse = async () => {
    if (!photo) return setError(t('vendor.noPhoto'))
    setLoading(true); setError('')
    try {
      const data = new FormData(); data.append('image', photo)
      const res = await axios.post(`${serverUrl}/api/vendor/analyse-photo`, data, { withCredentials: true })
      const suggestion = res.data?.aiSuggestion || {}
      setAnalysis({ aiSuggestion: suggestion, imageUrl: res.data?.imageUrl })
      setForm(prev => ({ ...prev, name: suggestion.name || '', category: suggestion.category || 'other', unit: suggestion.unit || 'kg', price: suggestion.suggestedPrice ? String(suggestion.suggestedPrice) : '' }))
    } catch (err) { setError(err.response?.data?.message || err.message) } finally { setLoading(false) }
  }

  const save = async () => {
    if (!form.name || !form.price || form.quantity === '') return setError(t('vendor.manualRequired'))
    setLoading(true); setError('')
    try {
      let image = analysis?.imageUrl || ''
      if (mode === 'manual' && photo) {
        const data = new FormData(); data.append('image', photo)
        image = (await axios.post(`${serverUrl}/api/vendor/upload-photo`, data, { withCredentials: true })).data?.imageUrl || ''
      }
      await axios.post(`${serverUrl}/api/vendor/confirm-listing`, {
        name: form.name, category: form.category, unit: form.unit, availableQuantity: Number(form.quantity), pricePerUnit: Number(form.price), image,
        isFreshToday: form.freshToday, addedVia: mode === 'ai' ? 'photo' : 'manual', listingSource: mode === 'ai' ? 'ai' : 'manual',
        priceSetBy: mode === 'ai' ? 'ai' : 'typed', aiSuggestedPrice: analysis?.aiSuggestion?.suggestedPrice, freshnessNote: analysis?.aiSuggestion?.freshnessNote || '',
        grade: form.grade || null, gradeSource: form.grade ? 'manual' : null,
        harvestDate: form.harvestDate || null,
        minOrderQty: form.minOrderQty ? Number(form.minOrderQty) : null,
        negotiable: form.negotiable,
        certifications: form.certifications,
        bulkPricing: (form.bulkMinQty && form.bulkPrice) ? [{ minQty: Number(form.bulkMinQty), pricePerUnit: Number(form.bulkPrice) }] : []
      }, { withCredentials: true })
      showToast(t('vendor.listingAdded'))
      navigate('/vendor/dashboard')
    } catch (err) { setError(err.response?.data?.message || err.message) } finally { setLoading(false) }
  }

  const dictate = field => { setVoiceField(field); resetTranscript(); startListening() }

  // Stable component identity keeps inputs focused while typing
  const updateForm = useCallback((field, value) => setForm(prev => ({ ...prev, [field]: value })), [])

  const detailsForm = (
    <div className='mt-5 grid grid-cols-1 gap-4 md:grid-cols-2'>
      <label className='text-sm font-bold text-[#4b423d]'>
        {t('vendor.productName')}
        <div className='mt-1 flex gap-2'>
          <input
            aria-label={t('vendor.productName')}
            className='w-full min-w-0 flex-1 px-3 py-3 text-sm'
            value={form.name}
            onChange={e => updateForm('name', e.target.value)}
          />
          <button
            aria-label={t('vendor.dictateField', { field: t('vendor.productName') })}
            onClick={() => dictate('name')}
            className={`flex items-center justify-center rounded-xl px-4 ${isListening && voiceField === 'name' ? 'bg-red-500 text-white animate-soft-pulse' : 'bg-[#fff1ea] text-[#ff4d2d] hover:bg-[#ffe0d5]'}`}
          >
            <FaMicrophone />
          </button>
        </div>
      </label>
      <label className='text-sm font-bold text-[#4b423d]'>
        {t('vendor.category')}
        <select className='mt-1 w-full px-3 py-3 text-sm' value={form.category} onChange={e => updateForm('category', e.target.value)}>
          {CATEGORIES.map(x => <option key={x} value={x}>{t(`vendor.${x}`)}</option>)}
        </select>
      </label>
      <div>
        <p className='text-sm font-bold text-[#4b423d]'>{t('vendor.setPrice')}</p>
        <PricePad price={form.price} onPriceChange={price => updateForm('price', price)} onSpeak={() => dictate('price')} speakDisabled={isListening} readingPrice={isListening} />
        {form.name && (
          <div className='mt-2'><PriceBandChip crop={form.name} price={form.price ? Number(form.price) : undefined} /></div>
        )}
      </div>
      <div className='grid grid-cols-2 gap-3'>
        <label className='text-sm font-bold text-[#4b423d]'>
          {t('vendor.quantity')}
          <input aria-label={t('vendor.quantity')} min='0' type='number' className='mt-1 w-full px-3 py-3 text-sm' value={form.quantity} onChange={e => updateForm('quantity', e.target.value)} />
        </label>
        <label className='text-sm font-bold text-[#4b423d]'>
          {t('vendor.unit')}
          <select className='mt-1 w-full px-3 py-3 text-sm' value={form.unit} onChange={e => updateForm('unit', e.target.value)}>
            {UNITS.map(x => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label className='col-span-2 flex items-center gap-2 text-sm font-semibold text-[#4b423d]'>
          <input type='checkbox' checked={form.freshToday} onChange={e => updateForm('freshToday', e.target.checked)} />
          🌿 {t('vendor.freshToday')}
        </label>
      </div>

      {/* ---- Direct Market Access: details buyers ask about ---- */}
      <div className='col-span-full rounded-2xl p-4' style={{ background: 'var(--surface-2)', border: '1px dashed var(--border-strong)' }}>
        <p className='t-eyebrow' style={{ color: 'var(--vendor)' }}>For direct buyers</p>
        <div className='mt-3 grid grid-cols-2 gap-3 md:grid-cols-4'>
          <label className='block text-xs font-bold text-[#4b423d]'>Grade
            <select className='mt-1 w-full px-2 py-2 text-sm' value={form.grade} onChange={e => updateForm('grade', e.target.value)}>
              <option value=''>—</option>
              <option value='A'>A</option>
              <option value='B'>B</option>
              <option value='C'>C</option>
            </select>
          </label>
          <label className='block text-xs font-bold text-[#4b423d]'>Harvest date
            <input type='date' className='mt-1 w-full px-2 py-2 text-sm' value={form.harvestDate} onChange={e => updateForm('harvestDate', e.target.value)} />
          </label>
          <label className='block text-xs font-bold text-[#4b423d]'>Min order qty
            <input type='number' min='0' className='mt-1 w-full px-2 py-2 text-sm' value={form.minOrderQty} onChange={e => updateForm('minOrderQty', e.target.value)} />
          </label>
          <label className='flex items-end gap-2 pb-1.5 text-xs font-semibold text-[#4b423d]'>
            <input type='checkbox' checked={form.negotiable} onChange={e => updateForm('negotiable', e.target.checked)} />
            Price negotiable
          </label>
          <label className='block text-xs font-bold text-[#4b423d]'>Bulk tier: from qty
            <input type='number' min='0' className='mt-1 w-full px-2 py-2 text-sm' placeholder='e.g. 100' value={form.bulkMinQty} onChange={e => updateForm('bulkMinQty', e.target.value)} />
          </label>
          <label className='block text-xs font-bold text-[#4b423d]'>Bulk price ₹/unit
            <input type='number' min='0' className='mt-1 w-full px-2 py-2 text-sm' placeholder='₹' value={form.bulkPrice} onChange={e => updateForm('bulkPrice', e.target.value)} />
          </label>
          <div className='col-span-2'>
            <p className='text-xs font-bold text-[#4b423d]'>Certifications</p>
            <div className='mt-1 flex flex-wrap gap-1.5'>
              {['organic', 'gi-tag', 'fssai', 'natural-farming'].map(cert => (
                <button key={cert} type='button'
                  onClick={() => setForm(f => ({ ...f, certifications: f.certifications.includes(cert) ? f.certifications.filter(c => c !== cert) : [...f.certifications, cert] }))}
                  className='rounded-full px-2.5 py-1 text-[11px] font-bold capitalize transition-all'
                  style={form.certifications.includes(cert)
                    ? { background: 'var(--rescue)', color: '#08130c' }
                    : { background: 'var(--surface-1)', color: 'var(--ink-muted)', border: '1px solid var(--border)' }}>
                  {cert.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {mode === 'manual' && (
        <label className='text-sm font-bold text-[#4b423d] md:col-span-2'>
          {t('vendor.optionalPhoto')}
          <input aria-label={t('vendor.optionalPhoto')} type='file' accept='image/*' capture='environment' onChange={handlePhoto} className='mt-1 w-full px-3 py-3 text-sm' />
        </label>
      )}
    </div>
  )

  return (
    <div className='min-h-screen bg-[#fff9f6] lg:pl-[76px]'>
      <MarketNav />

      {toast && (
        <div className='toast flex items-center gap-2 rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-lg'>
          <FaCheck /> {toast}
        </div>
      )}

      <main className='mx-auto max-w-4xl px-4 py-8 pb-20 lg:pb-8'>
        <button onClick={() => navigate('/vendor/dashboard')} className='link-brand inline-flex items-center gap-2 text-sm'>
          <FaArrowLeftLong /> {t('vendor.back')}
        </button>

        <h1 className='section-heading mt-4 flex items-center gap-3'>
          <span className='flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff4d2d] text-white shadow-[0_8px_24px_rgba(255,77,45,0.35)]'>
            <FaCamera />
          </span>
          {t('vendor.addProduct')}
        </h1>

        <div className='mt-5 grid gap-4 sm:grid-cols-2'>
          <button
            className={`card card-hover card-3d p-5 text-left transition-all ${mode === 'ai' ? 'border-[#ff4d2d] ring-2 ring-[#ff4d2d]/20' : ''}`}
            onClick={() => setMode('ai')}
          >
            <FaCamera className='text-2xl text-[#ff4d2d]' />
            <p className='mt-2 font-bold'>{t('vendor.aiPhotoChoice')}</p>
            <p className='text-sm text-[#8a7d75]'>{t('vendor.aiPhotoChoiceHelp')}</p>
          </button>
          <button
            className={`card card-hover card-3d p-5 text-left transition-all ${mode === 'manual' ? 'border-[#ff4d2d] ring-2 ring-[#ff4d2d]/20' : ''}`}
            onClick={toManual}
          >
            <span className='text-2xl text-[#ff4d2d]'>✎</span>
            <p className='mt-2 font-bold'>{t('vendor.manualChoice')}</p>
            <p className='text-sm text-[#8a7d75]'>{t('vendor.manualChoiceHelp')}</p>
          </button>
        </div>

        <section className='card mt-5 p-6 card-3d'>
          {mode === 'ai' ? (
            <>
              <h2 className='font-bold'>{t('vendor.photoListing')}</h2>
              <input
                aria-label={t('vendor.choosePhoto')}
                type='file'
                accept='image/*'
                capture='environment'
                onChange={handlePhoto}
                className='mt-3 w-full px-3 py-3 text-sm'
              />
              {preview && (
                <div className='relative mt-3 overflow-hidden rounded-xl'>
                  <img src={preview} alt='' className='h-52 w-full object-cover' />
                  {analysis && (
                    <span className='badge badge-success absolute right-3 top-3 bg-white/95'>
                      <FaLeaf /> AI
                    </span>
                  )}
                </div>
              )}
              <button
                className='btn-glow mt-4 px-6 py-3 shadow-[0_8px_24px_rgba(255,77,45,0.35)] disabled:opacity-50'
                disabled={!photo || loading}
                onClick={analyse}
              >
                {loading ? t('vendor.analysing') : t('vendor.analyse')}
              </button>
              {analysis && detailsForm}
            </>
          ) : (
            <>
              <h2 className='font-bold'>{t('vendor.manualChoice')}</h2>
              {detailsForm}
            </>
          )}

          <button
            className='btn-glow mt-6 flex w-full items-center justify-center gap-2 py-3 shadow-[0_8px_24px_rgba(255,77,45,0.35)] disabled:opacity-50'
            disabled={loading || (mode === 'ai' && !analysis)}
            onClick={save}
          >
            <FaCheck /> {loading ? t('common.loading') : t('vendor.confirmListing')}
          </button>
        </section>

        {error && (
          <div className='mt-4 flex items-start gap-2 rounded-xl bg-[#fef2f2] p-4 text-sm text-red-600'>
            <FaCircleExclamation className='mt-0.5 shrink-0' />
            <div>
              {error}
              {mode === 'ai' && (
                <button className='link-brand mt-1 block' onClick={toManual}>
                  {t('vendor.switchToManual')}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AddProducePage

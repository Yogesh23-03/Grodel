import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { IoIosArrowRoundBack } from 'react-icons/io'
import { HiOutlinePlus, HiOutlineTrash, HiOutlineMapPin, HiOutlineHeart, HiOutlineCheckCircle, HiOutlineArrowRight } from 'react-icons/hi2'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { serverUrl } from '../App'
import MarketNav from '../components/MarketNav.jsx'
import useRescueImpact from '../hooks/useRescueImpact.js'

/* G — Donate: a quiet, meaningful act. Sage surfaces, generous space,
   and a reassurance that surplus becomes someone's meal — not waste. */

function DonateFoodPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const impact = useRescueImpact()

  const [foodItems, setFoodItems] = useState([{ name: '', quantity: '', unit: 'kg' }])
  const [foodDescription, setFoodDescription] = useState('')
  const [pickupAddress, setPickupAddress] = useState('')
  const [pickupLat, setPickupLat] = useState('')
  const [pickupLng, setPickupLng] = useState('')
  const [pickupTime, setPickupTime] = useState('')
  const [expiryTime, setExpiryTime] = useState('')
  const [trusts, setTrusts] = useState([])
  const [selectedTrustId, setSelectedTrustId] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null) // { message, type: 'success' | 'error' }
  const [confirmed, setConfirmed] = useState(null) // the created donation

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 4000)
  }

  const updateFoodItem = (index, field, value) => {
    setFoodItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const addFoodItem = () => {
    setFoodItems(prev => [...prev, { name: '', quantity: '', unit: 'kg' }])
  }

  const removeFoodItem = (index) => {
    setFoodItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index))
  }

  useEffect(() => {
    const fetchTrusts = async () => {
      try {
        const result = await axios.get(`${serverUrl}/api/trusts`, { withCredentials: true })
        setTrusts(result.data || [])
      } catch (err) {
        showToast(err.response?.data?.message || 'Could not load trusts — refresh to retry', 'error')
      }
    }
    fetchTrusts()
  }, [])

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported in this browser', 'error')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPickupLat(position.coords.latitude)
        setPickupLng(position.coords.longitude)
      },
      () => showToast('Unable to read your current location', 'error'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  /* Step indicator: filled as the donor completes each part of the form */
  const steps = useMemo(() => ([
    { key: 'food', done: foodItems.every(item => item.name.trim() && item.quantity.trim()) },
    { key: 'where', done: Boolean(selectedTrustId) },
    { key: 'pickup', done: Boolean(pickupAddress.trim() && pickupTime && expiryTime) }
  ]), [foodItems, selectedTrustId, pickupAddress, pickupTime, expiryTime])
  const completedSteps = steps.filter(step => step.done).length

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (new Date(expiryTime) <= new Date(pickupTime)) {
      showToast('Best-before must be after the pickup time', 'error')
      return
    }
    setLoading(true)

    try {
      const result = await axios.post(`${serverUrl}/api/donations`, {
        foodItems,
        foodDescription,
        pickupAddress,
        pickupLat,
        pickupLng,
        pickupTime,
        expiryTime,
        trustId: selectedTrustId
      }, { withCredentials: true })

      setConfirmed(result.data?.donation || { assignedTrustId: result.data?.matchedTrust })
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not submit the donation — please try again', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />

      {toast && (
        <div className={`toast flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg ${toast.type === 'error' ? 'badge-danger' : 'badge-success'}`}
          style={{ background: toast.type === 'error' ? 'var(--danger)' : 'var(--rescue)', color: toast.type === 'error' ? '#2a0d08' : '#08130c' }}>
          {toast.message}
        </div>
      )}

      <main className='mx-auto max-w-[860px] px-4 pb-16 pt-8 sm:px-6'>
        <button onClick={() => navigate('/')} className='link-brand mb-6 inline-flex items-center gap-2 text-sm'>
          <IoIosArrowRoundBack size={22} /> Back
        </button>

        {/* meaning-first intro */}
        <header className='mb-8'>
          <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--rescue)' }}>
            <HiOutlineHeart /> {t('rescue.eyebrow', 'Rescue')}
          </p>
          <h1 className='t-display mt-2'>{t('rescue.title', 'Feed someone, not the bin')}</h1>
          <p className='mt-2 max-w-xl text-[15px]' style={{ color: 'var(--ink-soft)' }}>
            {t('rescue.copy', 'Tell us what you have and when it can be picked up. We route it to a verified trust nearby — fresh food reaches plates instead of landfill.')}
          </p>
          <p className='mt-3 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-black'
            style={{ background: 'var(--rescue-soft)', color: 'var(--rescue)' }}>
            <HiOutlineCheckCircle /> {impact.rescuedUnits} {t('rescue.impactThisWeek', 'units rescued so far')}
          </p>
        </header>

        {/* ===== success state: the story ends well ===== */}
        {confirmed ? (
          <section className='grain card animate-rise-in p-8 text-center sm:p-12'>
            <span className='mx-auto flex h-16 w-16 items-center justify-center rounded-full' style={{ background: 'var(--rescue-soft)', color: 'var(--rescue)' }}>
              <HiOutlineHeart size={30} />
            </span>
            <h2 className='t-title mt-5'>{t('rescue.confirmedTitle', 'Your food is on its way to a plate')}</h2>
            <p className='mx-auto mt-3 max-w-md text-[15px]' style={{ color: 'var(--ink-soft)' }}>
              {confirmed.assignedTrustId?.name
                ? t('rescue.confirmedBodyTrust', '{{trust}} has been notified and will arrange pickup. You can follow its journey in your rescue record.', { trust: confirmed.assignedTrustId.name })
                : t('rescue.confirmedBody', 'A verified trust has been notified and will arrange pickup. You can follow its journey in your rescue record.')}
            </p>
            <div className='mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row'>
              <button onClick={() => navigate('/my-donations')} className='flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-transform active:scale-95'
                style={{ background: 'var(--rescue)', color: '#08130c' }}>
                {t('rescue.viewMyDonations', 'View my donations')} <HiOutlineArrowRight />
              </button>
              <button onClick={() => {
                setConfirmed(null)
                setFoodItems([{ name: '', quantity: '', unit: 'kg' }])
                setFoodDescription('')
                setPickupAddress('')
                setPickupLat('')
                setPickupLng('')
                setPickupTime('')
                setExpiryTime('')
                setSelectedTrustId('')
              }} className='btn-ghost'>
                {t('rescue.donateMore', 'Donate more food')}
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* step indicator */}
            <ol className='mb-6 flex items-center gap-2' aria-label='donation progress'>
              {steps.map((step, index) => (
                <li key={step.key} className='flex flex-1 items-center gap-2'>
                  <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black'
                    style={step.done
                      ? { background: 'var(--rescue)', color: '#08130c' }
                      : { background: 'var(--surface-3)', color: 'var(--ink-muted)' }}>
                    {step.done ? '✓' : index + 1}
                  </span>
                  <span className='hidden text-xs font-bold sm:block' style={{ color: step.done ? 'var(--rescue)' : 'var(--ink-muted)' }}>
                    {t(`rescue.step.${step.key}`, step.key)}
                  </span>
                  {index < steps.length - 1 && <span className='h-[2px] flex-1 rounded-full' style={{ background: step.done ? 'var(--rescue)' : 'var(--surface-3)' }} />}
                </li>
              ))}
            </ol>

            <form className='grain rounded-[2rem] border p-5 shadow-xl sm:p-7' style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }} onSubmit={handleSubmit}>
              {/* --- the food --- */}
              <div className='flex items-center justify-between gap-3'>
                <h2 className='t-title !text-[1.15rem]'>{t('rescue.foodHeading', 'What are you sharing?')}</h2>
                <button type='button' className='btn-ghost !px-3 !py-1.5 text-xs' onClick={addFoodItem}>
                  <HiOutlinePlus /> {t('rescue.addItem', 'Add item')}
                </button>
              </div>

              {foodItems.map((item, index) => (
                <div className='mt-3 grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_140px_150px_42px]' key={index}>
                  <div>
                    <label className='mb-1 block text-xs font-bold' style={{ color: 'var(--ink-muted)' }}>
                      {t('rescue.itemName', 'Item name')}
                    </label>
                    <input className='w-full px-3 py-2' value={item.name} onChange={(e) => updateFoodItem(index, 'name', e.target.value)}
                      placeholder='Cooked rice, bread, vegetables' required />
                  </div>
                  <div>
                    <label className='mb-1 block text-xs font-bold' style={{ color: 'var(--ink-muted)' }}>
                      {t('rescue.quantity', 'Quantity')}
                    </label>
                    <input className='w-full px-3 py-2' value={item.quantity} onChange={(e) => updateFoodItem(index, 'quantity', e.target.value)} placeholder='10' required />
                  </div>
                  <div>
                    <label className='mb-1 block text-xs font-bold' style={{ color: 'var(--ink-muted)' }}>
                      {t('rescue.unit', 'Unit')}
                    </label>
                    <select className='w-full px-3 py-2' value={item.unit} onChange={(e) => updateFoodItem(index, 'unit', e.target.value)}>
                      <option value='kg'>kg</option>
                      <option value='plates'>plates</option>
                      <option value='boxes'>boxes</option>
                      <option value='packets'>packets</option>
                      <option value='litres'>litres</option>
                    </select>
                  </div>
                  <button type='button' className='badge badge-danger flex h-[42px] w-full items-center justify-center md:w-[42px]'
                    onClick={() => removeFoodItem(index)} aria-label='Remove food item'>
                    <HiOutlineTrash size={15} />
                  </button>
                </div>
              ))}

              {/* --- where it goes --- */}
              <div className='mt-7'>
                <label className='block text-xs font-bold' style={{ color: 'var(--ink-muted)' }}>
                  {t('rescue.trustLabel', 'Which trust should receive it?')}
                </label>
                <select className='mt-1.5 w-full px-3 py-2.5' value={selectedTrustId} onChange={(e) => setSelectedTrustId(e.target.value)} required>
                  <option value='' disabled>{t('rescue.trustPlaceholder', 'Choose a trust')}</option>
                  {trusts.map((trust) => (
                    <option key={trust._id} value={trust._id}>{trust.name}</option>
                  ))}
                </select>
                {trusts.length === 0 && (
                  <p className='mt-2 text-sm' style={{ color: 'var(--ink-muted)' }}>
                    {t('rescue.noTrusts', 'No verified trusts are available yet.')}
                  </p>
                )}
              </div>

              <div className='mt-5'>
                <label className='block text-xs font-bold' style={{ color: 'var(--ink-muted)' }}>
                  {t('rescue.description', 'Anything the trust should know?')}
                </label>
                <textarea className='mt-1.5 min-h-[90px] w-full px-3 py-2' value={foodDescription} onChange={(e) => setFoodDescription(e.target.value)}
                  placeholder='Food condition, packaging, dietary notes' />
              </div>

              {/* --- pickup logistics --- */}
              <div className='mt-7 rounded-2xl p-5' style={{ background: 'var(--surface-2)', border: '1px dashed var(--border-strong)' }}>
                <p className='t-eyebrow'>{t('rescue.pickupHeading', 'Pickup')}</p>

                <label className='mt-3 block text-xs font-bold' style={{ color: 'var(--ink-muted)' }}>
                  {t('rescue.address', 'Pickup address')}
                </label>
                <textarea className='mt-1.5 min-h-[80px] w-full px-3 py-2' value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder='Full pickup address' required />

                <div className='mt-3 grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_1fr_auto]'>
                  <div>
                    <label className='mb-1 block text-xs font-bold' style={{ color: 'var(--ink-muted)' }}>Latitude</label>
                    <input className='w-full px-3 py-2' value={pickupLat} onChange={(e) => setPickupLat(e.target.value)} placeholder='Optional' />
                  </div>
                  <div>
                    <label className='mb-1 block text-xs font-bold' style={{ color: 'var(--ink-muted)' }}>Longitude</label>
                    <input className='w-full px-3 py-2' value={pickupLng} onChange={(e) => setPickupLng(e.target.value)} placeholder='Optional' />
                  </div>
                  <button type='button' onClick={useCurrentLocation} className='btn-ghost !px-4 !py-2 text-xs'>
                    <HiOutlineMapPin /> {t('rescue.useLocation', 'Use my location')}
                  </button>
                </div>

                <div className='mt-3 grid grid-cols-1 gap-3 md:grid-cols-2'>
                  <div>
                    <label className='mb-1 block text-xs font-bold' style={{ color: 'var(--ink-muted)' }}>
                      {t('rescue.pickupTime', 'Pickup date & time')}
                    </label>
                    <input type='datetime-local' className='w-full px-3 py-2' value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} required />
                  </div>
                  <div>
                    <label className='mb-1 block text-xs font-bold' style={{ color: 'var(--ink-muted)' }}>
                      {t('rescue.expiryTime', 'Best before')}
                    </label>
                    <input type='datetime-local' className='w-full px-3 py-2' value={expiryTime} onChange={(e) => setExpiryTime(e.target.value)} required />
                  </div>
                </div>
              </div>

              <button className='mt-6 w-full rounded-2xl py-4 text-base font-black transition-transform active:scale-[0.98]'
                style={{ background: 'var(--rescue)', color: '#08130c', boxShadow: 'var(--shadow-ambient)' }} disabled={loading}>
                {loading ? t('common.loading', 'Loading…') : t('rescue.submit', 'Rescue this food')}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}

export default DonateFoodPage

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { serverUrl } from '../App'
import MarketNav from '../components/MarketNav.jsx'
import PricePad from '../components/PricePad.jsx'
import {
  FaPlus, FaMinus, FaTrashCan, FaCheck, FaXmark, FaBasketShopping,
  FaCircleCheck, FaCircleExclamation, FaIndianRupeeSign, FaBoxOpen, FaTruck,
  FaChartLine, FaMicrophone,
} from 'react-icons/fa6'
import { useAudioInstructions } from '../hooks/useAudioInstructions.js'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'

const STATUS_FLOW = ['confirmed', 'ready', 'out of delivery', 'delivered']
const STATUS_STYLES = {
  pending: 'badge-warning',
  confirmed: 'badge-brand',
  ready: 'badge-accent',
  'out of delivery': 'badge-accent',
  delivered: 'badge-success',
  cancelled: 'badge-danger'
}

function VendorDashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { speakText } = useAudioInstructions()
  const socket = useSelector(state => state.user.socket)

  const [vendorProfile, setVendorProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState([])
  const [orders, setOrders] = useState([])
  const [todayEarnings, setTodayEarnings] = useState(0)
  const [todayOrders, setTodayOrders] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingPrice, setEditingPrice] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [showOrders, setShowOrders] = useState(true)

  /* Voice bar: 'command' means the mic is listening for a shop instruction,
     so the price editor must not swallow that transcript. */
  const [voiceMode, setVoiceMode] = useState('idle')
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [voiceHeard, setVoiceHeard] = useState('')
  const [voiceReply, setVoiceReply] = useState('')
  const [commandText, setCommandText] = useState('')

  const preferredLanguage = vendorProfile?.preferredLanguage || 'kn'
  const { transcript, isListening, resetTranscript, startListening, stopListening } = useSpeechRecognition(preferredLanguage)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3500)
  }

  const loadAll = () => {
    return axios.get(`${serverUrl}/api/vendor/dashboard`, { withCredentials: true })
      .then((res) => {
        setVendorProfile(res.data?.vendorProfile)
        setListings(res.data?.listings || [])
        setTodayEarnings(res.data?.todayEarnings || 0)
        setTodayOrders(res.data?.todayOrders || 0)
        setPendingCount(res.data?.orderCounts?.pending || 0)
        return axios.get(`${serverUrl}/api/vendor/orders/incoming`, { withCredentials: true })
      })
      .then(res => setOrders(res.data?.orders || []))
      .catch((err) => setError(err.response?.data?.message || t('common.loading')))
  }

  useEffect(() => {
    loadAll()
      .then(() => speakText(`${t('vendor.todayEarnings')} ${todayEarnings}`, preferredLanguage))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!editingId || !transcript || isListening || voiceMode === 'command') return
    axios.post(`${serverUrl}/api/vendor/parse-voice-price`, { transcript, language: preferredLanguage }, { withCredentials: true })
      .then((res) => {
        if (res.data?.price) setEditingPrice(String(res.data.price))
      })
      .catch(() => setError(t('vendor.speakPrice')))
    resetTranscript()
  }, [transcript, isListening, voiceMode])

  /* Speak to your shop: the reply is read aloud, then we refresh what changed. */
  const runVoiceCommand = async (text) => {
    const command = String(text || '').trim()
    if (!command) return
    setVoiceBusy(true)
    setVoiceHeard(command)
    setVoiceReply('')
    setError('')
    try {
      const res = await axios.post(`${serverUrl}/api/vendor/voice-command`, { transcript: command }, { withCredentials: true })
      const said = res.data?.said || ''
      setVoiceReply(said)
      if (said) speakText(said, preferredLanguage)
      if (res.data?.action === 'open' || res.data?.action === 'close' || res.data?.action === 'fresh') {
        setVendorProfile((prev) => ({ ...prev, isActive: res.data.isActive, isFreshToday: res.data.isFreshToday }))
      } else if (['price', 'stock', 'orders'].includes(res.data?.action)) {
        loadAll()
      }
    } catch (err) {
      const message = err.response?.data?.message || t('vendor.voiceCommandFailed')
      setError(message)
      setVoiceReply(message)
    } finally {
      setVoiceBusy(false)
    }
  }

  useEffect(() => {
    if (voiceMode !== 'command' || !transcript || isListening) return
    setVoiceMode('idle')
    resetTranscript()
    runVoiceCommand(transcript)
  }, [transcript, isListening, voiceMode])

  // Realtime: new order + status echoes
  useEffect(() => {
    if (!socket) return
    const onNewOrder = () => {
      showToast(t('vendor.newOrderToast'))
      loadAll()
    }
    const onStatus = () => { loadAll() }
    socket.on('newVendorOrder', onNewOrder)
    socket.on('vendorOrderStatus', onStatus)
    return () => {
      socket.off('newVendorOrder', onNewOrder)
      socket.off('vendorOrderStatus', onStatus)
    }
  }, [socket])

  const toggleShop = async () => {
    setToggleLoading(true)
    setError('')
    try {
      const res = await axios.patch(`${serverUrl}/api/vendor/toggle`, {}, { withCredentials: true })
      setVendorProfile((prev) => ({ ...prev, isActive: res.data?.isActive, isFreshToday: res.data?.isFreshToday }))
      if (res.data?.isActive && res.data?.isFreshToday) {
        showToast(t('vendor.freshBadgeEarned'))
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.loading'))
    } finally {
      setToggleLoading(false)
    }
  }

  const changeQuantity = async (listingId, delta) => {
    const listing = listings.find((item) => item._id === listingId)
    const newQty = Math.max(0, (listing?.availableQuantity || 0) + delta)
    setListings((prev) => prev.map((item) => item._id === listingId ? { ...item, availableQuantity: newQty } : item))
    try {
      await axios.put(`${serverUrl}/api/vendor/listing/${listingId}`, { availableQuantity: newQty }, { withCredentials: true })
    } catch (err) {
      setError(err.response?.data?.message || t('common.loading'))
    }
  }

  const toggleAvailable = async (listingId) => {
    const listing = listings.find((item) => item._id === listingId)
    const next = !listing?.isAvailableToday
    setListings((prev) => prev.map((item) => item._id === listingId ? { ...item, isAvailableToday: next } : item))
    try {
      await axios.put(`${serverUrl}/api/vendor/listing/${listingId}`, { isAvailableToday: next }, { withCredentials: true })
    } catch (err) {
      setError(err.response?.data?.message || t('common.loading'))
    }
  }

  const savePrice = async (listingId) => {
    if (!editingPrice) return
    setSavingId(listingId)
    try {
      const res = await axios.put(`${serverUrl}/api/vendor/listing/${listingId}`, { pricePerUnit: Number(editingPrice), priceSetBy: 'typed' }, { withCredentials: true })
      const updated = res.data?.listing
      setListings((prev) => prev.map((item) => item._id === listingId ? { ...item, ...updated } : item))
      setEditingId(null)
      setEditingPrice('')
      showToast(t('vendor.editsSaved'))
    } catch (err) {
      setError(err.response?.data?.message || t('common.loading'))
    } finally {
      setSavingId(null)
    }
  }

  const removeListing = async (listingId) => {
    const previous = listings
    setListings((prev) => prev.filter((item) => item._id !== listingId))
    try {
      await axios.delete(`${serverUrl}/api/vendor/listing/${listingId}`, { withCredentials: true })
      showToast(t('vendor.itemRemoved'))
    } catch (err) {
      setListings(previous)
      setError(err.response?.data?.message || t('common.loading'))
    }
  }

  const advanceOrder = async (order, status) => {
    setUpdatingOrderId(order._id)
    try {
      const res = await axios.patch(`${serverUrl}/api/vendor/orders/${order._id}/status`, { status }, { withCredentials: true })
      setOrders(prev => prev.map(o => (o._id === order._id ? res.data?.order || o : o)))
      showToast(t('vendor.orderMarked', { status: t(`vendorShop.status.${status.replace(/ /g, '_')}`) }))
      if (status === 'delivered') {
        setTodayOrders(n => n + 1)
        setTodayEarnings(n => Math.round(((n || 0) + (order.totalAmount || 0)) * 100) / 100)
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.loading'))
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
  const pastOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status))

  if (loading) {
    return (
      <div className='min-h-screen bg-[#fff9f6] lg:pl-[76px]'>
        <MarketNav />
        <main className='mx-auto max-w-6xl px-4 py-6 pb-20 sm:py-8 lg:py-10 lg:pb-8'>
          <div className='skeleton h-10 w-72' />
          <div className='skeleton mt-6 h-20 w-full rounded-2xl' />
          <div className='mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3'>
            {[0, 1, 2].map(i => <div key={i} className='skeleton h-28 w-full rounded-2xl' />)}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-[#fff9f6] lg:pl-[76px]'>
      <MarketNav />

      {toast && (
        <div className={`toast flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-600 text-white'}`}>
          {toast.type === 'error' ? <FaCircleExclamation /> : <FaCircleCheck />}
          {toast.message}
        </div>
      )}

      <main className='mx-auto max-w-6xl px-4 pb-20 pt-8'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h1 className='flex items-center gap-3 section-heading'>
            <span className='chef-bob notranslate text-3xl sm:text-4xl' aria-hidden='true'>👨‍🍳</span>
            {t('vendor.dashboard')}
          </h1>
          <div className='flex items-center gap-2'>
            <button className='btn-ghost !px-3.5 !py-2 text-xs' onClick={() => navigate('/my-analysis')}>
              <FaChartLine /> {t('analysis.navLink', 'My analysis')}
            </button>
            <button className='btn-ghost !px-3.5 !py-2 text-xs' onClick={() => navigate('/my-bulk-orders')}>
              {t('bulk.navLink', 'Bulk orders')}
            </button>
          </div>
          {error && (
            <p className='rounded-full bg-[#fef2f2] px-4 py-2 text-sm font-semibold text-red-600'>{error}</p>
          )}
        </div>

        {/* Big toggle button */}
        <button
          className={`mt-5 flex w-full items-center justify-center gap-3 rounded-2xl py-5 text-xl font-black shadow-lg transition-all active:scale-[0.99] ${vendorProfile?.isActive ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
          onClick={toggleShop}
          disabled={toggleLoading}
        >
          {vendorProfile?.isActive ? <FaCheck /> : <FaXmark />}
          {toggleLoading
            ? t('common.loading')
            : vendorProfile?.isActive ? t('vendor.openToday') : t('vendor.closedToday')}
        </button>
        {vendorProfile?.isFreshToday && (
          <p className='mt-2 text-sm font-semibold text-green-600'>🌿 {t('vendor.freshToday')}</p>
        )}
        <p className='mt-1 text-xs text-[var(--ink-muted)]'>{vendorProfile?.isActive ? t('vendor.closedHint') : t('vendor.openHint')}</p>

        {/* VOICE BAR — the whole shop can be run by speaking */}
        <section className='card card-3d mt-5 p-5'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <h2 className='flex items-center gap-2 text-base font-bold text-[var(--ink)]'>
              <FaMicrophone className='text-[color:var(--accent-text)]' /> {t('vendor.voiceBarTitle')}
            </h2>
            <span className='text-xs text-[var(--ink-muted)]'>{t('vendor.voiceBarHint')}</span>
          </div>

          <div className='mt-3 flex flex-wrap items-center gap-2'>
            <button
              className={`btn-primary flex items-center gap-2 ${isListening && voiceMode === 'command' ? 'animate-pulse' : ''}`}
              disabled={voiceBusy}
              onClick={() => {
                if (isListening && voiceMode === 'command') {
                  stopListening()
                  setVoiceMode('idle')
                  return
                }
                setError('')
                setVoiceMode('command')
                resetTranscript()
                startListening()
              }}
            >
              <FaMicrophone />
              {isListening && voiceMode === 'command' ? t('vendor.listening') : t('vendor.tapToSpeak')}
            </button>
            <input
              value={commandText}
              onChange={(event) => setCommandText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && commandText.trim()) {
                  runVoiceCommand(commandText)
                  setCommandText('')
                }
              }}
              placeholder={t('vendor.orType')}
              className='glass-input min-w-[200px] flex-1 text-sm'
            />
            <button
              className='btn-ghost !px-4 !py-2.5 text-xs'
              disabled={voiceBusy || !commandText.trim()}
              onClick={() => {
                runVoiceCommand(commandText)
                setCommandText('')
              }}
            >
              {voiceBusy ? t('vendor.voiceCommandThinking') : t('vendor.voiceRun')}
            </button>
          </div>

          <div className='mt-3 flex flex-wrap gap-2'>
            {[t('vendor.openShopCommand'), t('vendor.closeShopCommand'), t('vendor.earningsCommand'), t('vendor.ordersCommand')].map((example) => (
              <button
                key={example}
                className='rounded-full border border-[#e9e2dc] px-3 py-1.5 text-xs font-semibold text-[#6b5e57] disabled:opacity-50'
                disabled={voiceBusy}
                onClick={() => runVoiceCommand(example)}
              >
                {example}
              </button>
            ))}
          </div>

          {(voiceHeard || voiceReply) && (
            <div className='mt-3 rounded-xl bg-[#fff3ee] p-3'>
              {voiceHeard ? <p className='text-xs text-[var(--ink-muted)]'>{t('vendor.voiceCommandHeard')}: “{voiceHeard}”</p> : null}
              {voiceReply ? <p className='mt-1 text-sm font-semibold text-[var(--ink)]'>{voiceReply}</p> : null}
            </div>
          )}
        </section>

        {/* STATS ROW */}
        <div className='stagger mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <div className='card card-3d p-6 text-center'>
            <p className='flex items-center justify-center gap-1 text-4xl font-black text-[color:var(--accent-text)]'>
              <FaIndianRupeeSign className='text-2xl' />{todayEarnings}
            </p>
            <p className='mt-1 text-sm text-[var(--ink-muted)]'>{t('vendor.todayEarnings')}</p>
          </div>
          <div className='card card-3d p-6 text-center'>
            <p className='flex items-center justify-center gap-1 text-4xl font-black text-[color:var(--accent-text)]'>
              <FaBoxOpen className='text-2xl' />{todayOrders}
            </p>
            <p className='mt-1 text-sm text-[var(--ink-muted)]'>{t('vendor.todayOrders')}</p>
          </div>
          <div className='card card-3d p-6 text-center'>
            <p className='flex items-center justify-center gap-1 text-4xl font-black text-[color:var(--accent-text)]'>
              <FaTruck className='text-2xl' />{vendorProfile?.totalOrders || 0}
            </p>
            <p className='mt-1 text-sm text-[var(--ink-muted)]'>{t('vendor.totalOrders')}</p>
          </div>
        </div>

        {/* INCOMING ORDERS */}
        <div className='mt-8 flex flex-wrap items-center justify-between gap-3'>
          <h2 className='flex items-center gap-2 text-2xl font-bold'>
            <FaBasketShopping className='text-[color:var(--accent-text)]' />
            {t('vendor.incomingOrders')}
            {pendingCount > 0 && <span className='badge badge-warning px-2.5 py-1'>{pendingCount}</span>}
          </h2>
          <button onClick={() => setShowOrders(o => !o)} className='link-brand text-sm'>
            {showOrders ? t('common.close') : t('vendor.showOrders')}
          </button>
        </div>

        {showOrders && (
          <div className='mt-4 space-y-3'>
            {activeOrders.length === 0 && (
              <div className='card p-8 text-center text-sm text-[var(--ink-muted)] card-3d'>{t('vendor.noActiveOrders')}</div>
            )}
            {activeOrders.map(order => (
              <div key={order._id} className='card animate-rise-in p-5 card-3d'>
                <div className='flex flex-wrap items-center gap-3'>
                  <div className='min-w-0 flex-1'>
                    <p className='font-bold'>{order.customer?.fullName || 'Customer'}</p>
                    <p className='mt-0.5 text-sm text-[var(--ink-muted)]'>
                      {order.items.map(i => `${i.name} ×${i.quantity}${i.unit ? ` ${i.unit}` : ''}`).join(', ')}
                    </p>
                    {order.note && <p className='mt-1 text-xs italic text-[#d97706]'>"{order.note}"</p>}
                    <p className='mt-1 text-xs text-[var(--ink-muted)]'>📍 {order.deliveryAddress?.text} · 📞 {order.contactPhone || order.customer?.mobile}</p>
                  </div>
                  <div className='text-right'>
                    <span className={`badge ${STATUS_STYLES[order.status] || 'badge-muted'} px-3 py-1.5`}>
                      {t(`vendorShop.status.${order.status.replace(/ /g, '_')}`)}
                    </span>
                    <p className='mt-1 text-lg font-black text-[color:var(--accent-text)]'>₹{order.totalAmount}</p>
                  </div>
                </div>
                <div className='mt-4 flex flex-wrap gap-2 border-t border-dashed border-[var(--border)] pt-3'>
                  {order.status === 'pending' && (
                    <>
                      <button
                        onClick={() => advanceOrder(order, 'confirmed')}
                        disabled={updatingOrderId === order._id}
                        className='flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--accent-strong)]'
                      >
                        <FaCheck /> {t('vendorShop.status.confirmed')}
                      </button>
                      <button
                        onClick={() => advanceOrder(order, 'cancelled')}
                        disabled={updatingOrderId === order._id}
                        className='rounded-full bg-[#fef2f2] px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100'
                      >
                        {t('vendorShop.status.cancelled')}
                      </button>
                    </>
                  )}
                  {order.status === 'confirmed' && (
                    <button
                      onClick={() => advanceOrder(order, 'ready')}
                      disabled={updatingOrderId === order._id}
                      className='flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--accent-strong)]'
                    >
                      <FaCheck /> {t('vendorShop.status.ready')}
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      onClick={() => advanceOrder(order, 'out of delivery')}
                      disabled={updatingOrderId === order._id}
                      className='flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--accent-strong)]'
                    >
                      <FaTruck /> {t('vendorShop.status.out_of_delivery')}
                    </button>
                  )}
                  {order.status === 'out of delivery' && (
                    <button
                      onClick={() => advanceOrder(order, 'delivered')}
                      disabled={updatingOrderId === order._id}
                      className='flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700'
                    >
                      <FaCircleCheck /> {t('vendorShop.status.delivered')}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {pastOrders.length > 0 && (
              <div className='card divide-y divide-[var(--border)] p-2 card-3d'>
                <p className='px-3 py-2 text-xs font-bold uppercase tracking-widest text-[var(--ink-muted)]'>{t('vendor.pastOrders')}</p>
                {pastOrders.map(order => (
                  <div key={order._id} className='flex flex-wrap items-center gap-3 p-3 text-sm'>
                    <span className='min-w-0 flex-1 truncate'>
                      {order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                    </span>
                    <span className={`badge ${STATUS_STYLES[order.status] || 'badge-muted'}`}>
                      {t(`vendorShop.status.${order.status.replace(/ /g, '_')}`)}
                    </span>
                    <span className='font-bold text-[color:var(--accent-text)]'>₹{order.totalAmount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LISTINGS */}
        <div className='mt-8 flex items-center justify-between'>
          <h2 className='text-2xl font-bold'>{t('vendor.myListings')}</h2>
          <button
            className='btn-glow flex h-11 w-11 items-center justify-center shadow-[0_6px_18px_var(--brand-glow)] transition-transform hover:scale-110 active:scale-95'
            onClick={() => navigate('/vendor/add-produce')}
            aria-label={t('vendor.addProduct')}
          >
            <FaPlus />
          </button>
        </div>

        {listings.length === 0 && (
          <div className='card p-5 sm:p-8 lg:p-10 text-center text-[var(--ink-muted)] mt-4 card-3d'>
            {t('vendor.noListings')}
          </div>
        )}

        <div className='stagger mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
          {listings.map((listing) => (
            <div key={listing._id} className='card overflow-hidden card-3d'>
              {listing.image && (
                <div className='relative h-40 w-full overflow-hidden'>
                  <img src={listing.image} alt={listing.name} className='h-full w-full object-cover' />
                </div>
              )}
              <div className='p-4'>
                <div className='flex items-start justify-between gap-2'>
                  <h3 className='font-bold'>
                    {listing.nameInLanguage && listing.nameInLanguage[preferredLanguage] ? listing.nameInLanguage[preferredLanguage] : listing.name}
                  </h3>
                  <span className={`badge shrink-0 ${listing.isAvailableToday ? 'badge-success' : 'badge-danger'}`}>
                    {listing.isAvailableToday ? t('vendor.available') : t('vendor.unavailable')}
                  </span>
                </div>
                <p className='mt-1 text-sm text-[var(--ink-muted)]'>
                  {t(`vendor.${listing.category || 'other'}`, { defaultValue: listing.category || 'Other' })} · {listing.availableQuantity || 0} {listing.unit || 'kg'}
                </p>
                <div className='mt-2 flex items-center justify-between'>
                  <div>
                    <span className='text-xl font-black text-[color:var(--accent-text)]'>₹{listing.pricePerUnit || 0}</span>
                    <span className='text-sm text-[var(--ink-muted)]'>/{t('vendor.perUnit', { unit: listing.unit || 'kg' })}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <button className='flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[color:var(--accent-text)] hover:bg-[var(--accent-soft)]' onClick={() => changeQuantity(listing._id, -1)} aria-label='decrease'><FaMinus size={11} /></button>
                    <span className='w-5 text-center font-bold'>{listing.availableQuantity || 0}</span>
                    <button className='flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[color:var(--accent-text)] hover:bg-[var(--accent-soft)]' onClick={() => changeQuantity(listing._id, 1)} aria-label='increase'><FaPlus size={11} /></button>
                  </div>
                </div>
                <div className='mt-3 flex flex-wrap gap-2'>
                  <button className='rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-sm font-semibold text-[color:var(--accent-text)] hover:bg-[var(--accent-soft)]' onClick={() => {
                    setEditingId(listing._id)
                    setEditingPrice(String(listing.pricePerUnit || ''))
                  }}>
                    ₹ {t('vendor.setPrice')}
                  </button>
                  <button className='rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-sm font-semibold text-[var(--ink-soft)] hover:bg-[var(--accent-soft)]' onClick={() => toggleAvailable(listing._id)}>
                    {listing.isAvailableToday ? t('vendor.unavailable') : t('vendor.available')}
                  </button>
                  <button className='rounded-full bg-[#fef2f2] px-3 py-1.5 text-sm font-semibold text-red-500 hover:bg-red-100' onClick={() => removeListing(listing._id)} aria-label='delete'>
                    <FaTrashCan className='inline-block' />
                  </button>
                </div>

                {editingId === listing._id && (
                  <div className='mt-3 animate-fade-in'>
                    <PricePad
                      price={editingPrice}
                      onPriceChange={setEditingPrice}
                      onSpeak={() => { setVoiceMode('price'); setError(''); resetTranscript(); startListening(); }}
                      speakDisabled={isListening}
                      readingPrice={isListening}
                    />
                    <button className='btn-glow mt-2 w-full px-4 py-2 text-sm' onClick={() => savePrice(listing._id)} disabled={savingId === listing._id}>
                      {savingId === listing._id ? t('common.loading') : t('common.save')}
                    </button>
                    <button className='link-brand mt-1 block w-full text-center text-sm' onClick={() => { setEditingId(null); setEditingPrice(''); }}>
                      {t('common.cancel')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default VendorDashboardPage

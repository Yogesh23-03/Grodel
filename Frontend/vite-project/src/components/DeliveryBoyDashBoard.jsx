import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { serverUrl } from '../App'
import MarketNav from './MarketNav.jsx'
import DeliveryBoyTracking from './DeliveryBoyTracking.jsx'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  HiOutlineArrowPath, HiOutlineCheckBadge, HiOutlineMapPin,
  HiOutlineBellAlert, HiOutlineTruck, HiOutlineHeart, HiOutlineDocumentText
} from 'react-icons/hi2'
import { HiOutlineLocationMarker } from 'react-icons/hi'
import { HiOutlineSparkles } from 'react-icons/hi2'

const RATE_PER_DELIVERY = 50

function DeliveryBoyDashboard() {
  const { userData, socket } = useSelector(state => state.user)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [currentOrder, setCurrentOrder] = useState()
  const [showOtpBox, setShowOtpBox] = useState(false)
  const [availableAssignments, setAvailableAssignments] = useState([])
  const [availableDonationDeliveries, setAvailableDonationDeliveries] = useState([])
  const [currentDonationDelivery, setCurrentDonationDelivery] = useState(null)
  const [cancelledOrders, setCancelledOrders] = useState([])
  const [otp, setOtp] = useState('')
  const [todayDeliveries, setTodayDeliveries] = useState([])
  const [deliveryBoyLocation, setDeliveryBoyLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [toast, setToast] = useState(null)
  const [sharingLocation, setSharingLocation] = useState(true)
  const watchRef = useRef(null)

  const showToast = (text, type = 'success') => {
    setToast({ message: text, type })
    window.setTimeout(() => setToast(null), 3800)
  }

  /* ---------------- live GPS → socket ---------------- */
  useEffect(() => {
    if (!socket || userData.role !== 'deliveryBoy') return
    let watchId
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const latitude = position.coords.latitude
          const longitude = position.coords.longitude
          setDeliveryBoyLocation({ lat: latitude, lon: longitude })
          if (sharingLocation) {
            socket.emit('updateLocation', { latitude, longitude, userId: userData._id })
          }
        },
        (error) => console.log(error),
        { enableHighAccuracy: true }
      )
    }
    watchRef.current = watchId
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId) }
  }, [socket, userData, sharingLocation])

  const totalEarning = todayDeliveries.reduce((sum, d) => sum + d.count * RATE_PER_DELIVERY, 0)
  const totalDelivered = todayDeliveries.reduce((sum, d) => sum + d.count, 0)

  /* ---------------- loaders ---------------- */
  const getAssignments = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-assignments`, { withCredentials: true })
      setAvailableAssignments(result.data)
    } catch (error) {
      console.log(error)
    }
  }

  const getCurrentOrder = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-current-order`, { withCredentials: true })
      setCurrentOrder(result.data)
    } catch (error) {
      console.log(error)
    }
  }

  const getCancelledOrders = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-cancelled-delivery-orders`, { withCredentials: true })
      setCancelledOrders(result.data)
    } catch (error) {
      console.log(error)
    }
  }

  const getDonationDeliveries = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/donation-deliveries/available`, { withCredentials: true })
      setAvailableDonationDeliveries(result.data || [])
    } catch (error) {
      console.log(error)
    }
  }

  const getCurrentDonationDelivery = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/donation-deliveries/current`, { withCredentials: true })
      setCurrentDonationDelivery(result.data)
    } catch (error) {
      setCurrentDonationDelivery(null)
    }
  }

  const refreshAll = () => {
    getAssignments()
    getCurrentOrder()
    getCancelledOrders()
    getDonationDeliveries()
    getCurrentDonationDelivery()
    handleTodayDeliveries()
  }

  /* ---------------- actions ---------------- */
  const acceptOrder = async (assignmentId) => {
    try {
      await axios.get(`${serverUrl}/api/order/accept-order/${assignmentId}`, { withCredentials: true })
      await getCurrentOrder()
      await getAssignments()
      showToast(t('db.accepted', 'Delivery accepted — it is yours now'))
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not accept this delivery', 'error')
    }
  }

  const acceptDonationDelivery = async (donationId) => {
    try {
      await axios.patch(`${serverUrl}/api/donations/${donationId}/accept-delivery`, {}, { withCredentials: true })
      await getCurrentDonationDelivery()
      await getDonationDeliveries()
      showToast(t('db.acceptedDonation', 'Rescue run accepted — plates are waiting'))
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not accept donation delivery', 'error')
    }
  }

  const updateDonationDeliveryStatus = async (donationId, status) => {
    try {
      const result = await axios.patch(`${serverUrl}/api/donations/${donationId}/status`, { status }, { withCredentials: true })
      setCurrentDonationDelivery(result.data.donation)
      if (status === 'delivered') {
        setCurrentDonationDelivery(null)
        await getDonationDeliveries()
      }
      showToast(t('db.statusUpdated', 'Marked {{status}}', { status: status.replace('_', ' ') }))
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update donation delivery', 'error')
    }
  }

  const sendOtp = async () => {
    setLoading(true)
    try {
      await axios.post(`${serverUrl}/api/order/send-delivery-otp`, {
        orderId: currentOrder._id, shopOrderId: currentOrder.shopOrder._id
      }, { withCredentials: true })
      setShowOtpBox(true)
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not send the OTP', 'error')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    setMessage('')
    try {
      const result = await axios.post(`${serverUrl}/api/order/verify-delivery-otp`, {
        orderId: currentOrder._id, shopOrderId: currentOrder.shopOrder._id, otp
      }, { withCredentials: true })
      setMessage(result.data.message)
      showToast(result.data.message || 'Delivery confirmed')
      setCurrentOrder(null)
      setShowOtpBox(false)
      setOtp('')
      await handleTodayDeliveries()
      await getAssignments()
    } catch (error) {
      showToast(error.response?.data?.message || 'Invalid or expired OTP', 'error')
    }
  }

  const handleTodayDeliveries = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-today-deliveries`, { withCredentials: true })
      setTodayDeliveries(result.data)
    } catch (error) {
      console.log(error)
    }
  }

  const cancelOrder = async () => {
    const assignmentId = currentOrder?.shopOrder?.assignment
    if (!assignmentId) {
      showToast('Assignment reference not found.', 'error')
      return
    }
    const confirmCancel = window.confirm(t('db.cancelConfirm', 'Return this order to the available rail?'))
    if (!confirmCancel) return

    setLoading(true)
    try {
      await axios.get(`${serverUrl}/api/order/cancel-assignment/${assignmentId}`, { withCredentials: true })
      setCurrentOrder(null)
      setShowOtpBox(false)
      setOtp('')
      await getAssignments()
      showToast(t('db.returned', 'Order returned to the available rail'))
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to cancel assignment', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getAssignments()
    getCurrentOrder()
    getCancelledOrders()
    getDonationDeliveries()
    getCurrentDonationDelivery()
    handleTodayDeliveries()
  }, [userData])

  /* ---------------- live socket updates ---------------- */
  useEffect(() => {
    if (!socket) return

    socket.on('newAssignment', (data) => {
      setAvailableAssignments(prev => ([...(prev || []), data]))
      showToast(t('db.newOrderAlert', 'New order on the rail'))
    })

    socket.on('newDonationDelivery', () => {
      getDonationDeliveries()
      showToast(t('db.newDonationAlert', 'A rescue run needs a rider'))
    })

    socket.on('update-status', ({ orderId, shopId, status }) => {
      if (status === 'cancelled') {
        setAvailableAssignments(prev => (prev || []).filter(a => a.orderId !== orderId || a.shopId !== shopId))
        setCurrentOrder(prev => {
          const currentShopId = prev?.shopOrder?.shop?._id || prev?.shopOrder?.shop
          if (prev?._id === orderId && currentShopId === shopId) {
            getCancelledOrders()
            setShowOtpBox(false)
            setOtp('')
            return null
          }
          return prev
        })
      }
    })

    return () => {
      socket.off('newAssignment')
      socket.off('newDonationDelivery')
      socket.off('update-status')
    }
  }, [socket])

  const chartData = useMemo(() => todayDeliveries, [todayDeliveries])
  const donationCount = availableDonationDeliveries?.length || 0

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />

      {toast && (
        <div className='toast flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold shadow-lg'
          style={{ background: toast.type === 'error' ? 'var(--danger)' : 'var(--accent)', color: toast.type === 'error' ? '#2a0d08' : 'var(--accent-ink)' }}>
          {toast.message}
        </div>
      )}

      <main className='mx-auto w-full max-w-[900px] px-4 pb-16 pt-6 sm:px-6'>
        {/* ---------- masthead ---------- */}
        <header className='flex flex-wrap items-end justify-between gap-4'>
          <div>
            <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--accent-2)' }}>
              <HiOutlineTruck /> {t('db.eyebrow', 'Delivery partner')}
            </p>
            <h1 className='t-display mt-2'>
              {t('db.greeting', 'Hey')} <span className='gradient-text notranslate'>{(userData?.fullName || '').split(' ')[0]}</span>
            </h1>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <button onClick={() => setSharingLocation(value => !value)} className='btn-ghost !px-3.5 !py-2 text-xs'
              style={sharingLocation ? { color: 'var(--rescue)' } : { color: 'var(--ink-muted)' }}
              aria-pressed={sharingLocation}>
              <HiOutlineLocationMarker /> {sharingLocation ? t('db.liveOn', 'Live location on') : t('db.liveOff', 'Live location off')}
            </button>
            <button onClick={refreshAll} className='btn-ghost !px-3.5 !py-2 text-xs' aria-label='refresh'>
              <HiOutlineArrowPath /> {t('common.refresh', 'Refresh')}
            </button>
            <button onClick={() => navigate('/my-orders')} className='btn-ghost !px-3.5 !py-2 text-xs'>
              <HiOutlineDocumentText /> {t('db.history', 'History')}
            </button>
            <button onClick={() => navigate('/my-analysis')} className='btn-ghost !px-3.5 !py-2 text-xs'>
              <HiOutlineSparkles /> {t('analysis.navLink', 'My analysis')}
            </button>
          </div>
        </header>

        {/* ---------- earnings bento ---------- */}
        <div className='stagger mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4'>
          <div className='tile tile-eat grain p-5'>
            <p className='t-eyebrow'>{t('db.todayEarning', "Today's earnings")}</p>
            <p className='mt-2 font-display text-3xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-2)' }}>
              ₹{totalEarning}
            </p>
            <p className='mt-1 text-xs' style={{ color: 'var(--ink-muted)' }}>₹{RATE_PER_DELIVERY} {t('db.perRun', 'per run')}</p>
          </div>
          <div className='tile grain p-5' style={{ '--tile-tint': 'var(--accent-soft)' }}>
            <p className='t-eyebrow'>{t('db.deliveredToday', 'Delivered today')}</p>
            <p className='mt-2 font-display text-3xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-text)' }}>
              {totalDelivered}
            </p>
          </div>
          <div className='tile grain p-5' style={{ '--tile-tint': 'var(--rescue-soft)' }}>
            <p className='t-eyebrow'>{t('db.rescueRuns', 'Rescue runs waiting')}</p>
            <p className='mt-2 font-display text-3xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--rescue)' }}>
              {donationCount}
            </p>
          </div>
          <div className='tile grain p-5' style={{ '--tile-tint': 'var(--vendor-soft)' }}>
            <p className='t-eyebrow'>{t('db.onRail', 'On the rail')}</p>
            <p className='mt-2 font-display text-3xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--vendor)' }}>
              {availableAssignments.length}
            </p>
          </div>
          <div className='tile grain col-span-2 p-5 lg:col-span-4'>
            <p className='t-eyebrow'>{t('db.hourly', 'Deliveries by hour')}</p>
            <div className='mt-3 h-[180px] w-full'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray='3 3' stroke='var(--border)' />
                  <XAxis dataKey='hour' tickFormatter={(h) => `${h}:00`} tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} />
                  <Tooltip formatter={(value) => [value, t('db.orders', 'orders')]} labelFormatter={label => `${label}:00`}
                    contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--ink)' }} />
                  <Bar dataKey='count' fill='var(--accent)' radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ================= ACTIVE ORDER RUN ================= */}
        {currentOrder && (
          <section className='grain card mt-8 animate-rise-in overflow-hidden card-3d' style={{ borderColor: 'var(--accent-2)' }}>
            <div className='p-5'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <p className='t-eyebrow' style={{ color: 'var(--accent-2)' }}>{t('db.activeRun', 'Active run')}</p>
                  <h2 className='t-title mt-1'>{currentOrder?.shopOrder?.shop?.name}</h2>
                  <p className='mt-1 text-sm' style={{ color: 'var(--ink-soft)' }}>{currentOrder.deliveryAddress?.text}</p>
                </div>
                <div className='text-right'>
                  <p className='font-display text-xl font-black' style={{ fontFamily: 'var(--font-display)' }}>₹{currentOrder.shopOrder?.subtotal}</p>
                  <p className='text-xs' style={{ color: 'var(--ink-muted)' }}>
                    {currentOrder.shopOrder?.shopOrderItems?.length} {t('db.items', 'items')}
                  </p>
                </div>
              </div>

              <div className='mt-4 h-[340px] overflow-hidden rounded-2xl' style={{ border: '1px solid var(--border)' }}>
                <DeliveryBoyTracking data={{
                  deliveryBoyLocation: deliveryBoyLocation || {
                    lat: userData.location.coordinates[1],
                    lon: userData.location.coordinates[0]
                  },
                  customerLocation: {
                    lat: currentOrder.deliveryAddress.latitude,
                    lon: currentOrder.deliveryAddress.longitude
                  }
                }} />
              </div>

              {!showOtpBox ? (
                <div className='mt-4 flex flex-col gap-2 sm:flex-row'>
                  <button className='btn-primary flex-1' onClick={sendOtp} disabled={loading}>
                    <HiOutlineCheckBadge /> {loading ? t('common.loading', 'Sending…') : t('db.sendOtp', 'Mark delivered (send OTP)')}
                  </button>
                  <button className='btn-ghost' onClick={cancelOrder} disabled={loading} style={{ color: 'var(--danger)' }}>
                    {t('db.cancelRun', 'Cancel run')}
                  </button>
                </div>
              ) : (
                <div className='mt-4 rounded-2xl p-4' style={{ background: 'var(--surface-2)', border: '1px dashed var(--border-strong)' }}>
                  <p className='text-sm font-bold'>
                    {t('db.otpSent', 'OTP sent to')} <span className='notranslate'>{currentOrder.user?.fullName}</span>
                  </p>
                  <input type='text' inputMode='numeric' maxLength={4}
                    className='mt-3 w-full px-3 py-2 text-center font-display text-2xl font-black tracking-[0.4em]'
                    placeholder='••••' onChange={(e) => setOtp(e.target.value)} value={otp} aria-label='delivery OTP' />
                  <button className='btn-primary mt-3 w-full' onClick={verifyOtp}>
                    {t('db.verifyOtp', 'Confirm handoff')}
                  </button>
                  {message && <p className='mt-2 text-center text-sm font-bold' style={{ color: 'var(--rescue)' }}>{message}</p>}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================= CURRENT DONATION RUN ================= */}
        {currentDonationDelivery && (
          <section className='grain card mt-6 animate-rise-in overflow-hidden card-3d' style={{ borderColor: 'var(--rescue)' }}>
            <div className='p-5'>
              <p className='t-eyebrow' style={{ color: 'var(--rescue)' }}>{t('db.rescueRun', 'Rescue run in progress')}</p>
              <h2 className='t-title mt-1'>{currentDonationDelivery.assignedTrustId?.name}</h2>
              <div className='mt-2 grid gap-1.5 text-sm' style={{ color: 'var(--ink-soft)' }}>
                <p className='flex items-center gap-1.5'><HiOutlineMapPin size={15} style={{ color: 'var(--rescue)' }} /> {currentDonationDelivery.pickupAddress}</p>
                <p className='flex items-center gap-1.5'><HiOutlineMapPin size={15} style={{ color: 'var(--rescue)' }} /> {currentDonationDelivery.assignedTrustId?.address}</p>
              </div>
              <div className='mt-3 flex flex-wrap gap-2'>
                {(currentDonationDelivery.foodItems || []).map((item, index) => (
                  <span key={index} className='rounded-full px-3 py-1 text-xs font-bold stagger-item' style={{ background: 'var(--rescue-soft)', color: 'var(--rescue)' }}>
                    {item.name} — {item.quantity} {item.unit}
                  </span>
                ))}
              </div>
              <p className='mt-3 text-xs' style={{ color: 'var(--ink-muted)' }}>
                ₹{currentDonationDelivery.deliveryCharge || 50} · <span className='capitalize'>{currentDonationDelivery.deliveryChargePaymentMethod}</span>
              </p>

              <div className='mt-4 flex flex-col gap-2 sm:flex-row'>
                {currentDonationDelivery.status === 'accepted' && (
                  <button className='btn-primary flex-1' style={{ background: 'var(--rescue)', color: '#08130c', boxShadow: 'none' }}
                    onClick={() => updateDonationDeliveryStatus(currentDonationDelivery._id, 'picked_up')}>
                    {t('db.markPicked', 'Picked up')}
                  </button>
                )}
                {currentDonationDelivery.status === 'picked_up' && (
                  <button className='btn-primary flex-1' style={{ background: 'var(--rescue)', color: '#08130c', boxShadow: 'none' }}
                    onClick={() => updateDonationDeliveryStatus(currentDonationDelivery._id, 'delivered')}>
                    {t('db.markDelivered', 'Delivered to trust')}
                  </button>
                )}
                <button className='btn-ghost' onClick={() => navigate('/')}>
                  {t('db.backHome', 'Back to the rail')}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ================= AVAILABLE RAIL — ORDERS ================= */}
        {!currentOrder && (
          <section className='mt-8'>
            <div className='flex items-center justify-between gap-3'>
              <h2 className='t-title flex items-center gap-2'>
                <HiOutlineBellAlert style={{ color: 'var(--accent-2)' }} /> {t('db.availableOrders', 'Available order runs')}
              </h2>
              <span className='badge badge-accent px-2.5 py-1'>{availableAssignments.length}</span>
            </div>
            <div className='stagger mt-4 space-y-3'>
              {availableAssignments.length === 0 && (
                <div className='grain card p-8 text-center card-3d'>
                  <span className='text-4xl' aria-hidden='true'>🛵</span>
                  <p className='mt-3' style={{ color: 'var(--ink-muted)' }}>{t('db.noOrders', 'No order runs on the rail right now.')}</p>
                  <p className='mt-1 text-xs' style={{ color: 'var(--ink-faint)' }}>
                    {sharingLocation
                      ? t('db.railHintLive', 'You will hear about new runs the moment they broadcast.')
                      : t('db.railHintOffline', 'Turn on live location so the rail can reach you first.')}
                  </p>
                </div>
              )}
              {availableAssignments.map((a, index) => (
                <article key={a.assignmentId || index} className='grain card card-hover card-3d p-4 stagger-item' style={{ animationDelay: `${index * 80}ms` }}>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <p className='font-bold'>{a?.shopName}</p>
                      <p className='mt-0.5 text-sm' style={{ color: 'var(--ink-soft)' }}>{a?.deliveryAddress?.text}</p>
                      <p className='mt-0.5 text-xs' style={{ color: 'var(--ink-muted)' }}>
                        {(a.items || []).length} {t('db.items', 'items')} · ₹{a.subtotal}
                      </p>
                    </div>
                    <button className='btn-primary !px-4 !py-2 text-xs' onClick={() => acceptOrder(a.assignmentId)}>
                      {t('db.accept', 'Accept')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ================= AVAILABLE RAIL — DONATIONS ================= */}
        {!currentDonationDelivery && (
          <section className='mt-8'>
            <div className='flex items-center justify-between gap-3'>
              <h2 className='t-title flex items-center gap-2'>
                <HiOutlineHeart style={{ color: 'var(--rescue)' }} /> {t('db.availableDonations', 'Rescue runs (donations)')}
              </h2>
              <span className='badge px-2.5 py-1' style={{ background: 'var(--rescue-soft)', color: 'var(--rescue)' }}>{donationCount}</span>
            </div>
            <div className='stagger mt-4 space-y-3'>
              {donationCount === 0 && (
                <div className='grain card p-8 text-center card-3d'>
                  <span className='text-4xl' aria-hidden='true'>🌾</span>
                  <p className='mt-3' style={{ color: 'var(--ink-muted)' }}>{t('db.noDonations', 'No rescue runs waiting.')}</p>
                </div>
              )}
              {availableDonationDeliveries.map((donation) => (
                <article key={donation._id} className='grain card card-hover card-3d p-4 stagger-item' style={{ animationDelay: `${index * 80}ms` }}>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <p className='font-bold'>{donation.assignedTrustId?.name}</p>
                      <p className='mt-0.5 text-sm' style={{ color: 'var(--ink-soft)' }}>
                        <span style={{ color: 'var(--ink-muted)' }}>Pickup:</span> {donation.pickupAddress}
                      </p>
                      <p className='text-sm' style={{ color: 'var(--ink-soft)' }}>
                        <span style={{ color: 'var(--ink-muted)' }}>Trust:</span> {donation.assignedTrustId?.address}
                      </p>
                      <div className='mt-1.5 flex flex-wrap gap-1.5'>
                        {(donation.foodItems || []).map((item, index) => (
                          <span key={index} className='rounded-full px-2.5 py-0.5 text-[11px] font-bold stagger-item' style={{ background: 'var(--rescue-soft)', color: 'var(--rescue)' }}>
                            {item.name} {item.quantity} {item.unit}
                          </span>
                        ))}
                      </div>
                      <p className='mt-1.5 text-xs' style={{ color: 'var(--ink-muted)' }}>
                        ₹{donation.deliveryCharge || 50} {t('db.deliveryCharge', 'delivery charge')}
                      </p>
                    </div>
                    <button className='rounded-full px-4 py-2 text-xs font-black transition-transform active:scale-95'
                      style={{ background: 'var(--rescue)', color: '#08130c' }} onClick={() => acceptDonationDelivery(donation._id)}>
                      {t('db.acceptRun', 'Accept run')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ================= RETURNED TODAY ================= */}
        {!currentOrder && cancelledOrders?.length > 0 && (
          <section className='mt-8'>
            <h2 className='t-title'>{t('db.cancelled', 'Returned today')}</h2>
            <div className='stagger mt-4 space-y-3'>
              {cancelledOrders.map((a, index) => (
                <div className='grain card p-4 card-3d' key={a.assignmentId || index}>
                  <div className='flex justify-between gap-3'>
                    <div>
                      <p className='text-sm font-bold'>{a?.shopName}</p>
                      <p className='text-sm' style={{ color: 'var(--ink-soft)' }}>{a?.deliveryAddress?.text}</p>
                      <p className='text-xs' style={{ color: 'var(--ink-muted)' }}>
                        {(a.items || []).length} {t('db.items', 'items')} · ₹{a.subtotal}
                      </p>
                    </div>
                    <span className='rounded-full px-3 py-1 text-xs font-bold capitalize' style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                      {a.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default DeliveryBoyDashboard

import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../context/LanguageContext.jsx'
import { serverUrl } from '../App'
import MarketNav from '../components/MarketNav.jsx'
import PriceBandChip from '../components/PriceBandChip.jsx'
import { dm } from '../api/dm'
import {
  HiOutlineStar, HiOutlineMapPin, HiOutlineMinus, HiOutlinePlus,
  HiOutlineShoppingBag, HiOutlineCheck, HiOutlineTrash, HiOutlineArrowLeft,
  HiOutlineChatBubbleLeftRight, HiOutlineShieldCheck, HiOutlineCheckBadge
} from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa6'

const STATUS_STYLES = {
  pending: 'badge-warning',
  confirmed: 'badge-brand',
  ready: 'badge-accent',
  'out of delivery': 'badge-accent',
  delivered: 'badge-success',
  cancelled: 'badge-danger'
}

/* One listing on the stall shelf. */
function ProduceCard({ listing, qty, onSet, name, t, onNegotiate }) {
  const max = listing.availableQuantity || 0
  const out = max <= 0
  return (
    <article className='card card-hover grain flex flex-col overflow-hidden'>
      {listing.image ? (
        <div className='relative h-40 w-full overflow-hidden'>
          <img src={listing.image} alt={listing.name} loading='lazy'
            className='h-full w-full object-cover transition-transform duration-700 hover:scale-105' />
          {listing.isFreshToday && (
            <span className='absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black backdrop-blur-md'
              style={{ background: 'var(--glass-strong)', color: 'var(--rescue)' }}>
              <span className='h-1.5 w-1.5 rounded-full animate-breathe' style={{ background: 'var(--rescue)' }} />
              {t('vendor.freshToday')}
            </span>
          )}
        </div>
      ) : (
        <div className='flex h-28 w-full items-center justify-center text-4xl'
          style={{ background: 'linear-gradient(135deg, var(--vendor-soft), var(--surface-3))' }}>🧺</div>
      )}

      <div className='flex flex-1 flex-col p-4'>
        <div className='flex items-start justify-between gap-2'>
          <h3 className='t-title !text-[1.05rem]'>{name}</h3>
        </div>
        <p className='mt-1.5 flex flex-wrap items-center gap-1.5 text-xs' style={{ color: 'var(--ink-muted)' }}>
          <span className='rounded-full px-2 py-0.5 font-bold capitalize' style={{ background: 'var(--vendor-soft)', color: 'var(--vendor)' }}>
            {t(`vendor.${listing.category || 'other'}`, { defaultValue: listing.category || 'Other' })}
          </span>
          <span className='rounded-full px-2 py-0.5 font-semibold' style={{ background: 'var(--surface-2)' }}>
            {max} {listing.unit || 'kg'} {t('vendorShop.inStock')}
          </span>
          {listing.grade && <span className='badge badge-brand'>Grade {listing.grade}</span>}
          {listing.certifications?.map(cert => <span key={cert} className='badge badge-success capitalize'>{cert.replace('-', ' ')}</span>)}
          {listing.minOrderQty > 0 && <span className='badge badge-muted'>min {listing.minOrderQty} {listing.unit}</span>}
        </p>
        {listing.freshnessNote && (
          <p className='mt-2 line-clamp-2 text-xs italic' style={{ color: 'var(--rescue)' }}>"{listing.freshnessNote}"</p>
        )}

        <div className='mt-auto pt-4'>
          {onNegotiate && listing.negotiable && !out && (
            <button onClick={() => onNegotiate(listing._id)} className='link-brand mb-1.5 inline-flex items-center gap-1 text-xs'>
              <HiOutlineChatBubbleLeftRight size={13} /> Negotiate price
            </button>
          )}
          {listing.harvestDate && (
            <p className='mb-1 text-[11px]' style={{ color: 'var(--ink-faint)' }}>
              Harvested {new Date(listing.harvestDate).toLocaleDateString()}
            </p>
          )}
          <div className='flex items-end justify-between'>
            <div>
              <p className='font-display text-2xl font-semibold tracking-tight' style={{ fontFamily: 'var(--font-display)' }}>
                ₹{listing.pricePerUnit || 0}
                <span className='ml-1 align-middle text-xs font-medium' style={{ color: 'var(--ink-muted)' }}>
                  /{t('vendor.perUnit', { unit: listing.unit || 'kg' })}
                </span>
              </p>
              {onNegotiate && (
                <div className='mt-1'><PriceBandChip crop={listing.name} price={listing.pricePerUnit} /></div>
              )}
            </div>

            {out ? (
              <span className='badge badge-muted px-3 py-1.5'>{t('vendorShop.soldOut')}</span>
            ) : qty === 0 ? (
              <button onClick={() => onSet(listing, 1)} aria-label={t('vendor.addToCart')} title={t('vendor.addToCart')}
                className='flex h-11 w-11 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-90'
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)', boxShadow: 'var(--shadow-lime)' }}>
                <HiOutlinePlus size={20} strokeWidth={2.5} />
              </button>
            ) : (
              <div className='flex items-center gap-0.5 rounded-full border p-1 shadow-md'
                style={{ borderColor: 'var(--border-strong)', background: 'var(--surface-2)' }}>
                <button onClick={() => onSet(listing, qty - 1)} aria-label='decrease'
                  className='flex h-8 w-8 items-center justify-center rounded-full active:scale-90' style={{ color: 'var(--ink-soft)' }}>
                  <HiOutlineMinus size={16} strokeWidth={2.5} />
                </button>
                <span className='w-6 text-center text-sm font-black'>{qty}</span>
                <button onClick={() => onSet(listing, qty + 1)} disabled={qty >= max} aria-label='increase'
                  className='flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40 active:scale-90' style={{ color: 'var(--accent)' }}>
                  <HiOutlinePlus size={16} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

function VendorShopPage() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const navigate = useNavigate()
  const { vendorId } = useParams()
  const { userData, currentAddress } = useSelector((state) => state.user)

  const [vendor, setVendor] = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [basket, setBasket] = useState({}) // listingId -> qty
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState(userData?.mobile || '')
  const [note, setNote] = useState('')
  const [placing, setPlacing] = useState(false)
  const [toast, setToast] = useState(null)
  const [placedOrder, setPlacedOrder] = useState(null)

  const [rating, setRating] = useState(0)
  const [ratingMessage, setRatingMessage] = useState('')
  const [myOrders, setMyOrders] = useState([])
  const [showOrders, setShowOrders] = useState(false)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3500)
  }

  const loadOrders = () => {
    axios.get(`${serverUrl}/api/vendor/orders/mine`, { withCredentials: true })
      .then(res => setMyOrders(res.data?.orders || []))
      .catch(() => { })
  }

  useEffect(() => {
    axios.get(`${serverUrl}/api/vendor/${vendorId}`, { withCredentials: true })
      .then((res) => {
        setVendor(res.data?.vendorProfile)
        setListings(res.data?.listings || [])
      })
      .catch((err) => setError(err.response?.data?.message || t('common.loading')))
      .finally(() => setLoading(false))
  }, [vendorId])

  useEffect(() => {
    if (userData?.role === 'user') loadOrders()
  }, [userData?.role])

  useEffect(() => {
    const initial = typeof currentAddress === 'string' ? currentAddress : currentAddress?.text || ''
    if (initial) setAddress(initial)
  }, [currentAddress])

  const listingName = (listing) => {
    if (listing.nameInLanguage && listing.nameInLanguage[language]) return listing.nameInLanguage[language]
    return listing.name || ''
  }

  const basketCount = useMemo(() => Object.values(basket).reduce((s, q) => s + q, 0), [basket])
  const basketTotal = useMemo(
    () => listings.reduce((sum, l) => sum + (basket[l._id] ? basket[l._id] * (l.pricePerUnit || 0) : 0), 0),
    [basket, listings]
  )
  const freshArrivals = useMemo(() => listings.filter(l => l.isFreshToday), [listings])

  const setQty = (listing, qty) => {
    const max = Math.max(0, listing.availableQuantity || 0)
    const next = Math.max(0, Math.min(qty, max))
    setBasket(prev => {
      const copy = { ...prev }
      if (next === 0) delete copy[listing._id]
      else copy[listing._id] = next
      return copy
    })
  }

  const placeOrder = async () => {
    if (!address.trim()) { showToast(t('vendorShop.needAddress'), 'error'); return }
    if (!basketCount) { showToast(t('vendorShop.needItems'), 'error'); return }
    setPlacing(true)
    try {
      const items = Object.entries(basket).map(([listingId, quantity]) => ({ listingId, quantity }))
      const { data } = await axios.post(`${serverUrl}/api/vendor/orders`, {
        vendorId,
        items,
        deliveryAddress: { text: address.trim() },
        contactPhone: phone.trim(),
        note: note.trim(),
        paymentMethod: 'cod'
      }, { withCredentials: true })
      setPlacedOrder(data.order)
      setBasket({})
      setCheckoutOpen(false)
      showToast(t('vendorShop.placed'))
      loadOrders()
    } catch (err) {
      showToast(err.response?.data?.message || t('vendorShop.placeFailed'), 'error')
    } finally {
      setPlacing(false)
    }
  }

  const cancelOrder = async (order) => {
    try {
      await axios.post(`${serverUrl}/api/vendor/orders/${order._id}/cancel`, {}, { withCredentials: true })
      showToast(t('vendorShop.cancelled'))
      loadOrders()
    } catch (err) {
      showToast(err.response?.data?.message || t('vendorShop.placeFailed'), 'error')
    }
  }

  const submitRating = async () => {
    if (!rating) return
    setRatingMessage('')
    try {
      const res = await axios.post(`${serverUrl}/api/vendor/${vendorId}/rate`, { rating }, { withCredentials: true })
      setVendor((prev) => ({ ...prev, rating: res.data?.vendorProfile?.rating }))
      setRatingMessage(t('vendor.ratingThanks'))
      showToast(t('vendor.ratingThanks'))
    } catch (err) {
      setRatingMessage(err.response?.data?.message || t('common.loading'))
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen lg:pl-[76px]'>
        <MarketNav />
        <main className='mx-auto max-w-6xl px-4 py-10 sm:px-6'>
          <div className='skeleton h-12 w-64' />
          <div className='skeleton mt-6 h-56 w-full' style={{ borderRadius: 'var(--radius-xl)' }} />
          <div className='mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
            {[0, 1, 2].map(i => <div key={i} className='skeleton h-72 w-full' style={{ borderRadius: 'var(--radius-xl)' }} />)}
          </div>
        </main>
      </div>
    )
  }

  const ratingValue = vendor?.rating?.average || 0

  const startNegotiation = async (listingId) => {
    try {
      const res = await dm.post('/threads', { farmerId: vendor._id, listingId: listingId || null })
      navigate('/farmers/inbox', { state: { threadId: res.data?.thread?._id } })
    } catch { /* buyers without onboarding are redirected by the route guard */ }
  }

  return (
    <div className='min-h-screen pb-32 lg:pl-[76px]'>
      <MarketNav />

      {toast && (
        <div className={`toast flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold shadow-xl ${toast.type === 'error' ? 'badge-danger' : 'badge-success'}`}
          style={toast.type === 'error' ? { background: 'var(--danger)', color: '#fff' } : { background: 'var(--rescue)', color: '#0c110e' }}>
          {toast.message}
        </div>
      )}

      <main className='mx-auto max-w-6xl px-4 py-8 sm:px-6'>
        <button onClick={() => navigate('/vendors/nearby')} className='link-brand mb-5 inline-flex items-center gap-2 text-sm'>
          <HiOutlineArrowLeft size={16} /> {t('vendor.back')}
        </button>

        {error && !vendor && (
          <div className='card grain p-10 text-center' style={{ color: 'var(--ink-muted)' }}>{error}</div>
        )}

        {/* ============ The stall: story header ============ */}
        {vendor && (
          <section className='tile grain animate-rise-in overflow-hidden'>
            {vendor.profilePhoto ? (
              <img src={vendor.profilePhoto} alt={vendor.displayName || ''} className='h-56 w-full object-cover' />
            ) : (
              <div className='flex h-44 w-full items-center justify-center text-6xl'
                style={{ background: 'linear-gradient(135deg, var(--vendor-soft), var(--surface-3))' }}>🧺</div>
            )}
            <div className='p-6 sm:p-8'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <p className='t-eyebrow' style={{ color: 'var(--vendor)' }}>{t('stall.eyebrow')}</p>
                  <h1 className='t-display mt-1 !text-[2rem]'>{vendor.displayName || ''}</h1>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {vendor.isFreshToday && (
                    <span className='badge badge-success px-3 py-1.5'>
                      <span className='h-1.5 w-1.5 rounded-full animate-breathe' style={{ background: 'var(--rescue)' }} />
                      🌿 {t('vendor.freshToday')}
                    </span>
                  )}
                  {vendor.preferredPayment && vendor.preferredPayment !== 'cash' && (
                    <span className='badge badge-brand px-3 py-1.5'>{vendor.preferredPayment.toUpperCase()}</span>
                  )}
                </div>
              </div>

              <p className='mt-2 flex items-center gap-1.5 text-sm' style={{ color: 'var(--ink-muted)' }}>
                <HiOutlineMapPin size={15} style={{ color: 'var(--vendor)' }} />
                {[vendor.location?.landmark, vendor.location?.district, vendor.location?.state].filter(Boolean).join(', ') || t('vendor.locationPending')}
              </p>

              <div className='mt-3 flex items-center gap-1' aria-label={`${ratingValue} out of 5`}>
                {[1, 2, 3, 4, 5].map(star => (
                  <HiOutlineStar key={star} size={17}
                    style={{ color: star <= Math.round(ratingValue) ? 'var(--warning)' : 'var(--surface-3)' }}
                    fill={star <= Math.round(ratingValue) ? 'var(--warning)' : 'none'} />
                ))}
                <span className='ml-1.5 text-sm' style={{ color: 'var(--ink-muted)' }}>
                  {ratingValue} ({vendor?.rating?.count || 0})
                </span>
              </div>

              {(vendor.freshnessNote || listings.some(l => l.freshnessNote)) && (
                <blockquote className='mt-5 rounded-2xl border-l-4 p-4'
                  style={{ borderColor: 'var(--vendor)', background: 'var(--vendor-soft)' }}>
                  <p className='t-eyebrow !text-[10px]' style={{ color: 'var(--vendor)' }}>{t('stall.storyEyebrow')}</p>
                  <p className='t-title mt-1 !text-[1.02rem] italic'>
                    "{vendor.freshnessNote || listings.find(l => l.freshnessNote)?.freshnessNote}"
                  </p>
                </blockquote>
              )}

              {/* ============ Farmer trust card ============ */}
              <div className='grain card mt-5 p-4'>
                <div className='flex flex-wrap items-center gap-2'>
                  <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--vendor)' }}>
                    <HiOutlineShieldCheck size={14} /> The farmer
                  </p>
                  {vendor.farmer?.aadhaarStatus === 'verified' && <span className='badge badge-success'><HiOutlineCheckBadge size={12} /> Aadhaar verified</span>}
                  {vendor.farmer?.aadhaarStatus === 'pending' && <span className='badge badge-warning'>Verification pending</span>}
                  {vendor.farmer?.organic && <span className='badge badge-success'>Organic / natural</span>}
                  {vendor.farmer?.fpoName && <span className='badge badge-muted'>FPO: {vendor.farmer.fpoName}</span>}
                </div>
                {(vendor.farmer?.village || vendor.farmer?.taluk) && (
                  <p className='mt-2 text-sm' style={{ color: 'var(--ink-soft)' }}>
                    {[vendor.farmer?.farmSizeAcres && `${vendor.farmer.farmSizeAcres} acres`,
                      vendor.farmer?.village,
                      vendor.farmer?.taluk,
                      vendor.farmer?.yearsExperience && `${vendor.farmer.yearsExperience} yrs farming`].filter(Boolean).join(' · ')}
                  </p>
                )}
                {vendor.farmer?.story && <p className='mt-1.5 text-sm' style={{ color: 'var(--ink-muted)' }}>{vendor.farmer.story}</p>}
                {vendor.farmer?.cropsGrown?.length > 0 && (
                  <div className='mt-2 flex flex-wrap gap-1.5'>
                    {vendor.farmer.cropsGrown.map(crop => (
                      <span key={crop} className='rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize' style={{ background: 'var(--vendor-soft)', color: 'var(--vendor)' }}>{crop}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {vendor && (
          <>
            {/* ============ Fresh arrivals rail ============ */}
            {freshArrivals.length > 0 && (
              <section className='mt-8'>
                <div className='flex items-end justify-between gap-3'>
                  <h2 className='section-heading'>{t('stall.arrivals')}</h2>
                  {userData?.role === 'user' && myOrders.length > 0 && (
                    <button onClick={() => setShowOrders(o => !o)} className='link-brand inline-flex items-center gap-1.5 text-sm'>
                      <HiOutlineShoppingBag size={15} /> {t('vendorShop.myOrdersHere', { count: myOrders.length })}
                    </button>
                  )}
                </div>
                <div className='mt-4 flex gap-4 overflow-x-auto pb-2'>
                  {freshArrivals.map(listing => (
                    <div key={listing._id} className='w-[270px] shrink-0'>
                      <ProduceCard listing={listing} qty={basket[listing._id] || 0} onSet={setQty} name={listingName(listing)} t={t} onNegotiate={startNegotiation} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ============ The shelves ============ */}
            <section className='mt-8'>
              <div className='flex items-end justify-between gap-3'>
                <h2 className='section-heading'>{t('stall.shelves')}</h2>
                {freshArrivals.length === 0 && userData?.role === 'user' && myOrders.length > 0 && (
                  <button onClick={() => setShowOrders(o => !o)} className='link-brand inline-flex items-center gap-1.5 text-sm'>
                    <HiOutlineShoppingBag size={15} /> {t('vendorShop.myOrdersHere', { count: myOrders.length })}
                  </button>
                )}
              </div>

              {showOrders && myOrders.length > 0 && (
                <div className='card animate-fade-in mt-4 divide-y p-2' style={{ borderColor: 'var(--border)' }}>
                  {myOrders.map(order => (
                    <div key={order._id} className='flex flex-wrap items-center gap-3 p-4'>
                      <div className='min-w-0 flex-1'>
                        <p className='text-sm font-bold'>
                          {order.items.map(i => `${i.name} ×${i.quantity}${i.unit ? ` ${i.unit}` : ''}`).join(', ')}
                        </p>
                        <p className='text-xs' style={{ color: 'var(--ink-muted)' }}>{new Date(order.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`badge ${STATUS_STYLES[order.status] || 'badge-muted'} px-3 py-1.5`}>
                        {t(`vendorShop.status.${order.status.replace(/ /g, '_')}`, order.status)}
                      </span>
                      <span className='font-display font-semibold' style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>₹{order.totalAmount}</span>
                      {!['delivered', 'cancelled'].includes(order.status) && (
                        <button onClick={() => cancelOrder(order)} className='badge badge-danger px-3 py-1.5'>
                          {t('common.cancel')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className='stagger mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                {listings.map(listing => (
                  <ProduceCard key={listing._id} listing={listing} qty={basket[listing._id] || 0}
                    onSet={setQty} name={listingName(listing)} t={t} onNegotiate={startNegotiation} />
                ))}
              </div>

              {listings.length === 0 && (
                <div className='card mt-4 p-12 text-center'>
                  <span className='text-4xl' aria-hidden='true'>🧺</span>
                  <p className='mt-3' style={{ color: 'var(--ink-muted)' }}>{t('vendor.noListings')}</p>
                </div>
              )}
            </section>

            {/* ============ Rate the stall ============ */}
            {userData?.role === 'user' && (
              <section className='card grain mt-10 p-6'>
                <h2 className='t-title'>{t('vendor.rateVendor')}</h2>
                <div className='mt-3 flex items-center gap-1.5'>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => setRating(star)} aria-label={`${star} star`}
                      className='transition-transform hover:scale-125 active:scale-95'>
                      <HiOutlineStar size={26}
                        style={{ color: star <= rating ? 'var(--warning)' : 'var(--surface-3)' }}
                        fill={star <= rating ? 'var(--warning)' : 'none'} />
                    </button>
                  ))}
                  {rating > 0 && <button onClick={() => setRating(0)} className='ml-2 text-xs underline' style={{ color: 'var(--ink-muted)' }}>{t('common.cancel')}</button>}
                </div>
                <button className='btn-primary mt-4' onClick={submitRating} disabled={!rating}>
                  <HiOutlineCheck /> {t('vendor.submitRating')}
                </button>
                {ratingMessage && <p className='mt-2 text-sm' style={{ color: 'var(--rescue)' }}>{ratingMessage}</p>}
              </section>
            )}
          </>
        )}
      </main>

      {/* ============ Basket bar (not a cart) ============ */}
      {vendor && basketCount > 0 && !checkoutOpen && (
        <div className='fixed inset-x-0 bottom-[4.6rem] z-40 animate-rise-in px-3 lg:bottom-4 lg:pl-[92px] lg:pr-6'>
          <div className='grain mx-auto flex max-w-3xl items-center gap-4 rounded-full border p-3 pl-4 shadow-2xl'
            style={{ background: 'var(--glass-strong)', borderColor: 'var(--border-strong)', backdropFilter: 'blur(18px)' }}>
            <span className='relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl'
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
              <HiOutlineShoppingBag size={20} strokeWidth={2} />
              <span className='absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 px-1 text-[10px] font-black'
                style={{ background: 'var(--vendor)', color: '#1c1006', borderColor: 'var(--bg)' }}>
                {basketCount}
              </span>
            </span>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-bold'>{t('vendorShop.basketCount', { count: basketCount })}</p>
              <p className='text-xs' style={{ color: 'var(--ink-muted)' }}>≈ ₹{basketTotal.toFixed(0)} · {t('vendorShop.codOnly')}</p>
            </div>
            <button onClick={() => setCheckoutOpen(true)} className='btn-primary !py-2.5'>
              {t('vendorShop.checkout')} →
            </button>
          </div>
        </div>
      )}

      {/* ============ Checkout sheet ============ */}
      {checkoutOpen && (
        <div className='modal-overlay' onClick={() => !placing && setCheckoutOpen(false)}>
          <div className='modal-card grain max-w-lg p-6' onClick={e => e.stopPropagation()}>
            <h2 className='t-title'>{t('vendorShop.checkoutTitle')}</h2>

            {placedOrder ? (
              <div className='mt-6 text-center'>
                <span className='mx-auto flex h-16 w-16 items-center justify-center rounded-full'
                  style={{ background: 'var(--rescue-soft)' }}>
                  <HiOutlineCheck size={30} style={{ color: 'var(--rescue)' }} />
                </span>
                <h3 className='t-title mt-3'>{t('vendorShop.placedTitle')}</h3>
                <p className='mt-1 text-sm' style={{ color: 'var(--ink-muted)' }}>{t('vendorShop.placedHint')}</p>
                <div className='mt-4 rounded-2xl p-4 text-sm' style={{ background: 'var(--rescue-soft)' }}>
                  <p className='font-bold' style={{ color: 'var(--rescue)' }}>
                    {placedOrder.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                  </p>
                  <p className='mt-1' style={{ color: 'var(--rescue)' }}>
                    {t('cart.total')}: <b>₹{placedOrder.totalAmount}</b> · {t('vendorShop.codOnly')}
                  </p>
                </div>
                <div className='mt-5 flex flex-wrap justify-center gap-2'>
                  <button onClick={() => { setCheckoutOpen(false); setPlacedOrder(null) }} className='btn-ghost'>
                    {t('vendorShop.keepShopping')}
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(t('vendorShop.shareText', { vendor: vendor?.displayName || '', total: placedOrder.totalAmount }))}`}
                    target='_blank' rel='noreferrer'
                    className='btn-primary !bg-[#25d366]' style={{ color: '#08110a', boxShadow: 'none' }}>
                    <FaWhatsapp /> WhatsApp
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div className='mt-4 max-h-44 space-y-2 overflow-y-auto pr-1'>
                  {listings.filter(l => basket[l._id]).map(listing => (
                    <div key={listing._id} className='flex items-center justify-between rounded-xl border p-3'
                      style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-bold'>{listingName(listing)}</p>
                        <p className='text-xs' style={{ color: 'var(--ink-muted)' }}>
                          ₹{listing.pricePerUnit}/{listing.unit} × {basket[listing._id]}
                        </p>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='font-display text-sm font-semibold' style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
                          ₹{(listing.pricePerUnit * basket[listing._id]).toFixed(0)}
                        </span>
                        <button onClick={() => setQty(listing, 0)} className='badge badge-danger p-1.5' aria-label='remove'>
                          <HiOutlineTrash size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <label className='mt-4 block text-sm font-bold'>
                  <span className='flex items-center gap-1.5'><HiOutlineMapPin className='inline' style={{ color: 'var(--vendor)' }} /> {t('schedule.deliveryAddress')}</span>
                  <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} className='mt-1.5 w-full px-3 py-2 text-sm' placeholder={t('schedule.addressPlaceholder')} />
                </label>

                <label className='mt-3 block text-sm font-bold'>
                  {t('vendorShop.phone')}
                  <input value={phone} onChange={e => setPhone(e.target.value)} type='tel' className='mt-1.5 w-full px-3 py-2 text-sm' placeholder='98765 43210' />
                </label>

                <label className='mt-3 block text-sm font-bold'>
                  {t('vendorShop.note')}
                  <input value={note} onChange={e => setNote(e.target.value)} className='mt-1.5 w-full px-3 py-2 text-sm' placeholder={t('vendorShop.notePlaceholder')} />
                </label>

                <div className='mt-4 flex items-center justify-between rounded-2xl px-4 py-3'
                  style={{ background: 'var(--accent-soft)' }}>
                  <span className='text-sm font-bold'>{t('cart.total')}</span>
                  <span className='font-display text-xl font-semibold' style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
                    ₹{basketTotal.toFixed(0)}
                  </span>
                </div>

                <div className='mt-5 flex gap-2'>
                  <button onClick={() => setCheckoutOpen(false)} disabled={placing} className='btn-ghost flex-1'>
                    {t('common.cancel')}
                  </button>
                  <button onClick={placeOrder} disabled={placing} className='btn-primary flex-1'>
                    <HiOutlineCheck /> {placing ? t('common.loading') : t('vendorShop.placeOrder')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default VendorShopPage

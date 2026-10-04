import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MarketNav from '../components/MarketNav.jsx'
import PriceBandChip from '../components/PriceBandChip.jsx'
import { dm } from '../api/dm'
import {
  HiOutlineMagnifyingGlass, HiOutlineChatBubbleLeftRight, HiOutlineBellAlert,
  HiOutlineMapPin, HiOutlineShieldCheck, HiOutlineSparkles
} from 'react-icons/hi2'

/*
 * Buyer matches: rule-based (category overlap → distance → rating) farmers whose
 * live listings fit the buyer profile. Each card opens a negotiation thread or
 * subscribes a price alert for that crop.
 * Dark + light: tokens. Mobile: single column cards.
 */
function BuyerMatchesPage() {
  const navigate = useNavigate()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [toast, setToast] = useState(null)
  const [alertForm, setAlertForm] = useState({ crop: '', district: '', maxPricePerUnit: '' })

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3500)
  }

  const load = () => dm.get('/buyer/matches')
    .then(res => setMatches(res.data?.matches || []))
    .catch(error => {
      if (error.response?.status === 400) setNeedsOnboarding(true)
    })

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const startThread = async (listing) => {
    try {
      const res = await dm.post('/threads', { farmerId: listing.vendorId?._id || listing.vendorId, listingId: listing._id })
      navigate('/farmers/inbox', { state: { threadId: res.data?.thread?._id } })
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not start chat', 'error')
    }
  }

  const subscribeAlert = async (e) => {
    e.preventDefault()
    try {
      await dm.post('/prices/alerts', { crop: alertForm.crop, district: alertForm.district, maxPricePerUnit: Number(alertForm.maxPricePerUnit) })
      showToast(`Watching ${alertForm.crop} in ${alertForm.district} under ₹${alertForm.maxPricePerUnit}`)
      setAlertForm({ crop: '', district: '', maxPricePerUnit: '' })
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not set alert', 'error')
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen lg:pl-[76px]'>
        <MarketNav />
        <main className='mx-auto max-w-4xl px-4 py-10'><div className='skeleton h-10 w-64' /></main>
      </div>
    )
  }

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />
      {toast && (
        <div className='toast rounded-full px-5 py-3 text-sm font-bold shadow-lg'
          style={{ background: toast.type === 'error' ? 'var(--danger)' : 'var(--accent)', color: toast.type === 'error' ? '#2a0d08' : 'var(--accent-ink)' }}>
          {toast.message}
        </div>
      )}
      <main className='mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-6'>
        <header className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <p className='t-eyebrow' style={{ color: 'var(--vendor)' }}>Matched to your buying profile</p>
            <h1 className='t-display mt-2'>Farmers who fit your kitchen</h1>
          </div>
          <button className='btn-ghost !px-3.5 !py-2 text-xs' onClick={() => navigate('/buyer/onboard')}>Edit buyer profile</button>
        </header>

        {needsOnboarding && (
          <div className='grain card mt-6 p-10 text-center'>
            <HiOutlineMagnifyingGlass size={32} style={{ color: 'var(--ink-faint)' }} />
            <p className='mt-3 font-bold'>Complete buyer onboarding first</p>
            <button className='btn-primary mt-4' onClick={() => navigate('/buyer/onboard')}>Become a buyer</button>
          </div>
        )}

        <div className='stagger mt-6 space-y-3'>
          {!needsOnboarding && matches.length === 0 && (
            <div className='grain card p-10 text-center'>
              <span className='text-4xl' aria-hidden='true'>🧑‍🌾</span>
              <p className='mt-3 text-sm' style={{ color: 'var(--ink-muted)' }}>No live matches right now. Set an alert below and we will ping you when a listing lands.</p>
            </div>
          )}
          {matches.map(({ listing, farmer }) => (
            <article key={listing._id} className='grain card card-hover p-4'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='font-bold'>{listing.name}
                    {listing.grade && <span className='badge badge-brand ml-2'>Grade {listing.grade}</span>}
                    {listing.negotiable && <span className='badge badge-accent ml-1.5'>Negotiable</span>}
                  </p>
                  <p className='mt-0.5 text-sm' style={{ color: 'var(--ink-soft)' }}>
                    <HiOutlineMapPin className='mr-1 inline' size={13} />
                    {farmer?.displayName} · {farmer?.farmer?.village || farmer?.location?.district || 'Farm'}
                    {farmer?.farmer?.organic && <span className='badge badge-success ml-2'>Organic</span>}
                    {farmer?.farmer?.aadhaarStatus === 'verified' && <HiOutlineShieldCheck className='ml-2 inline' style={{ color: 'var(--rescue)' }} />}
                  </p>
                  <p className='mt-1 text-xs' style={{ color: 'var(--ink-muted)' }}>
                    ₹{listing.pricePerUnit}/{listing.unit} · {listing.availableQuantity} available
                    {listing.minOrderQty ? ` · min ${listing.minOrderQty} ${listing.unit}` : ''}
                  </p>
                  <div className='mt-2'>
                    <PriceBandChip crop={listing.name} district={farmer?.location?.district} price={listing.pricePerUnit} />
                  </div>
                </div>
                <button className='btn-primary !px-4 !py-2 text-xs' onClick={() => startThread(listing)}>
                  <HiOutlineChatBubbleLeftRight /> Message & negotiate
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* price alert subscription */}
        <section className='grain card mt-8 p-5'>
          <h2 className='t-title flex items-center gap-2'><HiOutlineBellAlert style={{ color: 'var(--rescue)' }} /> Watch a price</h2>
          <p className='mt-1 text-sm' style={{ color: 'var(--ink-muted)' }}>
            We will notify you the moment a farmer lists your crop below your price in your district.
          </p>
          <form className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]' onSubmit={subscribeAlert}>
            <input className='px-3 py-2 text-sm' placeholder='Crop' value={alertForm.crop} onChange={e => setAlertForm(f => ({ ...f, crop: e.target.value }))} aria-label='Crop' />
            <input className='px-3 py-2 text-sm' placeholder='District' value={alertForm.district} onChange={e => setAlertForm(f => ({ ...f, district: e.target.value }))} aria-label='District' />
            <input className='px-3 py-2 text-sm' placeholder='Max ₹/kg' inputMode='decimal' value={alertForm.maxPricePerUnit} onChange={e => setAlertForm(f => ({ ...f, maxPricePerUnit: e.target.value }))} aria-label='Max price' />
            <button className='btn-primary !px-5 !py-2 text-sm'><HiOutlineSparkles /> Alert me</button>
          </form>
        </section>
      </main>
    </div>
  )
}

export default BuyerMatchesPage

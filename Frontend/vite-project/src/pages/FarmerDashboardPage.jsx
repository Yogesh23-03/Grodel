import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MarketNav from '../components/MarketNav.jsx'
import PriceBandChip from '../components/PriceBandChip.jsx'
import { dm } from '../api/dm'
import { serverUrl } from '../App'
import axios from 'axios'
import {
  HiOutlineUser, HiOutlineInbox, HiOutlineCurrencyRupee, HiOutlineBanknotes,
  HiOutlineUsers, HiOutlineSparkles, HiOutlineMapPin, HiOutlineArrowTopRightOnSquare,
  HiOutlineWrenchScrewdriver
} from 'react-icons/hi2'

/*
 * Farmer dashboard — extends the vendor dashboard (data from GET /api/vendor/dashboard)
 * with the Direct Market Access layer: farmer identity card, buyer interest (threads
 * grouped by buyer type), price-band chips per listing, and cooperative shares.
 * Dark + light: pure tokens (vendor/terracotta mode). Mobile: single-column bento.
 */
function FarmerDashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userData } = useSelector(state => state.user)
  const [profile, setProfile] = useState(null)
  const [listings, setListings] = useState([])
  const [threads, setThreads] = useState([])
  const [coops, setCoops] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ farmSizeAcres: '', village: '', taluk: '', yearsExperience: '', organic: false, fpoName: '', story: '', cropsGrown: '' })

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    Promise.all([
      axios.get(`${serverUrl}/api/vendor/dashboard`, { withCredentials: true }),
      dm.get('/threads').catch(() => ({ data: { threads: [] } })),
      axios.get(`${serverUrl}/api/vendor/orders/incoming`, { withCredentials: true }).catch(() => ({ data: { orders: [] } }))
    ]).then(([dash, th, inc]) => {
      setProfile(dash.data?.vendorProfile || null)
      setListings(dash.data?.listings || [])
      setThreads(th.data?.threads || [])
      const coopRefs = (inc.data?.orders || []).filter(o => o.coopOrderId).map(o => o.coopOrderId)
      setCoops(coopRefs)
    }).catch(() => showToast('Could not load the dashboard', 'error')).finally(() => setLoading(false))
  }, [])

  const buyerInterest = useMemo(() => {
    const groups = { retailer: [], hotel: [], canteen: [], exporter: [], consumer: [] }
    threads.forEach(th => {
      const type = th.buyerId?.buyerProfile?.buyerType || 'consumer'
      if (groups[type]) groups[type].push(th)
    })
    return groups
  }, [threads])

  const openThread = async (thread) => navigate('/farmers/inbox', { state: { threadId: thread._id } })

  const saveFarmerProfile = async (e) => {
    e.preventDefault()
    try {
      const res = await dm.put('/farmer/profile', {
        farmer: {
          farmSizeAcres: Number(form.farmSizeAcres) || null,
          village: form.village,
          taluk: form.taluk,
          yearsExperience: Number(form.yearsExperience) || null,
          organic: form.organic,
          fpoName: form.fpoName,
          story: form.story,
          cropsGrown: form.cropsGrown.split(',').map(s => s.trim()).filter(Boolean)
        }
      })
      setProfile(res.data?.profile)
      setEditing(false)
      showToast('Farm profile saved')
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not save farm profile', 'error')
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen lg:pl-[76px]'>
        <MarketNav />
        <main className='mx-auto max-w-6xl px-4 py-10'>
          <div className='skeleton h-10 w-72' />
          <div className='mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3'>
            {[0, 1, 2].map(i => <div key={i} className='skeleton h-28 rounded-2xl' />)}
          </div>
        </main>
      </div>
    )
  }

  const pendingInterest = threads.filter(th => !th.messages?.length && !th.offers?.length).length

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />
      {toast && (
        <div className='toast flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold shadow-lg'
          style={{ background: toast.type === 'error' ? 'var(--danger)' : 'var(--accent)', color: toast.type === 'error' ? '#2a0d08' : 'var(--accent-ink)' }}>
          {toast.message}
        </div>
      )}

      <main className='mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6'>
        <header className='flex flex-wrap items-end justify-between gap-4'>
          <div>
            <p className='t-eyebrow' style={{ color: 'var(--vendor)' }}>Direct market access</p>
            <h1 className='t-display mt-2'>
              {t('db.greeting', 'Namaste')} <span className='gradient-text notranslate'>{(profile?.displayName || userData?.fullName || '').split(' ')[0]}</span>
            </h1>
          </div>
          <div className='flex flex-wrap gap-2'>
            <button className='btn-ghost !px-3.5 !py-2 text-xs' onClick={() => navigate('/vendor/add-produce')}>
              <HiOutlineSparkles /> List produce
            </button>
            <button className='btn-ghost !px-3.5 !py-2 text-xs' onClick={() => navigate('/farmer/assistant')}>
              <HiOutlineWrenchScrewdriver /> Ask the assistant
            </button>
          </div>
        </header>

        {/* ---------- identity / verify bento ---------- */}
        <div className='stagger mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4'>
          <div className='tile grain p-5' style={{ '--tile-tint': 'var(--vendor-soft)' }}>
            <p className='t-eyebrow'>Aadhaar status</p>
            <p className='mt-2 font-display text-xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--vendor)' }}>
              {(profile?.farmer?.aadhaarStatus || 'unverified').toUpperCase()}
            </p>
            <button className='link-brand mt-1 text-xs' onClick={() => setEditing(true)}>Edit farm profile</button>
          </div>
          <div className='tile grain p-5' style={{ '--tile-tint': 'var(--accent-2-soft)' }}>
            <p className='t-eyebrow'>Buyer interest</p>
            <p className='mt-2 font-display text-3xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-2)' }}>
              {threads.length}
            </p>
            <button className='link-brand mt-1 text-xs' onClick={() => navigate('/farmers/inbox')}>Open inbox</button>
          </div>
          <div className='tile grain p-5' style={{ '--tile-tint': 'var(--rescue-soft)' }}>
            <p className='t-eyebrow'>Active listings</p>
            <p className='mt-2 font-display text-3xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--rescue)' }}>
              {listings.filter(l => l.isAvailableToday).length}
            </p>
            <button className='link-brand mt-1 text-xs' onClick={() => navigate('/vendor/dashboard')}>Classic dashboard</button>
          </div>
          <div className='tile grain p-5' style={{ '--tile-tint': 'var(--plan-soft)' }}>
            <p className='t-eyebrow'>Earnings</p>
            <p className='mt-2 font-display text-3xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--plan)' }}>
              ₹{profile?.totalEarnings || 0}
            </p>
            <button className='link-brand mt-1 text-xs' onClick={() => navigate('/farmer/earnings')}>Ledger</button>
          </div>
        </div>

        {/* ---------- farm profile form (collapsible) ---------- */}
        {(editing || !profile?.farmer?.village) && (
          <form className='grain card mt-6 p-5' onSubmit={saveFarmerProfile}>
            <p className='t-title'>Your farm, in your words</p>
            <p className='mt-1 text-sm' style={{ color: 'var(--ink-muted)' }}>
              Buyers trust farms they can picture. This appears on your storefront.
            </p>
            <div className='mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              <label className='block'><span className='t-eyebrow mb-1.5 block'>Farm size (acres)</span>
                <input className='w-full px-3 py-2' value={form.farmSizeAcres} onChange={e => setForm(f => ({ ...f, farmSizeAcres: e.target.value }))} /></label>
              <label className='block'><span className='t-eyebrow mb-1.5 block'>Village</span>
                <input className='w-full px-3 py-2' value={form.village} onChange={e => setForm(f => ({ ...f, village: e.target.value }))} /></label>
              <label className='block'><span className='t-eyebrow mb-1.5 block'>Taluk / district</span>
                <input className='w-full px-3 py-2' value={form.taluk} onChange={e => setForm(f => ({ ...f, taluk: e.target.value }))} /></label>
              <label className='block'><span className='t-eyebrow mb-1.5 block'>Years of experience</span>
                <input className='w-full px-3 py-2' value={form.yearsExperience} onChange={e => setForm(f => ({ ...f, yearsExperience: e.target.value }))} /></label>
              <label className='block'><span className='t-eyebrow mb-1.5 block'>FPO (optional)</span>
                <input className='w-full px-3 py-2' value={form.fpoName} onChange={e => setForm(f => ({ ...f, fpoName: e.target.value }))} /></label>
              <label className='block'><span className='t-eyebrow mb-1.5 block'>Crops grown (comma separated)</span>
                <input className='w-full px-3 py-2' value={form.cropsGrown} onChange={e => setForm(f => ({ ...f, cropsGrown: e.target.value }))} /></label>
              <label className='col-span-full flex items-center gap-2 text-sm font-semibold'>
                <input type='checkbox' checked={form.organic} onChange={e => setForm(f => ({ ...f, organic: e.target.checked }))} />
                I follow organic / natural farming
              </label>
              <label className='col-span-full block'><span className='t-eyebrow mb-1.5 block'>Your story</span>
                <textarea className='min-h-[70px] w-full px-3 py-2' value={form.story} onChange={e => setForm(f => ({ ...f, story: e.target.value }))} /></label>
            </div>
            <button className='btn-primary mt-4'>Save farm profile</button>
          </form>
        )}

        {/* ---------- buyer interest (grouped by buyer type) ---------- */}
        <section className='mt-8'>
          <div className='flex items-center justify-between'>
            <h2 className='t-title flex items-center gap-2'><HiOutlineUsers style={{ color: 'var(--accent-2)' }} /> Buyer interest</h2>
            {pendingInterest > 0 && <span className='badge badge-accent px-2.5 py-1'>{pendingInterest} new</span>}
          </div>
          <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2'>
            {Object.entries(buyerInterest).filter(([, list]) => list.length > 0).map(([type, list]) => (
              <div key={type} className='grain card p-4'>
                <p className='t-eyebrow' style={{ color: 'var(--accent-2)' }}>{type}</p>
                <div className='mt-2 space-y-2'>
                  {list.map(th => (
                    <button key={th._id} onClick={() => openThread(th)}
                      className='flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition-all hover:bg-[var(--surface-2)]'
                      style={{ background: 'var(--surface-2)' }}>
                      <span className='min-w-0'>
                        <span className='block truncate text-sm font-bold'>{th.buyerId?.fullName}</span>
                        <span className='block truncate text-xs' style={{ color: 'var(--ink-muted)' }}>
                          {th.listingId?.name || 'General enquiry'}
                        </span>
                      </span>
                      <HiOutlineArrowTopRightOnSquare style={{ color: 'var(--ink-muted)' }} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {threads.length === 0 && (
              <div className='grain card p-8 text-center'>
                <span className='text-4xl' aria-hidden='true'>🌱</span>
                <p className='mt-3 text-sm' style={{ color: 'var(--ink-muted)' }}>
                  No buyer enquiries yet. Verified profiles and clear photos get contacted first.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ---------- listings with price bands ---------- */}
        <section className='mt-8'>
          <h2 className='t-title'>Your produce with price guidance</h2>
          <div className='stagger mt-4 space-y-3'>
            {listings.slice(0, 6).map(listing => (
              <div key={listing._id} className='grain card p-4'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div className='min-w-0'>
                    <p className='font-bold'>{listing.name}</p>
                    <p className='text-xs' style={{ color: 'var(--ink-muted)' }}>
                      ₹{listing.pricePerUnit}/{listing.unit} · {listing.availableQuantity} in stock
                    </p>
                  </div>
                  {listing.grade && <span className='badge badge-brand'>Grade {listing.grade}</span>}
                </div>
                <div className='mt-2'>
                  <PriceBandChip crop={listing.name} district={profile?.location?.district || profile?.farmer?.taluk} price={listing.pricePerUnit} />
                </div>
              </div>
            ))}
            {listings.length === 0 && (
              <div className='grain card p-8 text-center text-sm' style={{ color: 'var(--ink-muted)' }}>
                Nothing listed yet — tap “List produce” to start.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default FarmerDashboardPage

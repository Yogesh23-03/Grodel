import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { serverUrl } from '../App'
import MarketNav from '../components/MarketNav.jsx'
import { FaLocationCrosshairs, FaStar, FaLocationDot, FaArrowRightLong, FaLeaf, FaStore } from 'react-icons/fa6'
import useScrollReveal from '../hooks/useScrollReveal.js'

const CATEGORIES = ['all', 'vegetables', 'fruits', 'grains', 'dairy', 'herbs', 'spices', 'flowers']

function NearbyVendorsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [vendors, setVendors] = useState([])
  const [category, setCategory] = useState('all')
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [onlyOrganic, setOnlyOrganic] = useState(false)
  const [onlyNegotiable, setOnlyNegotiable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [message, setMessage] = useState('')
  const [coords, setCoords] = useState(null)
  const headingRef = useScrollReveal()

  const fetchVendors = async (lat, lng, cat) => {
    setLoading(true)
    setMessage('')
    try {
      const params = new URLSearchParams()
      if (lat && lng) {
        params.append('lat', lat)
        params.append('lng', lng)
      }
      if (cat && cat !== 'all') params.append('category', cat)
      const res = await axios.get(`${serverUrl}/api/vendor/nearby?${params.toString()}`, { withCredentials: true })
      setVendors(res.data?.vendors || [])
    } catch (err) {
      setMessage(err.response?.data?.message || t('vendor.noVendorsNearby'))
      setVendors([])
    } finally {
      setLoading(false)
    }
  }

  const locateAndFetch = (cat) => {
    setLocating(true)
    setMessage('')
    if (!navigator.geolocation || !navigator.geolocation.getCurrentPosition) {
      setMessage(t('vendor.locationUnavailable'))
      fetchVendors(null, null, cat).finally(() => setLocating(false))
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
        await fetchVendors(position.coords.latitude, position.coords.longitude, cat)
        setLocating(false)
      },
      async (err) => {
        setMessage(err?.message || t('vendor.locationUnavailable'))
        await fetchVendors(null, null, cat)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  useEffect(() => {
    locateAndFetch(category)
  }, [category])

  const topListings = (vendor) => (vendor.listings || []).slice(0, 3)

  // Direct Market Access filters (client-side over the same nearby payload).
  const visibleVendors = vendors.filter(v =>
    (!onlyVerified || v.farmer?.aadhaarStatus === 'verified') &&
    (!onlyOrganic || v.farmer?.organic) &&
    (!onlyNegotiable || (v.listings || []).some(l => l.negotiable)))

  return (
    <div className='min-h-screen bg-[#fff9f6] lg:pl-[76px]'>
      <MarketNav />
      <main className='mx-auto max-w-6xl px-4 py-8 pb-20 lg:pb-8'>
        <div ref={headingRef} className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h1 className='section-heading flex items-center gap-3'>
              <span className='flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-[0_8px_24px_var(--brand-glow)]'>
                <FaStore />
              </span>
              {t('vendor.farmersNearYou', 'Farmers nearby')}
            </h1>
            <p className='mt-2 flex items-center gap-1.5 text-sm text-[var(--ink-muted)]'>
              <FaLocationDot className='text-[color:var(--accent-text)]' />
              {coords
                ? `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`
                : t('vendor.locateVendors')}
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            {locating && (
              <span className='badge badge-brand animate-soft-pulse px-3 py-1.5 text-xs'>
                <FaLocationCrosshairs /> {t('vendor.locating')}
              </span>
            )}
            {/* The single way in to selling: this page is where the stalls are,
                so the invitation to open one belongs right here. */}
            <button onClick={() => navigate('/vendor-portal')} className='btn-glow text-sm'>
              <FaStore /> {t('nav.joinAsVendor', 'Join as a vendor')}
            </button>
          </div>
        </div>

        {/* Category filter bar */}
        <div className='mt-5 flex gap-2 overflow-x-auto pb-2'>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${category === cat
                ? 'bg-[var(--accent)] text-white shadow-[0_6px_18px_var(--brand-glow)]'
                : 'border border-[var(--border)] bg-white text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[color:var(--accent-text)]'}`}
            >
              {cat === 'all' ? t('vendor.allCategories') : t(`vendor.${cat}`)}
            </button>
          ))}
        </div>

        {/* Direct Market Access filters */}
        <div className='mt-3 flex flex-wrap gap-2'>
          {[
            { label: 'Verified only', value: onlyVerified, set: setOnlyVerified },
            { label: 'Organic', value: onlyOrganic, set: setOnlyOrganic },
            { label: 'Negotiable', value: onlyNegotiable, set: setOnlyNegotiable }
          ].map(f => (
            <button key={f.label} onClick={() => f.set(!f.value)}
              className='rounded-full px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95'
              style={f.value
                ? { background: 'var(--vendor)', color: '#1c1006' }
                : { background: 'var(--surface-2)', color: 'var(--ink-muted)', border: '1px solid var(--border)' }}>
              {f.label}
            </button>
          ))}
        </div>

        {(loading || locating) && (
          <div className='mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className='card overflow-hidden p-0 card-3d'>
                <div className='skeleton h-40 w-full rounded-none' />
                <div className='space-y-2 p-4'>
                  <div className='skeleton h-5 w-2/3' />
                  <div className='skeleton h-4 w-1/2' />
                  <div className='skeleton h-9 w-full' />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !locating && vendors.length === 0 && (
          <div className='card mt-6 flex flex-col items-center gap-3 p-12 text-center card-3d'>
            <FaStore className='text-4xl text-[#f0cabc]' />
            <p className='text-[var(--ink-muted)]'>{message || t('vendor.noVendorsNearby')}</p>
            <button onClick={() => locateAndFetch(category)} className='link-brand text-sm'>
              {t('vendor.tryAgain')}
            </button>
          </div>
        )}

        {!loading && !locating && vendors.length > 0 && visibleVendors.length === 0 && (
          <div className='card mt-6 p-12 text-center card-3d'>
            <p className='text-[var(--ink-muted)]'>No farms match these filters. Try relaxing them.</p>
          </div>
        )}

        {!loading && !locating && visibleVendors.length > 0 && (
          <div className='stagger mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
            {visibleVendors.map((vendor) => (
              <div key={vendor._id} className='card card-hover card-3d overflow-hidden'>
                {vendor.profilePhoto ? (
                  <div className='relative h-40 w-full overflow-hidden'>
                    <img src={vendor.profilePhoto} alt={vendor.displayName} className='h-full w-full object-cover transition-transform duration-700 hover:scale-110' />
                    {vendor.isFreshToday && (
                      <span className='badge badge-success absolute right-3 top-3 bg-white/95'>🌿 {t('vendor.freshToday')}</span>
                    )}
                  </div>
                ) : (
                  <div className='relative flex h-40 w-full items-center justify-center bg-gradient-to-br from-[var(--accent-soft)] to-[var(--vendor-soft)]'>
                    <FaLeaf className='text-4xl text-[color:var(--accent-text)]' />
                    {vendor.isFreshToday && (
                      <span className='badge badge-success absolute right-3 top-3 bg-white/95'>🌿 {t('vendor.freshToday')}</span>
                    )}
                  </div>
                )}
                <div className='p-4'>
                  <div className='flex items-center justify-between gap-2'>
                    <h3 className='truncate text-lg font-bold'>{vendor.displayName || ''}</h3>
                    <div className='flex shrink-0 gap-1'>
                      {vendor.farmer?.aadhaarStatus === 'verified' && (
                        <span className='badge badge-success' title='Aadhaar verified'>✓ Verified</span>
                      )}
                      {vendor.farmer?.organic && <span className='badge badge-success'>Organic</span>}
                    </div>
                    <span className='flex shrink-0 items-center gap-1 text-sm text-yellow-500'>
                      <FaStar /> <b className='text-[var(--ink)]'>{vendor.rating?.average || '0'}</b>
                      <span className='text-xs text-[var(--ink-muted)]'>({vendor.rating?.count || 0})</span>
                    </span>
                  </div>
                  <p className='mt-1 flex items-center gap-1.5 text-sm text-[var(--ink-muted)]'>
                    <FaLocationDot className='shrink-0 text-[color:var(--accent-text)]' />
                    <span className='truncate'>
                      {[vendor.location?.landmark, vendor.location?.district].filter(Boolean).join(', ') || t('vendor.locationPending')}
                    </span>
                    {vendor.distanceKm !== null && vendor.distanceKm !== undefined && (
                      <span className='badge badge-muted ml-auto shrink-0'>{vendor.distanceKm} {t('vendor.distance')}</span>
                    )}
                  </p>

                  <div className='mt-3 space-y-1.5 border-t border-dashed border-[var(--border)] pt-3'>
                    {topListings(vendor).map((listing) => (
                      <div className='flex items-center justify-between gap-2 text-sm' key={listing._id}>
                        <span className='truncate text-[var(--ink-soft)]'>{listing.name}</span>
                        <span className='shrink-0 font-bold text-[color:var(--accent-text)]'>
                          ₹{listing.pricePerUnit || 0}<span className='text-xs font-medium text-[var(--ink-muted)]'>/{listing.unit || 'kg'}</span>
                        </span>
                      </div>
                    ))}
                    {(vendor.listings || []).length > 3 && (
                      <p className='text-xs text-[var(--ink-muted)]'>+{(vendor.listings || []).length - 3} {t('vendor.moreItems')}</p>
                    )}
                  </div>

                  <button
                    className='btn-glow mt-3 flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm transition-all active:scale-[0.98]'
                    onClick={() => navigate(`/vendor/${vendor._id}`)}
                  >
                    {t('vendor.viewShop')} <FaArrowRightLong />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default NearbyVendorsPage

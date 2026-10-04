import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import MarketNav from '../components/MarketNav.jsx'
import { dm } from '../api/dm'
import { HiOutlineBuildingStorefront, HiOutlineCheckCircle } from 'react-icons/hi2'

/*
 * Become-a-buyer onboarding: any signed-in user can attach a buyerProfile.
 * No role change. Consumer is one tap; business types get GSTIN/volume fields.
 * Dark + light: tokens. Mobile: single column, big tap targets.
 */
const BUYER_TYPES = [
  { key: 'consumer', label: 'Household', hint: 'Weekly vegetables, fruits, grains' },
  { key: 'retailer', label: 'Retailer', hint: 'Shop or reseller buying in bulk' },
  { key: 'hotel', label: 'Hotel / restaurant', hint: 'Kitchen supplies, regular volumes' },
  { key: 'canteen', label: 'Canteen / hostel', hint: 'Institutional monthly contracts' },
  { key: 'exporter', label: 'Exporter', hint: 'Aggregated, graded, documented lots' }
]
const CATEGORIES = ['vegetables', 'fruits', 'grains', 'dairy', 'herbs', 'spices', 'flowers', 'other']

function BuyerOnboardPage() {
  const navigate = useNavigate()
  const { userData } = useSelector(state => state.user)
  const [form, setForm] = useState({
    buyerType: 'consumer',
    businessName: '',
    gstin: '',
    typicalMonthlyVolume: '',
    preferredCategories: [],
    deliveryPincodes: ''
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    dm.get('/buyer/profile').then(res => {
      const p = res.data?.buyerProfile
      if (p) setForm(f => ({
        ...f,
        buyerType: p.buyerType || 'consumer',
        businessName: p.businessName || '',
        gstin: p.gstin || '',
        typicalMonthlyVolume: p.typicalMonthlyVolume || '',
        preferredCategories: p.preferredCategories || [],
        deliveryPincodes: (p.deliveryPincodes || []).join(', ')
      }))
    }).catch(() => {})
  }, [])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3500)
  }

  const toggleCategory = (cat) => setForm(f => ({
    ...f,
    preferredCategories: f.preferredCategories.includes(cat)
      ? f.preferredCategories.filter(c => c !== cat)
      : [...f.preferredCategories, cat]
  }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await dm.put('/buyer/profile', {
        ...form,
        deliveryPincodes: form.deliveryPincodes.split(',').map(s => s.trim()).filter(Boolean)
      })
      showToast('You are a verified buyer profile now')
      navigate('/buyer/matches')
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not save', 'error')
    } finally { setSaving(false) }
  }

  const isBusiness = form.buyerType !== 'consumer'

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />
      {toast && (
        <div className='toast rounded-full px-5 py-3 text-sm font-bold shadow-lg'
          style={{ background: toast.type === 'error' ? 'var(--danger)' : 'var(--accent)', color: toast.type === 'error' ? '#2a0d08' : 'var(--accent-ink)' }}>
          {toast.message}
        </div>
      )}
      <main className='mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:px-6'>
        <header>
          <p className='t-eyebrow' style={{ color: 'var(--vendor)' }}>Buy from the source</p>
          <h1 className='t-display mt-2'>Tell farmers who is buying</h1>
          <p className='mt-2 text-sm' style={{ color: 'var(--ink-muted)' }}>
            Signed in as <span className='notranslate font-bold'>{userData?.fullName}</span>. This never changes your account role — it helps farmers know what you need and at what volume.
          </p>
        </header>

        <form className='grain card mt-6 space-y-5 p-5 sm:p-6' onSubmit={save}>
          <div>
            <span className='t-eyebrow mb-2 block'>You are buying as</span>
            <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
              {BUYER_TYPES.map(type => (
                <button key={type.key} type='button' onClick={() => setForm(f => ({ ...f, buyerType: type.key }))}
                  className='rounded-2xl px-4 py-3 text-left transition-all'
                  style={form.buyerType === type.key
                    ? { background: 'var(--vendor-soft)', color: 'var(--vendor)', border: '1px solid var(--vendor)' }
                    : { background: 'var(--surface-2)', color: 'var(--ink-soft)', border: '1px solid var(--border-strong)' }}>
                  <span className='block text-sm font-bold'>{type.label}</span>
                  <span className='block text-xs opacity-80'>{type.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {isBusiness && (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <label className='block'><span className='t-eyebrow mb-1.5 block'>Business name</span>
                <input className='w-full px-3 py-2' value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} /></label>
              <label className='block'><span className='t-eyebrow mb-1.5 block'>GSTIN (optional)</span>
                <input className='w-full px-3 py-2' value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value }))} /></label>
              <label className='block sm:col-span-2'><span className='t-eyebrow mb-1.5 block'>Typical monthly volume</span>
                <input className='w-full px-3 py-2' placeholder='e.g. 500 kg tomatoes, 100 dozen bananas' value={form.typicalMonthlyVolume} onChange={e => setForm(f => ({ ...f, typicalMonthlyVolume: e.target.value }))} /></label>
            </div>
          )}

          <div>
            <span className='t-eyebrow mb-2 block'>What you buy regularly</span>
            <div className='flex flex-wrap gap-2'>
              {CATEGORIES.map(cat => (
                <button key={cat} type='button' onClick={() => toggleCategory(cat)}
                  className='rounded-full px-3.5 py-1.5 text-xs font-bold capitalize transition-all'
                  style={form.preferredCategories.includes(cat)
                    ? { background: 'var(--accent)', color: 'var(--accent-ink)' }
                    : { background: 'var(--surface-2)', color: 'var(--ink-muted)' }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <label className='block'><span className='t-eyebrow mb-1.5 block'>Delivery pincodes (comma separated)</span>
            <input className='w-full px-3 py-2' placeholder='560001, 560064' value={form.deliveryPincodes} onChange={e => setForm(f => ({ ...f, deliveryPincodes: e.target.value }))} /></label>

          <button className='btn-primary w-full' disabled={saving}>
            <HiOutlineCheckCircle /> {saving ? 'Saving…' : 'Start buying direct'}
          </button>
        </form>
      </main>
    </div>
  )
}

export default BuyerOnboardPage

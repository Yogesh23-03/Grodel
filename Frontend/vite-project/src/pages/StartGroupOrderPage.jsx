import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { serverUrl } from '../App'
import MarketNav from '../components/MarketNav.jsx'
import { HiOutlineMapPin, HiOutlineUserGroup, HiOutlineTicket, HiOutlineSparkles } from 'react-icons/hi2'

/* F — Start a group order: an invite card you compose, not a form. */
function StartGroupOrderPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { userData, currentAddress } = useSelector(state => state.user)
  const [shops, setShops] = useState([])
  const [form, setForm] = useState({ restaurantId: '', deliveryAddress: typeof currentAddress === 'string' ? currentAddress : currentAddress?.text || '', deliveryFee: 0, scheduledFor: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    axios.get(`${serverUrl}/api/shop/all`).then(res => setShops(res.data || [])).catch(console.log)
  }, [])

  const submit = async event => {
    event.preventDefault()
    const shop = shops.find(item => item._id === form.restaurantId)
    if (!shop || !form.deliveryAddress.trim()) {
      alert(t('group.needShopAddress', { defaultValue: 'Choose a restaurant and enter a delivery address.' }))
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.post(`${serverUrl}/api/group-orders`, {
        ...form,
        restaurantName: shop.name,
        deliveryFee: Number(form.deliveryFee || 0),
        scheduledFor: form.scheduledFor || undefined
      }, { withCredentials: true })
      navigate(`/group/${data.shareableLink}`)
    } catch (error) {
      alert(error.response?.data?.message || t('group.startFailed', { defaultValue: 'Unable to start group order.' }))
    } finally {
      setLoading(false)
    }
  }

  if (userData?.role !== 'user') return null

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />
      <main className='mx-auto max-w-2xl px-4 py-6 pb-20 sm:py-8 sm:px-6 lg:py-10 lg:pb-8'>
        <div className='grain rounded-[2rem] border p-6 shadow-2xl sm:p-10'
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
          <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--accent)' }}>
            <HiOutlineUserGroup /> {t('group.eyebrow', { defaultValue: 'Together' })}
          </p>
          <h1 className='t-display mt-2'>{t('group.startTitle', { defaultValue: 'Set one table' })}</h1>
          <p className='mt-2 text-[15px]' style={{ color: 'var(--ink-soft)' }}>
            {t('group.startCopy', { defaultValue: 'Pick the kitchen, drop the address, and share one link. Everyone builds their own plate and pays their own way.' })}
          </p>

          <form onSubmit={submit} className='mt-8 space-y-7'>
            {/* 1 · Kitchen */}
            <div>
              <label htmlFor='group-shop' className='flex items-center gap-2 font-bold'>
                <span className='text-xl' aria-hidden='true'>🍽️</span>
                {t('group.stepKitchen', { defaultValue: 'Which kitchen is cooking?' })}
              </label>
              <select id='group-shop' value={form.restaurantId} onChange={e => setForm({ ...form, restaurantId: e.target.value })}
                className='mt-2.5 w-full px-4 py-3'>
                <option value=''>{t('group.selectKitchen', { defaultValue: 'Select a kitchen' })}</option>
                {shops.map(shop => (
                  <option key={shop._id} value={shop._id}>{shop.name}{shop.city ? ` — ${shop.city}` : ''}</option>
                ))}
              </select>
            </div>

            {/* 2 · Where */}
            <div>
              <label htmlFor='group-address' className='flex items-center gap-2 font-bold'>
                <span className='text-xl' aria-hidden='true'>📍</span>
                {t('group.stepAddress', { defaultValue: 'Where\'s the table?' })}
              </label>
              <textarea id='group-address' value={form.deliveryAddress} onChange={e => setForm({ ...form, deliveryAddress: e.target.value })}
                className='mt-2.5 min-h-24 w-full px-4 py-3' />
            </div>

            {/* 3 · Schedule (folded by default — a table usually opens now) */}
            <details className='group rounded-2xl border p-4' style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
              <summary className='flex cursor-pointer items-center gap-2 text-sm font-bold list-none' style={{ color: 'var(--ink-soft)' }}>
                <HiOutlineTicket style={{ color: 'var(--plan)' }} />
                {t('group.scheduleToggle', { defaultValue: 'Open later? Schedule it' })}
                <span className='ml-auto transition-transform group-open:rotate-180'>⌄</span>
                <span className='sr-only'>{t('group.scheduleToggle', { defaultValue: 'Open later? Schedule it' })}</span>
              </summary>
              <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                <label className='block text-sm font-bold'>
                  {t('group.deliveryFee', { defaultValue: 'Delivery fee (split)' })}
                  <input type='number' min='0' value={form.deliveryFee} onChange={e => setForm({ ...form, deliveryFee: e.target.value })}
                    className='mt-1.5 w-full px-3 py-2' />
                </label>
                <label className='block text-sm font-bold'>
                  {t('group.scheduledFor', { defaultValue: 'Scheduled for' })}
                  <input type='datetime-local' value={form.scheduledFor} onChange={e => setForm({ ...form, scheduledFor: e.target.value })}
                    className='mt-1.5 w-full px-3 py-2' />
                </label>
              </div>
            </details>

            <button disabled={loading} className='btn-primary w-full !py-4 text-base'>
              <HiOutlineSparkles /> {loading ? t('common.loading') : t('group.createCta', { defaultValue: 'Open the table' })}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default StartGroupOrderPage

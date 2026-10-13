import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  HiOutlineArrowLeft, HiOutlineMapPin, HiOutlineClock, HiOutlineBuildingStorefront,
  HiOutlineCheckCircle, HiOutlineExclamationTriangle, HiOutlineShoppingBag,
  HiOutlineTrash, HiOutlineChevronDown
} from 'react-icons/hi2'
import { serverUrl } from '../App'
import MarketNav from '../components/MarketNav.jsx'

const MEAL_TYPES = ['breakfast', 'lunch', 'snacks', 'dinner']

const MEAL_META = {
  breakfast: { icon: '☕', defaultTime: '09:00' },
  lunch: { icon: '🍛', defaultTime: '12:30' },
  snacks: { icon: '🍪', defaultTime: '17:00' },
  dinner: { icon: '🌙', defaultTime: '20:30' }
}

const emptySlot = (type) => ({
  mealType: type,
  enabled: false,
  orderByTime: MEAL_META[type].defaultTime,
  defaultShopId: null,
  defaultItems: [],
  deliveryAddress: null,
  paymentMethod: 'cod'
})

/* H — Meal rituals: a daily planner of four tiles, each a promise GroDel
   keeps for you. The editor stays inline; the logic is untouched. */
export default function MealSchedulePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [slots, setSlots] = useState([])
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [openType, setOpenType] = useState('')
  const [menu, setMenu] = useState([])
  const [menuLoading, setMenuLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [savingTypes, setSavingTypes] = useState({})

  const [addressDraft, setAddressDraft] = useState('')

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    let active = true
    Promise.all([
      axios.get(`${serverUrl}/api/meal-schedule`, { withCredentials: true }),
      axios.get(`${serverUrl}/api/shop/all`).catch(() => ({ data: [] }))
    ]).then(([scheduleRes, shopsRes]) => {
      if (!active) return
      setSlots(scheduleRes.data?.slots || [])
      const first = (scheduleRes.data?.slots || []).find(s => s.deliveryAddress?.text)
      if (first) setAddressDraft(first.deliveryAddress.text)
      setShops(shopsRes.data || [])
    }).catch(() => { })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const slotFor = (type) => slots.find(s => s.mealType === type)

  const patchSlot = (type, patch) => {
    setSlots(prev => {
      const existing = prev.find(s => s.mealType === type)
      if (existing) return prev.map(s => (s.mealType === type ? { ...s, ...patch } : s))
      return [...prev, { ...emptySlot(type), ...patch }]
    })
  }

  const buildSlotPayload = (type, overrides = {}) => {
    const slot = { ...emptySlot(type), ...(slotFor(type) || {}), ...overrides, mealType: type }
    slot.deliveryAddress = slot.deliveryAddress || (addressDraft.trim()
      ? { text: addressDraft.trim(), latitude: null, longitude: null }
      : null)
    return slot
  }

  const save = async (type, overrides = {}) => {
    const slot = buildSlotPayload(type, overrides)
    if (slot.enabled) {
      if (!slot.defaultShopId) { showToast(t('schedule.needShop'), 'error'); return false }
      if (!slot.defaultItems?.length) { showToast(t('schedule.needItems'), 'error'); return false }
      if (!slot.deliveryAddress?.text) { showToast(t('schedule.needAddress'), 'error'); return false }
    }
    setSavingTypes(prev => ({ ...prev, [type]: true }))
    try {
      const { data } = await axios.put(`${serverUrl}/api/meal-schedule/slot`, slot, { withCredentials: true })
      setSlots(data.slots || [])
      showToast(slot.enabled ? t('schedule.savedOn', { type: t(`schedule.${type}`) }) : t('schedule.savedOff', { type: t(`schedule.${type}`) }))
      return true
    } catch (e) {
      showToast(e.response?.data?.message || t('schedule.saveFailed'), 'error')
      return false
    } finally {
      setSavingTypes(prev => ({ ...prev, [type]: false }))
    }
  }

  const saveAddressAll = async () => {
    const text = addressDraft.trim()
    if (!text) { showToast(t('schedule.needAddress'), 'error'); return }
    try {
      const enabledSlots = slots.filter(s => s.enabled)
      await Promise.all(enabledSlots.map(s => save(s.mealType, { deliveryAddress: { text } })))
      showToast(t('schedule.addressSaved'))
    } catch { showToast(t('schedule.saveFailed'), 'error') }
  }

  const chooseShop = async (type, shopId) => {
    patchSlot(type, { defaultShopId: shopId || null, defaultItems: [] })
    setMenu([])
    if (!shopId) return
    setMenuLoading(true)
    try {
      const r = await axios.get(`${serverUrl}/api/item/getbyshop/${shopId}`, { withCredentials: true })
      setMenu(r.data.items || [])
    } catch {
      showToast(t('schedule.menuFailed'), 'error')
    } finally {
      setMenuLoading(false)
    }
  }

  const openEditor = async (type) => {
    if (openType === type) { setOpenType(''); return }
    setOpenType(type)
    const slot = slotFor(type)
    if (slot?.defaultShopId) {
      setMenuLoading(true)
      try {
        const r = await axios.get(`${serverUrl}/api/item/getbyshop/${slot.defaultShopId}`, { withCredentials: true })
        setMenu(r.data.items || [])
      } catch { setMenu([]) } finally { setMenuLoading(false) }
    } else {
      setMenu([])
    }
  }

  const changeQty = (type, item, delta) => {
    const slot = { ...emptySlot(type), ...(slotFor(type) || {}) }
    const items = [...(slot.defaultItems || [])]
    const idx = items.findIndex(i => String(i.itemId) === String(item._id))
    const current = idx >= 0 ? items[idx].qty : 0
    const next = Math.max(0, current + delta)
    if (next === 0) {
      if (idx >= 0) items.splice(idx, 1)
    } else if (idx >= 0) {
      items[idx] = { ...items[idx], qty: next }
    } else {
      items.push({ itemId: item._id, qty: next })
    }
    patchSlot(type, { defaultItems: items })
  }

  const qtyFor = (type, itemId) => {
    const slot = slotFor(type)
    const found = (slot?.defaultItems || []).find(i => String(i.itemId?._id || i.itemId) === String(itemId))
    return found?.qty || 0
  }

  const itemsSummary = (slot) => (slot?.defaultItems || []).map(i => {
    const item = typeof i.itemId === 'object' ? i.itemId : null
    return item?.name ? `${item.name} ×${i.qty}` : null
  }).filter(Boolean)

  const totalFor = (slot) => (slot?.defaultItems || []).reduce((sum, i) => {
    const item = typeof i.itemId === 'object' ? i.itemId : menu.find(m => String(m._id) === String(i.itemId))
    return item?.price ? sum + item.price * i.qty : sum
  }, 0)

  const enabledCount = useMemo(() => slots.filter(s => s.enabled).length, [slots])

  /* Countdown to today's cutoff, shown on active tiles. */
  const minutesTo = timeStr => {
    if (!timeStr) return null
    const [h, m] = timeStr.split(':').map(Number)
    const now = new Date()
    const cutoff = new Date()
    cutoff.setHours(h || 0, m || 0, 0, 0)
    const diff = Math.round((cutoff - now) / 60000)
    if (diff < 0) return null
    return diff >= 60 ? `${Math.floor(diff / 60)}h ${diff % 60}m` : `${diff}m`
  }

  if (loading) {
    return (
      <div className='min-h-screen lg:pl-[76px]'>
        <MarketNav />
        <main className='mx-auto max-w-4xl px-4 py-10'>
          <div className='skeleton h-10 w-64' />
          <div className='skeleton mt-3 h-5 w-96' />
          <div className='mt-8 grid gap-4 sm:grid-cols-2'>
            {[0, 1, 2, 3].map(i => <div key={i} className='skeleton h-36 w-full' style={{ borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />

      {toast && (
        <div className='toast flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold shadow-xl'
          style={toast.type === 'error' ? { background: 'var(--danger)', color: '#fff' } : { background: 'var(--rescue)', color: '#0c110e' }}>
          {toast.type === 'error' ? <HiOutlineExclamationTriangle size={16} /> : <HiOutlineCheckCircle size={16} />}
          {toast.message}
        </div>
      )}

      <main className='mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6'>
        <button onClick={() => navigate('/')} className='link-brand mb-5 inline-flex items-center gap-2 text-sm'>
          <HiOutlineArrowLeft size={16} /> {t('common.back')}
        </button>

        <header className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <p className='t-eyebrow' style={{ color: 'var(--plan)' }}>{t('schedule.planEyebrow', { defaultValue: 'Rituals' })}</p>
            <h1 className='t-display mt-2'>{t('schedule.title')}</h1>
            <p className='mt-2 max-w-xl text-[15px]' style={{ color: 'var(--ink-soft)' }}>{t('schedule.subtitle')}</p>
          </div>
          {enabledCount > 0 && (
            <span className='badge px-3 py-1.5' style={{ background: 'var(--plan-soft)', color: 'var(--plan)' }}>
              <HiOutlineCheckCircle /> {t('schedule.activeCount', { count: enabledCount })}
            </span>
          )}
        </header>

        {/* Delivery address — one line, calm */}
        <section className='grain card mt-7 p-5 card-3d'>
          <label htmlFor='ritual-address' className='flex items-center gap-2 text-sm font-bold'>
            <HiOutlineMapPin style={{ color: 'var(--plan)' }} />
            {t('schedule.deliveryAddress')}
          </label>
          <div className='mt-3 flex flex-col gap-2 sm:flex-row'>
            <input
              id='ritual-address'
              value={addressDraft}
              onChange={e => setAddressDraft(e.target.value)}
              placeholder={t('schedule.addressPlaceholder')}
              className='flex-1 px-4 py-3 text-sm'
            />
            <button onClick={saveAddressAll} className='btn-ghost !py-3'>
              {t('schedule.saveAddress')}
            </button>
          </div>
          <p className='mt-2 text-xs' style={{ color: 'var(--ink-muted)' }}>{t('schedule.addressHint')}</p>
        </section>

        {/* ---- the four ritual tiles ---- */}
        <div className='mt-7 grid gap-4 sm:grid-cols-2'>
          {MEAL_TYPES.map(type => {
            const slot = slotFor(type)
            const enabled = slot?.enabled || false
            const meta = MEAL_META[type]
            const summary = itemsSummary(slot)
            const total = totalFor(slot)
            const isOpen = openType === type
            const saving = savingTypes[type]
            const countdown = enabled ? minutesTo(slot.orderByTime) : null

            return (
              <section key={type} className='tile tile-plan grain flex flex-col p-5'
                style={enabled ? { borderColor: 'var(--plan)' } : undefined}>
                <div className='flex items-start justify-between gap-3'>
                  <span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl'
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    {meta.icon}
                  </span>

                  {/* enable = a switch styled as a ritual marker */}
                  <label className='flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-xs font-black'
                    style={enabled
                      ? { background: 'var(--plan)', color: '#fff' }
                      : { background: 'var(--surface-2)', color: 'var(--ink-muted)', border: '1px solid var(--border-strong)' }}>
                    <input type='checkbox' className='sr-only'
                      checked={enabled}
                      onChange={e => save(type, { enabled: e.target.checked })} />
                    <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${enabled ? 'animate-breathe' : ''}`}
                      style={{ borderColor: 'currentColor', background: enabled ? '#fff' : 'transparent' }} aria-hidden='true' />
                    {enabled ? t('schedule.enabled') : t('schedule.enable')}
                  </label>
                </div>

                <h2 className='t-title mt-3 capitalize'>{t(`schedule.${type}`)}</h2>
                <p className='mt-1 line-clamp-2 min-h-[2.4rem] text-xs' style={{ color: 'var(--ink-muted)' }}>
                  {enabled
                    ? (summary.length ? summary.join(', ') : t('schedule.notSet'))
                    : t('schedule.notSet')}
                </p>

                {/* ritual meta chips */}
                {enabled && (
                  <div className='mt-3 flex flex-wrap items-center gap-1.5 text-xs'>
                    <span className='flex items-center gap-1 rounded-full px-2.5 py-1 font-bold'
                      style={{ background: 'var(--surface-2)', color: 'var(--plan)' }}>
                      <HiOutlineClock size={12} /> {t('schedule.orderBy')} {slot.orderByTime}
                      {countdown && <span className='animate-breathe'>· {countdown}</span>}
                    </span>
                    <span className='flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold'
                      style={{ background: 'var(--surface-2)' }}>
                      <HiOutlineBuildingStorefront size={12} style={{ color: 'var(--plan)' }} />
                      {shops.find(s => s._id === slot.defaultShopId)?.name || t('schedule.noShop')}
                    </span>
                    {total > 0 && (
                      <span className='font-display font-semibold' style={{ fontFamily: 'var(--font-display)', color: 'var(--plan)' }}>
                        ≈ ₹{total}
                      </span>
                    )}
                  </div>
                )}

                <div className='mt-auto flex items-center justify-between pt-4'>
                  <button onClick={() => openEditor(type)}
                    className='flex items-center gap-1.5 text-sm font-bold transition-colors'
                    style={{ color: 'var(--plan)' }}>
                    {slot?.defaultItems?.length ? t('schedule.edit') : t('schedule.chooseDefaults')}
                    <HiOutlineChevronDown size={15} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {enabled && (
                    <input
                      type='time'
                      value={slot.orderByTime}
                      onChange={e => patchSlot(type, { orderByTime: e.target.value })}
                      onBlur={() => save(type)}
                      aria-label={`${t('schedule.orderBy')} — ${t(`schedule.${type}`)}`}
                      className='rounded-full px-3 py-1.5 text-xs font-bold'
                      style={{ width: 'auto', background: 'var(--surface-2)' }}
                    />
                  )}
                </div>

                {isOpen && (
                  <div className='animate-fade-in mt-4 rounded-2xl p-4' style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <label className='block text-sm font-bold'>
                      {t('schedule.pickRestaurant')}
                      <select
                        className='mt-2 w-full px-4 py-3 text-sm'
                        value={slot?.defaultShopId || ''}
                        onChange={e => chooseShop(type, e.target.value)}
                      >
                        <option value=''>{t('schedule.selectRestaurant')}</option>
                        {shops.map(shop => (
                          <option value={shop._id} key={shop._id}>{shop.name}{shop.city ? ` — ${shop.city}` : ''}</option>
                        ))}
                      </select>
                    </label>

                    {menuLoading && (
                      <div className='mt-4 space-y-2'>
                        {[0, 1, 2].map(i => <div key={i} className='skeleton h-14 w-full' />)}
                      </div>
                    )}

                    {!menuLoading && slot?.defaultShopId && menu.length === 0 && (
                      <p className='mt-4 flex items-center gap-2 rounded-xl p-4 text-sm'
                        style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                        🍽️ {t('schedule.emptyMenu')}
                      </p>
                    )}

                    {!menuLoading && menu.length > 0 && (
                      <div className='mt-4 grid gap-2 sm:grid-cols-2'>
                        {menu.map(item => {
                          const qty = qtyFor(type, item._id)
                          return (
                            <div key={item._id} className='flex items-center justify-between rounded-xl border p-3'
                              style={{
                                borderColor: qty > 0 ? 'var(--plan)' : 'var(--border)',
                                background: qty > 0 ? 'var(--plan-soft)' : 'var(--surface-1)'
                              }}>
                              <div className='min-w-0'>
                                <p className='truncate text-sm font-semibold'>{item.name}</p>
                                <p className='text-xs' style={{ color: 'var(--ink-muted)' }}>₹{item.price}</p>
                              </div>
                              <div className='flex items-center gap-2'>
                                <button
                                  onClick={() => changeQty(type, item, -1)}
                                  className='flex h-8 w-8 items-center justify-center rounded-full active:scale-90 disabled:opacity-40'
                                  style={{ background: 'var(--surface-1)', color: 'var(--plan)' }}
                                  disabled={qty === 0}
                                  aria-label='decrease'
                                >−</button>
                                <span className='w-6 text-center text-sm font-black'>{qty}</span>
                                <button
                                  onClick={() => changeQty(type, item, 1)}
                                  className='flex h-8 w-8 items-center justify-center rounded-full active:scale-90'
                                  style={{ background: 'var(--plan)', color: '#fff' }}
                                  aria-label='increase'
                                >+</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <div className='mt-5 flex flex-wrap items-center justify-between gap-3'>
                      <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>
                        {(slot?.defaultItems || []).length > 0
                          ? t('schedule.itemsChosen', { count: slot.defaultItems.length, total: `₹${total}` })
                          : t('schedule.noItemsChosen')}
                      </p>
                      <div className='flex gap-2'>
                        {(slot?.defaultItems || []).length > 0 && (
                          <button
                            onClick={() => { patchSlot(type, { defaultItems: [] }); save(type, { defaultItems: [] }) }}
                            className='badge badge-danger px-4 py-2 text-xs'>
                            <HiOutlineTrash /> {t('schedule.clearItems')}
                          </button>
                        )}
                        <button
                          onClick={async () => { const ok = await save(type); if (ok) setOpenType('') }}
                          disabled={saving}
                          className='btn-primary !py-2 text-sm'>
                          <HiOutlineShoppingBag size={15} /> {saving ? t('common.loading') : t('schedule.saveDefaults')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )
          })}
        </div>

        {/* how the ritual works */}
        <section className='grain card mt-8 p-6 card-3d' style={{ background: 'linear-gradient(135deg, var(--plan-soft), var(--surface-1))' }}>
          <h3 className='t-eyebrow' style={{ color: 'var(--plan)' }}>{t('schedule.howTitle')}</h3>
          <ol className='mt-3 space-y-2 text-sm' style={{ color: 'var(--ink-soft)' }}>
            <li className='flex gap-2'><span className='font-black' style={{ color: 'var(--plan)' }}>1.</span> {t('schedule.how1')}</li>
            <li className='flex gap-2'><span className='font-black' style={{ color: 'var(--plan)' }}>2.</span> {t('schedule.how2')}</li>
            <li className='flex gap-2'><span className='font-black' style={{ color: 'var(--plan)' }}>3.</span> {t('schedule.how3')}</li>
          </ol>
        </section>
      </main>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaCircleCheck, FaClock, FaChevronDown, FaCalendarCheck } from 'react-icons/fa6'
import { serverUrl } from '../App'

export default function MealScheduleBanner() {
  const { t } = useTranslation()
  const [slot, setSlot] = useState(null)
  const [menu, setMenu] = useState([])
  const [quantities, setQuantities] = useState({})
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    axios.get(`${serverUrl}/api/meal-schedule`, { withCredentials: true })
      .then(async r => {
        if (!active) return
        const now = new Date().toTimeString().slice(0, 5)
        const activeSlot = (r.data.slots || []).find(s => s.enabled && s.orderByTime > now)
        if (!activeSlot) return
        setSlot(activeSlot)
        if (activeSlot.defaultShopId) {
          try {
            const m = await axios.get(`${serverUrl}/api/item/getbyshop/${activeSlot.defaultShopId}`, { withCredentials: true })
            if (active) setMenu(m.data.items || [])
          } catch { /* menu optional */ }
        }
      })
      .catch(() => { })
    return () => { active = false }
  }, [])

  const total = menu.reduce((sum, item) => sum + item.price * (quantities[item._id] || 0), 0)

  const save = async () => {
    const items = menu.filter(i => quantities[i._id]).map(i => ({ itemId: i._id, qty: quantities[i._id] }))
    if (!items.length) return
    setSaving(true)
    try {
      await axios.put(`${serverUrl}/api/meal-schedule/slot/${slot.mealType}/selection`, { items }, { withCredentials: true })
      setSlot({ ...slot, pendingSelection: items })
      setOpen(false)
    } catch {
      /* keep the banner open so the user can retry */
    } finally {
      setSaving(false)
    }
  }

  if (!slot) return null

  if (slot.pendingSelection?.length) {
    return (
      <div className='animate-rise-in mx-auto mt-4 flex w-[92%] max-w-6xl flex-wrap items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm'>
        <FaCircleCheck className='text-xl text-green-600' />
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-bold capitalize text-green-800'>
            {slot.mealType} · {t('schedule.todayConfirmed')}
          </p>
          <p className='truncate text-xs text-green-700'>
            {slot.pendingSelection.map(i => `${(typeof i.itemId === 'object' ? i.itemId?.name : '') || 'Item'} ×${i.qty}`).join(', ')}
          </p>
        </div>
        <button onClick={() => navigate('/meal-schedule')} className='link-brand text-xs'>
          {t('schedule.manageLink')}
        </button>
      </div>
    )
  }

  return (
    <div className='animate-rise-in mx-auto mt-4 w-[92%] max-w-6xl rounded-2xl border border-[#ffe0d5] bg-gradient-to-r from-[#fff1ea] to-white p-4 shadow-sm'>
      <div className='flex flex-wrap items-center gap-3'>
        <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff4d2d] text-white shadow-[0_6px_18px_rgba(255,77,45,0.35)]'>
          <FaClock />
        </span>
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-bold capitalize text-[#1c1512]'>
            {slot.mealType} · {t('schedule.closesAt')} <span className='text-[#ff4d2d]'>{slot.orderByTime}</span>
          </p>
          <p className='text-xs text-[#8a7d75]'>{t('schedule.bannerHint')}</p>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className='flex items-center gap-1.5 rounded-full bg-[#ff4d2d] px-4 py-2 text-xs font-bold text-white shadow-[0_6px_18px_rgba(255,77,45,0.3)] hover:bg-[#e63e20]'
        >
          {open ? <FaChevronDown className='rotate-180' /> : <FaCalendarCheck />}
          {open ? t('common.close') : t('schedule.chooseItems')}
        </button>
      </div>

      {open && (
        <div className='animate-fade-in mt-4 border-t border-dashed border-[#f0cabc] pt-4'>
          <div className='grid gap-2 sm:grid-cols-2'>
            {menu.map(item => (
              <div key={item._id} className={`flex items-center justify-between rounded-xl border p-3 ${quantities[item._id] ? 'border-[#ff4d2d]/40 bg-[#fff0ec]' : 'border-[#f3e2d9] bg-white'}`}>
                <div className='min-w-0'>
                  <p className='truncate text-sm font-semibold'>{item.name}</p>
                  <p className='text-xs text-[#8a7d75]'>₹{item.price}</p>
                </div>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => setQuantities(q => ({ ...q, [item._id]: Math.max(0, (q[item._id] || 0) - 1) }))}
                    disabled={!quantities[item._id]}
                    className='flex h-8 w-8 items-center justify-center rounded-full bg-[#fff1ea] font-bold text-[#ff4d2d] hover:bg-[#ffe0d5] disabled:opacity-40'
                    aria-label='decrease'
                  >−</button>
                  <span className='w-6 text-center text-sm font-bold'>{quantities[item._id] || 0}</span>
                  <button
                    onClick={() => setQuantities(q => ({ ...q, [item._id]: (q[item._id] || 0) + 1 }))}
                    className='flex h-8 w-8 items-center justify-center rounded-full bg-[#ff4d2d] font-bold text-white hover:bg-[#e63e20]'
                    aria-label='increase'
                  >+</button>
                </div>
              </div>
            ))}
          </div>
          <div className='mt-4 flex flex-wrap items-center justify-between gap-3'>
            <p className='text-sm text-[#8a7d75]'>
              {total > 0 ? t('schedule.itemsChosen', { count: menu.filter(i => quantities[i._id]).length, total: `₹${total}` }) : t('schedule.noItemsChosen')}
            </p>
            <button
              onClick={save}
              disabled={saving || total === 0}
              className='rounded-full bg-[#ff4d2d] px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(255,77,45,0.35)] hover:bg-[#e63e20] disabled:opacity-50'
            >
              {saving ? t('common.loading') : t('schedule.saveToday')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

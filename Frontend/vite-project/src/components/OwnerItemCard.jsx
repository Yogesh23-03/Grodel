import axios from 'axios'
import React, { useState } from 'react'
import { FaPen, FaTrashCan } from 'react-icons/fa6'
import { HiOutlinePercentBadge, HiOutlineXCircle } from 'react-icons/hi2'
import { useNavigate } from 'react-router-dom'
import { serverUrl } from '../App'
import { useDispatch } from 'react-redux'
import { setMyShopData } from '../redux/ownerSlice'
import { useTranslation } from 'react-i18next'

/*
 * OwnerItemCard — a menu row with inline discount controls.
 *
 * `data.price` is always the price the customer pays, so the discount block is
 * purely presentational: the crossed-out figure is `originalPrice`, which the
 * backend keeps as the anchor for removing the discount again.
 *
 * The discount endpoints answer with the single item, but this card renders the
 * whole shop out of redux — so after any change the shop is re-pulled, keeping
 * every price on the page in step.
 */
function OwnerItemCard({ data }) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { t } = useTranslation()

  const [discountInput, setDiscountInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reloadShop = async () => {
    const result = await axios.get(`${serverUrl}/api/shop/getmy`, { withCredentials: true })
    dispatch(setMyShopData(result.data))
  }

  const handleDelete = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/item/delete/${data._id}`, { withCredentials: true })
      dispatch(setMyShopData(result.data))
    } catch (caught) {
      setError(caught?.response?.data?.message || t('owner.actionFailed', 'Something went wrong'))
    }
  }

  const applyDiscount = async () => {
    const percent = Number(discountInput)
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      setError(t('owner.discountInvalid', 'Enter a discount between 0 and 100'))
      return
    }
    setBusy(true)
    setError('')
    try {
      await axios.patch(`${serverUrl}/api/item/${data._id}/discount`, { discountPercent: percent }, { withCredentials: true })
      await reloadShop()
      setDiscountInput('')
    } catch (caught) {
      setError(caught?.response?.data?.message || t('owner.discountFailed', 'Could not apply the discount'))
    } finally {
      setBusy(false)
    }
  }

  const removeDiscount = async () => {
    setBusy(true)
    setError('')
    try {
      await axios.patch(`${serverUrl}/api/item/${data._id}/remove-discount`, {}, { withCredentials: true })
      await reloadShop()
    } catch (caught) {
      setError(caught?.response?.data?.message || t('owner.discountFailed', 'Could not remove the discount'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='card card-hover card-3d flex overflow-hidden'>
      <div className='w-32 shrink-0 sm:w-36' style={{ background: 'var(--surface-3)' }}>
        <img src={data.image} alt='' className='h-full w-full object-cover' />
      </div>

      <div className='flex flex-1 flex-col p-4'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0'>
            <h2 className='font-display truncate text-base font-semibold' style={{ fontFamily: 'var(--font-display)' }}>
              {data.name}
            </h2>
            <p className='mt-0.5 text-xs capitalize' style={{ color: 'var(--ink-muted)' }}>
              {t(`category.${data.category}`, { defaultValue: data.category })} · {data.foodType}
            </p>
          </div>

          <div className='flex shrink-0 items-center gap-1'>
            <button className='flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95'
              style={{ background: 'var(--surface-2)', color: 'var(--accent-2)' }}
              onClick={() => navigate(`/edit-item/${data._id}`)} aria-label={`Edit ${data.name}`}>
              <FaPen size={14} />
            </button>
            <button className='flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95'
              style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
              onClick={handleDelete} aria-label={`Delete ${data.name}`}>
              <FaTrashCan size={14} />
            </button>
          </div>
        </div>

        {/* ---------- price: one figure, plus the struck-through original when on sale ---------- */}
        <div className='mt-3 flex items-baseline gap-2'>
          <span className='font-display text-xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-2)' }}>
            ₹{data.price}
          </span>
          {data.isOnSale && (
            <>
              <span className='text-sm line-through' style={{ color: 'var(--ink-faint)' }}>₹{data.originalPrice}</span>
              <span className='badge badge-success'>{data.discountPercent}% {t('owner.off', 'OFF')}</span>
            </>
          )}
        </div>

        {/* ---------- discount controls ---------- */}
        <div className='mt-3'>
          {data.isOnSale ? (
            <button
              type='button'
              onClick={removeDiscount}
              disabled={busy}
              className='flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition-transform active:scale-95 disabled:opacity-50'
              style={{ borderColor: 'var(--danger)', color: 'var(--danger)', background: 'var(--danger-soft)' }}
            >
              <HiOutlineXCircle size={13} /> {t('owner.removeDiscount', 'Remove discount')}
            </button>
          ) : (
            <div className='flex items-center gap-2'>
              <input
                type='number'
                min='0'
                max='100'
                value={discountInput}
                onChange={event => setDiscountInput(event.target.value)}
                placeholder={t('owner.discountPlaceholder', 'Discount %')}
                aria-label={`${t('owner.discountPlaceholder', 'Discount %')} — ${data.name}`}
                className='w-24 px-2 py-1 text-sm'
              />
              <button
                type='button'
                onClick={applyDiscount}
                disabled={busy || discountInput === ''}
                className='flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-transform active:scale-95 disabled:opacity-50'
                style={{ background: 'var(--success)', color: 'var(--accent-ink)' }}
              >
                <HiOutlinePercentBadge size={13} /> {t('owner.applyDiscount', 'Apply')}
              </button>
            </div>
          )}
          {error && <p className='mt-2 text-xs' style={{ color: 'var(--danger)' }}>{error}</p>}
        </div>
      </div>
    </div>
  )
}

export default OwnerItemCard

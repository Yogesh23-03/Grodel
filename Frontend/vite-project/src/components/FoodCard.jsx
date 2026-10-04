import React, { useState } from 'react'
import { HiMinus, HiPlus } from 'react-icons/hi2'
import { HiOutlineStar } from 'react-icons/hi2'
import { useDispatch, useSelector } from 'react-redux'
import { addToCart } from '../redux/userSlice'
import { useTranslation } from 'react-i18next'

/*
 * FoodCard — "crate card"
 * Works for a restaurant dish, a produce listing, or a rescued meal.
 * The veg/non-veg marker is a punched market ticket that straddles the
 * image edge; the buy control is a tactile portion dial (round lime
 * touch-target that morphs into a − qty + pill), never a flat ADD bar.
 */
function FoodCard({ data }) {
  const { t } = useTranslation()
  const [quantity, setQuantity] = useState(0)
  const [justAdded, setJustAdded] = useState(false)
  const dispatch = useDispatch()
  const { cartItems } = useSelector(state => state.user)

  const isVeg = data.foodType === 'veg'
  const rating = data.rating?.average || 0
  const ratingCount = data.rating?.count || 0
  const inBasket = cartItems.some(item => item.id === data._id)

  const commit = () => {
    if (quantity <= 0) return
    dispatch(addToCart({
      id: data._id,
      name: data.name,
      price: data.price,
      image: data.image,
      shop: data.shop,
      quantity,
      foodType: data.foodType
    }))
    setQuantity(0)
    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 1200)
  }

  return (
    <article className='card card-hover grain group flex w-[270px] flex-col overflow-hidden rounded-[1.75rem]'>
      {/* --- produce photo --- */}
      <div className='relative h-[185px] w-full overflow-hidden'>
        <img
          src={data.image}
          alt={data.name}
          loading='lazy'
          className='h-full w-full object-cover transition-transform duration-700 group-hover:scale-105'
        />
        <div className='absolute inset-0 bg-gradient-to-t from-[var(--surface-1)] via-transparent to-transparent opacity-70' />

        {/* punched dietary ticket — straddles the crate edge */}
        <span
          title={isVeg ? t('food.veg') : t('food.nonVeg')}
          aria-label={isVeg ? t('food.veg') : t('food.nonVeg')}
          className='absolute left-3.5 top-3.5 z-10 flex h-5 w-5 items-center justify-center rounded-[6px] border-2 bg-[var(--surface-1)] shadow-md'
          style={{ borderColor: isVeg ? 'var(--rescue)' : 'var(--danger)' }}
        >
          <span className='h-2 w-2 rounded-full' style={{ background: isVeg ? 'var(--rescue)' : 'var(--danger)' }} />
        </span>

        {/* rating chip */}
        {rating > 0 && (
          <span className='absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold backdrop-blur-md'
            style={{ background: 'var(--glass-strong)', color: 'var(--ink)' }}>
            <HiOutlineStar size={12} style={{ color: 'var(--warning)' }} />
            {Number(rating).toFixed(1)}
            {ratingCount > 0 && <span style={{ color: 'var(--ink-muted)' }}>· {ratingCount}</span>}
          </span>
        )}

        {inBasket && (
          <span className='absolute bottom-3 left-3 z-10 badge badge-brand px-2.5 py-1 shadow-md'>
            {t('food.added')}
          </span>
        )}
      </div>

      {/* --- label --- */}
      <div className='flex flex-1 flex-col p-4 pt-3'>
        <h3 className='t-title !text-[1.05rem] leading-snug'>{data.name}</h3>

        <div className='mt-auto flex items-end justify-between pt-4'>
          <p className='font-display text-2xl font-semibold tracking-tight' style={{ fontFamily: 'var(--font-display)' }}>
            ₹{data.price}
          </p>

          {/* portion dial */}
          {quantity === 0 ? (
            <button
              onClick={() => setQuantity(1)}
              aria-label={t('food.addToCart')}
              title={t('food.addToCart')}
              className={`flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-90 ${justAdded ? 'animate-soft-pulse' : ''}`}
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)', boxShadow: 'var(--shadow-lime)' }}
            >
              <HiPlus size={20} strokeWidth={2.5} />
            </button>
          ) : (
            <div className='flex items-center gap-0.5 rounded-full border p-1 shadow-md'
              style={{ borderColor: 'var(--border-strong)', background: 'var(--surface-2)' }}>
              <button
                onClick={() => setQuantity(q => Math.max(0, q - 1))}
                aria-label='Decrease quantity'
                className='flex h-8 w-8 items-center justify-center rounded-full transition-colors active:scale-90'
                style={{ color: 'var(--ink-soft)' }}
              >
                <HiMinus size={16} strokeWidth={2.5} />
              </button>
              <span className='w-7 text-center text-sm font-black' style={{ color: 'var(--ink)' }}>{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                aria-label='Increase quantity'
                className='flex h-8 w-8 items-center justify-center rounded-full transition-colors active:scale-90'
                style={{ color: 'var(--accent)' }}
              >
                <HiPlus size={16} strokeWidth={2.5} />
              </button>
              <button
                onClick={commit}
                aria-label={t('food.addToCart')}
                className='ml-0.5 flex h-8 items-center justify-center rounded-full px-3 text-xs font-black transition-transform active:scale-90'
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
              >
                {t('cart.basket')}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export default FoodCard

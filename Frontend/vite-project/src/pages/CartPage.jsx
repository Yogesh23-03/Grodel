import React from 'react'
import { FaCircleCheck } from "react-icons/fa6"
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import CartItemCard from '../components/CartItemCard'
import { useTranslation } from 'react-i18next'
import { HiOutlineShoppingBag, HiOutlineArrowLeft } from 'react-icons/hi2'
import MarketNav from '../components/MarketNav.jsx'

function CartPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { cartItems, totalAmount } = useSelector(state => state.user)

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />
      <div className='mx-auto w-full max-w-[800px] px-4 pb-28 pt-6 sm:px-6'>
        <div className='mb-6 flex items-center gap-3'>
          <button onClick={() => navigate("/")} className='btn-ghost !h-10 !w-10 !p-0' aria-label={t('common.back')}>
            <HiOutlineArrowLeft size={18} />
          </button>
          <h1 className='t-title'>{t('cart.myCart')}</h1>
          {cartItems?.length > 0 && (
            <span className='badge badge-brand ml-auto px-3 py-1.5'>
              {cartItems.reduce((s, i) => s + i.quantity, 0)} {t('cart.itemsCount')}
            </span>
          )}
        </div>

        {cartItems?.length === 0 ? (
          <div className='card mt-10 flex flex-col items-center gap-4 p-14 text-center card-3d'>
            <span className='mode-eat flex h-20 w-20 items-center justify-center rounded-full'>
              <HiOutlineShoppingBag className='text-3xl' />
            </span>
            <p className='text-lg font-semibold'>{t('cart.emptyCart')}</p>
            <button onClick={() => navigate('/')} className='btn-primary'>
              {t('cart.browseFood')}
            </button>
          </div>
        ) : (
          <>
            <div className='stagger space-y-4'>
              {cartItems?.map((item, index) => (
                <CartItemCard data={item} key={index} />
              ))}
            </div>

            <div className='glass-panel sticky bottom-24 mt-6 flex items-center justify-between gap-3 p-5 lg:bottom-6'>
              <div>
                <h1 className='t-eyebrow'>{t('cart.total')}</h1>
                <span className='font-display text-2xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>₹{totalAmount}</span>
              </div>
              <button
                className='btn-primary'
                onClick={() => navigate("/checkout")}
              >
                <FaCircleCheck /> {t('cart.proceedToCheckout')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default CartPage

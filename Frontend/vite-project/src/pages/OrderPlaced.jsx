import React from 'react'
import { FaCircleCheck, FaReceipt } from "react-icons/fa6"
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MarketNav from '../components/MarketNav.jsx'

function OrderPlaced() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />
      <main className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center'>
      <div className='animate-rise-in flex flex-col items-center'>
        <span className='flex h-24 w-24 items-center justify-center rounded-full' style={{ background: 'var(--success-soft)', boxShadow: '0 0 0 12px var(--success-soft)' }}>
          <FaCircleCheck className='animate-rise-in text-6xl' style={{ color: 'var(--success)' }} />
        </span>
        <h1 className='t-display mt-6'>{t('order.placedTitle')}</h1>
        <p className='mt-3 max-w-md text-[var(--ink-muted)]'>{t('order.placedBody')}</p>

        <div className='mt-8 flex flex-wrap justify-center gap-3'>
          <button
            className='btn-primary'
            onClick={() => navigate("/my-orders")}
          >
            <FaReceipt /> {t('order.trackCta')}
          </button>
          <button
            className='btn-ghost'
            onClick={() => navigate("/")}
          >
            {t('order.orderMore')}
          </button>
        </div>
      </div>
      </main>
    </div>
  )
}

export default OrderPlaced

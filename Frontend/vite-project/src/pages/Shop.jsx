import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { serverUrl } from '../App'
import { useNavigate, useParams } from 'react-router-dom'
import { FaStore, FaLocationDot, FaUtensils, FaArrowLeftLong } from "react-icons/fa6"
import FoodCard from '../components/FoodCard'
import MarketNav from '../components/MarketNav.jsx'
import { useTranslation } from 'react-i18next'

function Shop() {
  const { shopId } = useParams()
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    setLoading(true)
    axios.get(`${serverUrl}/api/item/getbyshop/${shopId}`, { withCredentials: true })
      .then(result => {
        if (!active) return
        setShop(result.data.shop)
        setItems(result.data.items || [])
      })
      .catch(console.log)
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [shopId])

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />
      <button
        className='fixed left-4 top-24 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-[var(--bg)]/70 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-xl transition-transform hover:scale-105 active:scale-95 lg:left-[92px]'
        onClick={() => navigate("/")}
      >
        <FaArrowLeftLong />
        <span>{t('common.back')}</span>
      </button>

      {shop && (
        <div className='relative w-full h-64 md:h-80 lg:h-96 animate-fade-in'>
          <img src={shop.image} alt={shop.name} className='h-full w-full object-cover' />
          <div className='absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/70 to-black/30 px-4 text-center'>
            <FaStore className='mb-3 text-4xl text-white drop-shadow-md' />
            <h1 className='text-3xl font-extrabold tracking-tight text-white drop-shadow-lg md:text-5xl'>{shop.name}</h1>
            <div className='mt-2 flex items-center gap-2'>
              <FaLocationDot size={20} className='text-[color:var(--accent-text)]' />
              <p className='text-base font-medium text-gray-200 md:text-lg'>{shop.address}</p>
            </div>
            <button
              onClick={() => navigate(`/bulk-order/${shopId}`)}
              className='mt-4 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold shadow-lg transition-transform hover:scale-105 active:scale-95'
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)', boxShadow: 'var(--shadow-lime)' }}
            >
              <FaStore />
              {t('bulk.orderButton', 'Bulk order')}
            </button>
          </div>
        </div>
      )}

      <div className='mx-auto max-w-7xl px-4 py-10 md:px-6'>
        <h2 className='section-heading mb-8 flex items-center justify-center gap-3'>
          <FaUtensils className='text-[color:var(--accent-text)]' />
          {t('shop.ourMenu')}
        </h2>

        {loading ? (
          <div className='flex flex-wrap justify-center gap-6'>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className='w-[270px] overflow-hidden rounded-[1.75rem]'>
                <div className='skeleton h-[185px] w-full rounded-none' />
                <div className='space-y-2 bg-white p-4'>
                  <div className='skeleton h-5 w-2/3' />
                  <div className='skeleton h-8 w-1/2' />
                </div>
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className='stagger flex flex-wrap justify-center gap-6'>
            {items.map((item) => (
              <FoodCard data={item} key={item._id} />
            ))}
          </div>
        ) : (
          <p className='card p-12 text-center text-[var(--ink-muted)] card-3d'>{t('shop.noItems')}</p>
        )}
      </div>
    </div>
  )
}

export default Shop

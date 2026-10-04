import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  HiOutlineBuildingStorefront, HiOutlineArrowRight, HiOutlineUserGroup,
  HiOutlineHeart, HiOutlineCalendarDays, HiOutlineClock,
  HiOutlineSparkles, HiOutlineMapPin
} from 'react-icons/hi2'
import { HiOutlineCube } from 'react-icons/hi2'
import axios from 'axios'
import MarketNav from '../components/MarketNav.jsx'
import FoodCard from '../components/FoodCard'
import CategoryCard from '../components/CategoryCard'
import { categories } from '../category'
import useMySchedules from '../hooks/useMySchedules.js'
import useRescueImpact from '../hooks/useRescueImpact.js'
import { serverUrl } from '../App'

/*
 * HOME — "The Market Board"
 * The city laid out as a bento of living zones: kitchens, farmer stalls,
 * the rescue table, your meal rituals, and shared tables. Each tile carries
 * its own mode tint from the token system. Nothing here is a generic feed.
 */

const MEAL_ICONS = { breakfast: '☕', lunch: '🍛', snacks: '🍪', dinner: '🌙' }

function UserDashboard() {
  const { currentCity, shopInMyCity, itemsInMyCity, searchItems, userData } = useSelector(state => state.user)
  const { t } = useTranslation()
  const navigate = useNavigate()

  const schedules = useMySchedules()
  const impact = useRescueImpact()

  const [vendors, setVendors] = useState([])
  const cateScrollRef = useRef(null)
  const [updatedItemsList, setUpdatedItemsList] = useState([])

  /* Mode tiles open with a small, calm stagger */
  useEffect(() => { setUpdatedItemsList(itemsInMyCity) }, [itemsInMyCity])

  useEffect(() => {
    let active = true
    const params = new URLSearchParams()
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          if (!active) return
          params.set('lat', position.coords.latitude)
          params.set('lng', position.coords.longitude)
          axios.get(`${serverUrl}/api/vendor/nearby?${params.toString()}`, { withCredentials: true })
            .then(res => { if (active) setVendors((res.data?.vendors || []).slice(0, 6)) })
            .catch(() => { })
        },
        () => { },
        { enableHighAccuracy: false, timeout: 6000 }
      )
    }
    axios.get(`${serverUrl}/api/vendor/nearby`, { withCredentials: true })
      .then(res => { if (active) setVendors(prev => (prev.length ? prev : (res.data?.vendors || []).slice(0, 6))) })
      .catch(() => { })
    return () => { active = false }
  }, [])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 5) return t('home.greetingNight', { defaultValue: 'Burning the midnight oil' })
    if (hour < 12) return t('home.greetingMorning', { defaultValue: 'Good morning' })
    if (hour < 17) return t('home.greetingAfternoon', { defaultValue: 'Good afternoon' })
    return t('home.greetingEvening', { defaultValue: 'Good evening' })
  }, [t])

  const activeRituals = schedules.filter(slot => slot.enabled)
  const handleFilterByCategory = category => {
    if (category === 'All') setUpdatedItemsList(itemsInMyCity)
    else setUpdatedItemsList(itemsInMyCity?.filter(item => item.category === category))
  }

  const scrollCate = direction => {
    cateScrollRef.current?.scrollBy({ left: direction === 'left' ? -240 : 240, behavior: 'smooth' })
  }

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />

      <main className='mx-auto w-full max-w-[1440px] px-4 pb-16 pt-6 sm:px-6'>
        {/* ============ Masthead ============ */}
        <header className='flex flex-wrap items-end justify-between gap-4'>
          <div>
            <p className='t-eyebrow flex items-center gap-1.5'>
              <HiOutlineMapPin className='inline' /> {t('dashboard.deliveringIn')} {currentCity || t('nav.currentCity')}
            </p>
            <h1 className='t-display mt-2'>
              {greeting}, <span className='gradient-text notranslate'>{(userData?.fullName || '').split(' ')[0]}</span>.
            </h1>
            <p className='mt-2 max-w-xl text-[15px]' style={{ color: 'var(--ink-soft)' }}>
              {t('home.mastheadLine', { defaultValue: 'The neighbourhood market is open — kitchens are firing, farmers have laid out today\'s harvest, and nothing good goes to waste.' })}
            </p>
          </div>
          <button onClick={() => navigate('/start-group-order')} className='btn-primary'>
            <HiOutlineUserGroup /> {t('home.openTable', { defaultValue: 'Open a shared table' })}
          </button>
        </header>

        {/* ============ Search results ============ */}
        {searchItems && searchItems.length > 0 && (
          <section className='card grain animate-rise-in mt-8 p-6'>
            <h2 className='t-title'>{t('dashboard.searchResults')}</h2>
            <div className='mt-4 flex flex-wrap gap-5'>
              {searchItems.map(item => <FoodCard data={item} key={item._id} />)}
            </div>
          </section>
        )}

        {/* ============ The bento market board ============ */}
        <div className='mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[auto_auto] stagger'>

          {/* --- Tonight's kitchens (eat, wide) --- */}
          <section className='tile tile-eat grain lg:col-span-3 p-6'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--accent-2)' }}>
                  <HiOutlineBuildingStorefront /> {t('home.kitchensEyebrow', { defaultValue: 'Eat' })}
                </p>
                <h2 className='t-title mt-1'>{t('home.kitchensTitle', { defaultValue: 'Tonight\'s kitchens' })}</h2>
              </div>
              <span className='hidden items-center gap-1 text-xs font-bold sm:flex' style={{ color: 'var(--ink-muted)' }}>
                {shopInMyCity?.length || 0} {t('home.openNow', { defaultValue: 'open' })}
              </span>
            </div>

            <div className='mt-4 flex gap-3 overflow-x-auto pb-2'>
              {(shopInMyCity || []).map((shop, index) => (
                <button key={index} onClick={() => navigate(`/shop/${shop._id}`)}
                  className='group relative w-36 shrink-0 overflow-hidden rounded-2xl border text-left transition-transform active:scale-95'
                  style={{ borderColor: 'var(--border)' }}>
                  {shop.image
                    ? <img src={shop.image} alt={shop.name} className='h-24 w-full object-cover transition-transform duration-700 group-hover:scale-105' />
                    : <div className='flex h-24 w-full items-center justify-center' style={{ background: 'var(--surface-3)' }}><HiOutlineBuildingStorefront size={26} style={{ color: 'var(--accent-2)' }} /></div>}
                  <div className='px-2.5 py-2' style={{ background: 'var(--surface-2)' }}>
                    <p className='truncate text-xs font-bold'>{shop.name}</p>
                    <p className='truncate text-[10px]' style={{ color: 'var(--ink-muted)' }}>{shop.city || currentCity}</p>
                  </div>
                </button>
              ))}
              {!shopInMyCity?.length && (
                <p className='py-6 text-sm' style={{ color: 'var(--ink-muted)' }}>{t('home.noKitchens', { defaultValue: 'No kitchens are open in your city yet.' })}</p>
              )}
            </div>
          </section>

          {/* --- Rescue today (rescue, tall on lg) --- */}
          <section className='tile tile-rescue grain lg:row-span-2 flex flex-col p-6'>
            <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--rescue)' }}>
              <HiOutlineHeart /> {t('home.rescueEyebrow', { defaultValue: 'Rescue' })}
            </p>
            <h2 className='t-title mt-1'>{t('home.rescueTitle', { defaultValue: 'Rescued, not wasted' })}</h2>

            <div className='mt-6 flex items-center gap-4'>
              {/* Progress ring: share of the week's 25-unit community goal (visual, calm) */}
              <div className='relative h-20 w-20 shrink-0' role='img'
                aria-label={t('home.rescueRingAria', { defaultValue: `${impact.rescuedUnits} units of food rescued` })}>
                <svg viewBox='0 0 80 80' className='h-full w-full -rotate-90'>
                  <circle cx='40' cy='40' r='34' fill='none' stroke='var(--surface-3)' strokeWidth='8' />
                  <circle cx='40' cy='40' r='34' fill='none' stroke='var(--rescue)' strokeWidth='8'
                    strokeLinecap='round' strokeDasharray={`${Math.min(1, impact.rescuedUnits / 25) * 213.6} 213.6`} />
                </svg>
                <span className='absolute inset-0 flex items-center justify-center text-lg font-black' style={{ color: 'var(--rescue)' }}>
                  {impact.rescuedUnits}
                </span>
              </div>
              <div>
                <p className='text-sm font-bold'>{t('home.rescueUnits', { defaultValue: 'units of food kept from the bin' })}</p>
                <p className='mt-0.5 text-xs' style={{ color: 'var(--ink-muted)' }}>
                  {t('home.rescueRuns', { defaultValue: 'across {{count}} completed rescue runs', count: impact.deliveries })}
                </p>
              </div>
            </div>

            <p className='mt-5 text-sm leading-relaxed' style={{ color: 'var(--ink-soft)' }}>
              {t('home.rescueCopy', { defaultValue: 'Surplus food from homes and kitchens goes straight to verified trusts nearby. Quietly, before it spoils.' })}
            </p>

            <button onClick={() => navigate('/donate-food')}
              className='mt-auto flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold transition-transform active:scale-95'
              style={{ background: 'var(--rescue-soft)', color: 'var(--rescue)' }}>
              {t('home.rescueCta', { defaultValue: 'Rescue food now' })} <HiOutlineArrowRight />
            </button>
          </section>

          {/* --- Farmers at the market (market, wide) --- */}
          <section className='tile tile-market grain lg:col-span-2 p-6'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--vendor)' }}>
                  <HiOutlineCube /> {t('home.marketEyebrow', { defaultValue: 'Market' })}
                </p>
                <h2 className='t-title mt-1'>{t('home.marketTitle', { defaultValue: 'Farmers at the market today' })}</h2>
              </div>
              <button onClick={() => navigate('/vendors/nearby')} className='flex items-center gap-1 text-xs font-bold transition-colors'
                style={{ color: 'var(--vendor)' }}>
                {t('home.marketAll', { defaultValue: 'Open the market' })} <HiOutlineArrowRight />
              </button>
            </div>

            <div className='mt-4 flex gap-3 overflow-x-auto pb-2'>
              {vendors.map(vendor => (
                <button key={vendor._id} onClick={() => navigate(`/vendor/${vendor._id}`)}
                  className='group w-40 shrink-0 rounded-2xl border p-3 text-left transition-transform active:scale-95'
                  style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                  <div className='flex items-center justify-between'>
                    <span className='flex h-9 w-9 items-center justify-center rounded-xl text-base' style={{ background: 'var(--vendor-soft)', color: 'var(--vendor)' }}>
                      {vendor.displayName?.charAt(0)?.toUpperCase() || '🧺'}
                    </span>
                    {vendor.isFreshToday && (
                      <span className='flex items-center gap-1 text-[10px] font-black' style={{ color: 'var(--rescue)' }}>
                        <span className='h-1.5 w-1.5 rounded-full animate-breathe' style={{ background: 'var(--rescue)' }} />
                        {t('vendor.freshToday')}
                      </span>
                    )}
                  </div>
                  <p className='mt-2 truncate text-sm font-bold'>{vendor.displayName || t('vendor.locationPending')}</p>
                  <p className='truncate text-[11px]' style={{ color: 'var(--ink-muted)' }}>
                    {(vendor.listings || []).slice(0, 2).map(listing => listing.name).join(' · ') || t('home.stallFresh', { defaultValue: 'Fresh stall' })}
                  </p>
                </button>
              ))}
              {!vendors.length && (
                <p className='py-6 text-sm' style={{ color: 'var(--ink-muted)' }}>{t('home.noFarmers', { defaultValue: 'No farmer stalls nearby yet — check back at dawn.' })}</p>
              )}
            </div>
          </section>

          {/* --- Open group tables (social, lime) --- */}
          <section className='tile grain lg:col-span-1 p-6 flex flex-col'
            style={{ '--tile-base': 'var(--surface-1)', '--tile-tint': 'var(--accent-soft)' }}>
            <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--accent)' }}>
              <HiOutlineUserGroup /> {t('home.tablesEyebrow', { defaultValue: 'Together' })}
            </p>
            <h2 className='t-title mt-1'>{t('home.tablesTitle', { defaultValue: 'Open group tables' })}</h2>
            <p className='mt-3 text-sm leading-relaxed' style={{ color: 'var(--ink-soft)' }}>
              {t('home.tablesCopy', { defaultValue: 'Start a table, share one link, and everyone picks and pays their own way. One kitchen, many appetites.' })}
            </p>
            <div className='mt-4 flex -space-x-2' aria-hidden='true'>
              {['A', 'R', 'M', '+'].map((letter, index) => (
                <span key={index} className='flex h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] font-black'
                  style={{ borderColor: 'var(--bg)', background: index === 3 ? 'var(--accent)' : 'var(--surface-3)', color: index === 3 ? 'var(--accent-ink)' : 'var(--ink-soft)' }}>
                  {letter}
                </span>
              ))}
            </div>
            <button onClick={() => navigate('/start-group-order')}
              className='mt-auto flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold transition-transform active:scale-95'
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)', boxShadow: 'var(--shadow-lime)' }}>
              {t('dashboard.startGroupOrder')} <HiOutlineArrowRight />
            </button>
          </section>

          {/* --- Your usual (plan, ritual) --- */}
          <section className='tile tile-plan grain lg:col-span-1 p-6 flex flex-col'>
            <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--plan)' }}>
              <HiOutlineCalendarDays /> {t('home.planEyebrow', { defaultValue: 'Rituals' })}
            </p>
            <h2 className='t-title mt-1'>{t('home.planTitle', { defaultValue: 'Your usual, on time' })}</h2>

            {activeRituals.length ? (
              <ul className='mt-4 space-y-2'>
                {activeRituals.slice(0, 4).map(slot => (
                  <li key={slot.mealType} className='flex items-center gap-2.5 rounded-xl px-3 py-2' style={{ background: 'var(--surface-2)' }}>
                    <span className='text-lg'>{MEAL_ICONS[slot.mealType] || '🍽️'}</span>
                    <span className='flex-1 truncate text-sm font-semibold capitalize'>{t(`schedule.${slot.mealType}`, slot.mealType)}</span>
                    <span className='flex items-center gap-1 text-xs font-bold' style={{ color: 'var(--plan)' }}>
                      <HiOutlineClock size={12} /> {slot.orderByTime}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className='mt-4 text-sm leading-relaxed' style={{ color: 'var(--ink-soft)' }}>
                {t('home.planEmpty', { defaultValue: 'Set your breakfast, lunch or dinner once — GroDel places the order at your cutoff every day.' })}
              </p>
            )}

            <button onClick={() => navigate('/meal-schedule')}
              className='mt-auto flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold transition-transform active:scale-95'
              style={{ background: 'var(--plan-soft)', color: 'var(--plan)' }}>
              {activeRituals.length ? t('home.planManage', { defaultValue: 'Manage rituals' }) : t('home.planCta', { defaultValue: 'Plan your meals' })} <HiOutlineArrowRight />
            </button>
          </section>
        </div>

        {/* ============ Cravings ============ */}
        <section className='mt-12'>
          <p className='t-eyebrow'>{t('dashboard.curatedForYou')}</p>
          <div className='mt-2 flex items-end justify-between gap-3'>
            <h2 className='section-heading'>{t('dashboard.cravingTitle')}</h2>
            <div className='flex gap-2'>
              <button onClick={() => scrollCate('left')} aria-label='Scroll categories left'
                className='flex h-9 w-9 items-center justify-center rounded-full border transition-colors active:scale-95'
                style={{ borderColor: 'var(--border-strong)', color: 'var(--ink-soft)' }}>‹</button>
              <button onClick={() => scrollCate('right')} aria-label='Scroll categories right'
                className='flex h-9 w-9 items-center justify-center rounded-full border transition-colors active:scale-95'
                style={{ borderColor: 'var(--border-strong)', color: 'var(--ink-soft)' }}>›</button>
            </div>
          </div>
          <div ref={cateScrollRef} className='mt-5 flex gap-4 overflow-x-auto pb-2'>
            {categories.map((cate, index) => (
              <CategoryCard
                name={t(`category.${cate.category}`, { defaultValue: cate.category })}
                image={cate.image}
                key={index}
                onClick={() => handleFilterByCategory(cate.category)}
              />
            ))}
          </div>
        </section>

        {/* ============ Market finds ============ */}
        <section className='mt-10'>
          <p className='t-eyebrow flex items-center gap-1.5'>
            <HiOutlineSparkles /> {t('home.findsEyebrow', { defaultValue: 'Fresh in the stalls' })}
          </p>
          <h2 className='section-heading mt-2'>{t('dashboard.suggestedFood')}</h2>
          <div className='mt-5 flex flex-wrap justify-center gap-5 sm:justify-start'>
            {updatedItemsList?.map(item => <FoodCard key={item._id} data={item} />)}
          </div>
        </section>
      </main>
    </div>
  )
}

export default UserDashboard

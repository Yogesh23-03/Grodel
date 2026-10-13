import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HiOutlineFire, HiOutlineStar } from 'react-icons/hi2'
import { engagementApi, readError } from './engagementApi'

/*
 * TrendingNow — what the city is actually ordering right now.
 * The "hot right now" window is the last hour, computed on the server from
 * real orders, so it stays honest during quiet periods.
 */
function TrendingNow({ city }) {
  const { t } = useTranslation()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const result = await engagementApi.trending(city || '')
        if (active) setData(result.data)
      } catch (caught) {
        if (active) setError(readError(caught))
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [city])

  if (loading) {
    return (
      <div className='grain card card-3d p-5'>
        <p className='t-eyebrow'>{t('games.trending.title')}</p>
        <div className='flex flex-col items-center gap-3 py-10'>
          <div className='loading-dots'><span /><span /><span /></div>
          <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>{t('games.loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className='grain card card-3d p-5 text-center'>
        <p className='t-eyebrow'>{t('games.trending.title')}</p>
        <p className='mt-5 text-sm' style={{ color: 'var(--ink-muted)' }}>{t('games.noData')}</p>
      </div>
    )
  }

  const hot = data.hotRightNow || []

  return (
    <div className='grain card card-3d p-5'>
      <h3 className='t-title notranslate'>
        {t('games.trending.title')} {city || t('nav.currentCity')} 🔥
      </h3>

      <p className='t-eyebrow mt-5 flex items-center gap-1.5'>
        <HiOutlineFire style={{ color: 'var(--vendor)' }} /> {t('games.trending.hotNow')}
      </p>
      {hot.length === 0 ? (
        <p className='mt-2 text-sm' style={{ color: 'var(--ink-muted)' }}>{t('games.noData')}</p>
      ) : (
        <ul className='mt-2 space-y-1.5'>
          {hot.map(item => (
            <li key={item.name} className='flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5'
              style={{ background: 'var(--surface-2)' }}>
              <span className='notranslate min-w-0 truncate text-sm font-bold' style={{ color: 'var(--ink)' }}>{item.name}</span>
              <span className='shrink-0 text-xs font-black tabular-nums' style={{ color: 'var(--accent)' }}>
                {item.count}/hr
              </span>
            </li>
          ))}
        </ul>
      )}

      {data.topRestaurant && (
        <>
          <p className='t-eyebrow mt-5'>{t('games.trending.topRestaurant')}</p>
          <p className='mt-2 flex items-center gap-2 text-sm font-bold' style={{ color: 'var(--ink)' }}>
            <HiOutlineStar style={{ color: 'var(--warning)' }} />
            <span className='notranslate min-w-0 truncate'>{data.topRestaurant.name}</span>
            <span className='shrink-0 text-xs font-black' style={{ color: 'var(--warning)' }}>
              {data.topRestaurant.rating}
            </span>
          </p>
        </>
      )}

      <p className='mt-5 border-t pt-4 text-xs' style={{ borderColor: 'var(--border)', color: 'var(--ink-muted)' }}>
        <span className='font-black' style={{ color: 'var(--accent)' }}>{data.todayOrders}</span> {t('games.trending.ordersToday')}
      </p>
    </div>
  )
}

export default TrendingNow

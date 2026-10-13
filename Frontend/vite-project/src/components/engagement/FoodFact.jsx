import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { engagementApi, readError } from './engagementApi'

/*
 * FoodFact — a "Did you know?" about the dish the customer just ordered.
 * Fetched once per dish; the wait screen loads it in the background.
 */
function FoodFact({ dishName, restaurantName }) {
  const { t } = useTranslation()

  const [fact, setFact] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!dishName) {
      setLoading(false)
      return
    }
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const result = await engagementApi.foodFact(dishName, restaurantName)
        if (active) setFact(result.data)
      } catch (caught) {
        if (active) setError(readError(caught))
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [dishName, restaurantName])

  if (loading) {
    return (
      <div className='grain card card-3d p-5'>
        <p className='t-eyebrow'>{t('games.fact.title')}</p>
        <div className='flex flex-col items-center gap-3 py-10'>
          <div className='loading-dots'><span /><span /><span /></div>
          <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>{t('games.loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !fact) {
    return (
      <div className='grain card card-3d p-5 text-center'>
        <p className='t-eyebrow'>{t('games.fact.title')}</p>
        <p className='mt-5 text-sm' style={{ color: 'var(--ink-muted)' }}>{t('games.noData')}</p>
      </div>
    )
  }

  return (
    <div className='grain card card-3d overflow-hidden'>
      <div className='p-5 sm:p-6'>
        <p className='t-eyebrow'>{t('games.fact.about')}</p>
        <p className='mt-3 text-3xl' aria-hidden='true'>{fact.emoji}</p>
        <p className='mt-3 text-sm font-black uppercase tracking-wide' style={{ color: 'var(--accent)' }}>
          {t('games.fact.title')}
        </p>
        <p className='mt-2 text-sm leading-relaxed' style={{ color: 'var(--ink-soft)' }}>{fact.fact}</p>
      </div>
    </div>
  )
}

export default FoodFact

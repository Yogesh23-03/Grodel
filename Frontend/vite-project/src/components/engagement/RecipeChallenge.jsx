import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HiOutlineClock, HiOutlineSparkles } from 'react-icons/hi2'
import { engagementApi, readError } from './engagementApi'
import CoinBurst from './CoinBurst.jsx'

/*
 * RecipeChallenge — five given ingredients, one minute, one dish.
 * The clock is cosmetic: the server grades the answer and computes the payout
 * from the timeLeft the client reports, so a paused tab cannot mint coins.
 */
function RecipeChallenge({ orderId, onEarn }) {
  const { t } = useTranslation()

  const [ingredients, setIngredients] = useState([])
  const [userAnswer, setUserAnswer] = useState('')
  const [phase, setPhase] = useState('playing')
  const [timeLeft, setTimeLeft] = useState(60)
  const [verdict, setVerdict] = useState(null)
  const [coinsEarned, setCoinsEarned] = useState(0)
  const [newBadges, setNewBadges] = useState([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  const timerRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    window.clearInterval(timerRef.current)
    try {
      const result = await engagementApi.generateRecipe()
      setIngredients(result.data?.ingredients || [])
      setTimeLeft(Number(result.data?.timeLimit) || 60)
      setUserAnswer('')
      setVerdict(null)
      setCoinsEarned(0)
      setNewBadges([])
      setPhase('playing')
    } catch (caught) {
      setError(readError(caught))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /* Countdown runs only while the player is actually guessing. */
  useEffect(() => {
    if (phase !== 'playing' || loading) return
    timerRef.current = window.setInterval(() => {
      setTimeLeft(previous => {
        if (previous <= 1) {
          window.clearInterval(timerRef.current)
          setPhase('timesup')
          return 0
        }
        return previous - 1
      })
    }, 1000)
    return () => window.clearInterval(timerRef.current)
  }, [phase, loading])

  const submit = async event => {
    event.preventDefault()
    if (checking || phase !== 'playing' || !userAnswer.trim()) return
    setChecking(true)
    setPhase('verifying')
    try {
      const result = await engagementApi.verifyRecipe(userAnswer, ingredients)
      setVerdict(result.data)

      if (result.data?.valid) {
        try {
          const credited = await engagementApi.recordRecipeWin(orderId, timeLeft)
          setCoinsEarned(credited.data?.coinsEarned || 0)
          setNewBadges(credited.data?.newBadges || [])
          onEarn?.()
        } catch (caught) {
          console.log('recipe record failed:', readError(caught))
        }
        setPhase('won')
      } else {
        setPhase('playing')
      }
    } catch (caught) {
      setError(readError(caught))
      setPhase('playing')
    } finally {
      setChecking(false)
    }
  }

  if (loading) {
    return (
      <div className='grain card card-3d p-5'>
        <h3 className='t-title notranslate'>{t('games.recipe.title')}</h3>
        <div className='flex flex-col items-center gap-3 py-12'>
          <div className='loading-dots'><span /><span /><span /></div>
          <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>{t('games.loading')}</p>
        </div>
      </div>
    )
  }

  if (error && ingredients.length === 0) {
    return (
      <div className='grain card card-3d p-5 text-center'>
        <h3 className='t-title notranslate'>{t('games.recipe.title')}</h3>
        <p className='mt-6 text-sm' style={{ color: 'var(--danger)' }}>{t('games.error')}</p>
        <p className='mt-1 text-xs' style={{ color: 'var(--ink-faint)' }}>{error}</p>
        <button onClick={load} className='btn-ghost mt-4'>{t('games.retry')}</button>
      </div>
    )
  }

  const urgent = phase === 'playing' && timeLeft <= 10

  return (
    <div className='grain card card-3d p-5'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h3 className='t-title notranslate'>{t('games.recipe.title')}</h3>
          <p className='mt-1 text-sm' style={{ color: 'var(--ink-soft)' }}>{t('games.recipe.desc')}</p>
        </div>
        <div
          className={`shrink-0 text-right text-3xl font-black tabular-nums ${urgent ? 'animate-pulse' : ''}`}
          style={{ color: urgent ? 'var(--danger)' : 'var(--accent)' }}
        >
          {timeLeft}s
        </div>
      </div>

      <p className='t-eyebrow mt-5'>{t('games.recipe.ingredients')}</p>
      <div className='mt-2 flex flex-wrap gap-2'>
        {ingredients.map((ingredient, index) => (
          <span key={`${ingredient}-${index}`}
            className='notranslate badge px-3 py-2 text-xs'
            style={{ background: 'var(--accent-2-soft)', color: 'var(--accent-2)' }}>
            {ingredient}
          </span>
        ))}
      </div>

      {phase === 'playing' && (
        <>
          <form onSubmit={submit} className='mt-5 flex gap-2'>
            <input
              type='text'
              value={userAnswer}
              onChange={event => setUserAnswer(event.target.value)}
              placeholder={t('games.recipe.yourDish')}
              aria-label={t('games.recipe.yourDish')}
              className='glass-input min-w-0 flex-1 text-sm'
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--ink)' }}
            />
            <button type='submit' disabled={checking || !userAnswer.trim()} className='btn-primary !px-5 disabled:opacity-50'>
              {t('games.submit')}
            </button>
          </form>

          {verdict && !verdict.valid && (
            <div className='animate-rise-in mt-3 rounded-2xl p-3' style={{ background: 'var(--danger-soft)' }}>
              <p className='text-sm font-bold' style={{ color: 'var(--danger)' }}>{t('games.recipe.invalid')}</p>
              {verdict.explanation && (
                <p className='mt-1 text-xs' style={{ color: 'var(--ink-soft)' }}>{verdict.explanation}</p>
              )}
            </div>
          )}
        </>
      )}

      {phase === 'verifying' && (
        <div className='flex flex-col items-center gap-3 py-8'>
          <div className='loading-dots'><span /><span /><span /></div>
          <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>{t('games.loading')}</p>
        </div>
      )}

      {phase === 'timesup' && (
        <div className='animate-rise-in mt-5 text-center'>
          <p className='text-base font-black' style={{ color: 'var(--danger)' }}>{t('games.recipe.timeUp')}</p>
          <button onClick={load} className='btn-primary mt-4 w-full'>{t('games.playAgain')}</button>
        </div>
      )}

      {phase === 'won' && (
        <div className='animate-rise-in mt-5 text-center'>
          <div className='flex justify-center'><CoinBurst burst={1} /></div>
          <p className='text-base font-black' style={{ color: 'var(--success)' }}>{t('games.recipe.valid')}</p>
          {verdict?.explanation && (
            <p className='mt-2 text-xs' style={{ color: 'var(--ink-soft)' }}>{verdict.explanation}</p>
          )}
          {coinsEarned > 0 && (
            <p className='animate-coin-pop mt-3 flex items-center justify-center gap-1.5 text-lg font-black' style={{ color: 'var(--vendor)' }}>
              <HiOutlineClock size={16} /> +{coinsEarned}
            </p>
          )}
          {newBadges.length > 0 && (
            <div className='mt-3 flex flex-wrap justify-center gap-1.5'>
              {newBadges.map(badge => (
                <span key={badge} className='badge badge-brand animate-coin-pop'>
                  <HiOutlineSparkles size={12} /> {badge.name}
                </span>
              ))}
            </div>
          )}
          <button onClick={load} className='btn-primary mt-4 w-full'>{t('games.playAgain')}</button>
        </div>
      )}
    </div>
  )
}

export default RecipeChallenge

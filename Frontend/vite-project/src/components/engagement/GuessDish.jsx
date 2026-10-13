import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HiOutlineEye, HiOutlineSparkles } from 'react-icons/hi2'
import { engagementApi, readError } from './engagementApi'
import CoinBurst from './CoinBurst.jsx'

/*
 * GuessDish — three clues that get progressively more revealing.
 * The answer comes back with the challenge only so it can be echoed to
 * /dish/verify (the spec's grading contract); it is never rendered, and
 * revealing it is what the "not solved" state uses.
 */
const MAX_ATTEMPTS = 3

function GuessDish({ orderId, onEarn }) {
  const { t } = useTranslation()

  const [clues, setClues] = useState([])
  const [category, setCategory] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [answerKey, setAnswerKey] = useState('')
  const [revealedClues, setRevealedClues] = useState(1)
  const [attempts, setAttempts] = useState(0)
  const [guess, setGuess] = useState('')
  const [phase, setPhase] = useState('playing')
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [newBadges, setNewBadges] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await engagementApi.generateDish()
      setClues(result.data?.clues || [])
      setCategory(result.data?.category || '')
      setDifficulty(result.data?.difficulty || '')
      setAnswerKey(result.data?.answer || '')
      setRevealedClues(1)
      setAttempts(0)
      setGuess('')
      setPhase('playing')
      setNewBadges([])
    } catch (caught) {
      setError(readError(caught))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const submit = async event => {
    event.preventDefault()
    if (checking || phase !== 'playing' || !guess.trim()) return
    setChecking(true)
    try {
      const result = await engagementApi.verifyDish(guess, answerKey)
      if (result.data?.correct) {
        setPhase('won')
        try {
          const credited = await engagementApi.recordDishWin(orderId, revealedClues)
          setNewBadges(credited.data?.newBadges || [])
          onEarn?.()
        } catch (caught) {
          console.log('dish record failed:', readError(caught))
        }
      } else {
        const used = attempts + 1
        setAttempts(used)
        if (used >= MAX_ATTEMPTS) {
          setPhase('lost')
          setRevealedClues(clues.length)
        } else if (revealedClues < clues.length) {
          /* A miss is also a nudge — hand over the next clue. */
          setRevealedClues(previous => Math.min(previous + 1, clues.length))
        }
      }
      setGuess('')
    } catch (caught) {
      setError(readError(caught))
    } finally {
      setChecking(false)
    }
  }

  if (loading) {
    return (
      <div className='grain card card-3d p-5'>
        <h3 className='t-title notranslate'>{t('games.guessDish.title')}</h3>
        <div className='flex flex-col items-center gap-3 py-12'>
          <div className='loading-dots'><span /><span /><span /></div>
          <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>{t('games.loading')}</p>
        </div>
      </div>
    )
  }

  if (error && clues.length === 0) {
    return (
      <div className='grain card card-3d p-5 text-center'>
        <h3 className='t-title notranslate'>{t('games.guessDish.title')}</h3>
        <p className='mt-6 text-sm' style={{ color: 'var(--danger)' }}>{t('games.error')}</p>
        <p className='mt-1 text-xs' style={{ color: 'var(--ink-faint)' }}>{error}</p>
        <button onClick={load} className='btn-ghost mt-4'>{t('games.retry')}</button>
      </div>
    )
  }

  return (
    <div className='grain card card-3d p-5'>
      <h3 className='t-title notranslate'>{t('games.guessDish.title')}</h3>
      <p className='mt-1 text-sm' style={{ color: 'var(--ink-soft)' }}>{t('games.guessDish.desc')}</p>

      {(category || difficulty) && (
        <div className='mt-3 flex flex-wrap gap-2'>
          {category && <span className='badge badge-accent'>{category}</span>}
          {difficulty && <span className='badge badge-muted'>{difficulty}</span>}
          <span className='badge badge-muted'>{t('games.attemptsLeft')}: {Math.max(0, MAX_ATTEMPTS - attempts)}</span>
        </div>
      )}

      <ol className='mt-4 space-y-2'>
        {clues.slice(0, revealedClues).map((clue, index) => (
          <li key={index} className='animate-rise-in flex items-start gap-3 rounded-2xl px-4 py-3 stagger-item'
            style={{ background: 'var(--surface-2)' }}>
            <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black'
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              {index + 1}
            </span>
            <p className='text-sm leading-relaxed' style={{ color: 'var(--ink-soft)' }}>
              <span className='font-bold'>{t('games.guessDish.clue')} {index + 1}: </span>{clue}
            </p>
          </li>
        ))}
      </ol>

      {phase === 'playing' && (
        <>
          {revealedClues < clues.length && (
            <button
              onClick={() => setRevealedClues(previous => Math.min(previous + 1, clues.length))}
              className='btn-ghost mt-3 w-full'
            >
              <HiOutlineEye size={16} /> {t('games.guessDish.reveal')}
            </button>
          )}

          <form onSubmit={submit} className='mt-4 flex gap-2'>
            <input
              type='text'
              value={guess}
              onChange={event => setGuess(event.target.value)}
              placeholder={t('games.guessDish.yourGuess')}
              aria-label={t('games.guessDish.yourGuess')}
              className='glass-input min-w-0 flex-1 text-sm'
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--ink)' }}
            />
            <button type='submit' disabled={checking || !guess.trim()} className='btn-primary !px-5 disabled:opacity-50'>
              {t('games.submit')}
            </button>
          </form>
        </>
      )}

      {phase === 'won' && (
        <div className='animate-rise-in mt-4 text-center'>
          <div className='flex justify-center'><CoinBurst burst={1} /></div>
          <p className='text-base font-black' style={{ color: 'var(--success)' }}>{t('games.guessDish.correct')}</p>
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

      {phase === 'lost' && (
        <div className='animate-rise-in mt-4 text-center'>
          <p className='text-base font-black' style={{ color: 'var(--danger)' }}>{t('games.guessDish.wrong')}</p>
          <p className='notranslate mt-3 text-sm' style={{ color: 'var(--ink-soft)' }}>
            {t('games.guessDish.answer')}: <span className='font-black' style={{ color: 'var(--accent)' }}>{answerKey}</span>
          </p>
          <button onClick={load} className='btn-primary mt-4 w-full'>{t('games.playAgain')}</button>
        </div>
      )}
    </div>
  )
}

export default GuessDish

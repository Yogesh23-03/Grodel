import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineSparkles, HiOutlineLightBulb } from 'react-icons/hi2'
import { engagementApi, readError } from './engagementApi'
import CoinBurst from './CoinBurst.jsx'

/*
 * FoodTrivia — five Groq-generated questions per session.
 * Coins are only ever credited by the server, and only after the answer is
 * graded there; the client just mirrors the tally for display.
 */
const QUESTIONS_PER_SESSION = 5
const DIFFICULTIES = ['easy', 'medium', 'hard']
const TOPICS = ['general', 'spices', 'dishes', 'nutrition', 'history']

function FoodTrivia({ orderId, onEarn }) {
  const { t } = useTranslation()

  const [phase, setPhase] = useState('pick')
  const [difficulty, setDifficulty] = useState('easy')
  const [topic, setTopic] = useState('general')
  const [currentQ, setCurrentQ] = useState(null)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [totalCoins, setTotalCoins] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newBadges, setNewBadges] = useState([])

  /* The cursor and the exclusion list must be readable from inside the
     "advance in 2s" timeout without going stale, so they live in refs. */
  const questionRef = useRef(0)
  const usedRef = useRef([])
  const advanceRef = useRef(null)

  useEffect(() => () => window.clearTimeout(advanceRef.current), [])

  const loadQuestion = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await engagementApi.generateTrivia(difficulty, topic, usedRef.current)
      const question = result.data
      if (question?.question) usedRef.current = usedRef.current.concat(question.question)
      questionRef.current += 1
      setQuestionNumber(questionRef.current)
      setCurrentQ(question)
      setSelected(null)
    } catch (caught) {
      setError(readError(caught))
    } finally {
      setLoading(false)
    }
  }

  const startQuiz = () => {
    questionRef.current = 0
    usedRef.current = []
    setPhase('playing')
    setScore(0)
    setTotalCoins(0)
    setQuestionNumber(0)
    setNewBadges([])
    loadQuestion()
  }

  const answer = async index => {
    if (selected !== null || !currentQ) return
    setSelected(index)

    const correct = index === currentQ.correctIndex
    if (correct) setScore(previous => previous + 1)

    /* The server grades and credits — the client only reports the outcome. */
    try {
      const result = await engagementApi.recordTrivia(orderId, correct, difficulty)
      setTotalCoins(previous => previous + (result.data?.coinsEarned || 0))
      if (result.data?.newBadges?.length) {
        setNewBadges(previous => [...previous, ...result.data.newBadges])
      }
      onEarn?.()
    } catch (caught) {
      console.log('trivia record failed:', readError(caught))
    }

    advanceRef.current = window.setTimeout(() => {
      if (questionRef.current >= QUESTIONS_PER_SESSION) setPhase('result')
      else loadQuestion()
    }, 2000)
  }

  /* ------------------------------------------------------------- pick ---- */
  if (phase === 'pick') {
    return (
      <div className='grain card card-3d p-5'>
        <h3 className='t-title notranslate'>{t('games.trivia.title')}</h3>
        <p className='mt-1 text-sm' style={{ color: 'var(--ink-soft)' }}>{t('games.trivia.desc')}</p>

        <p className='t-eyebrow mt-5'>{t('games.trivia.pickDifficulty')}</p>
        <div className='mt-2 grid grid-cols-3 gap-2'>
          {DIFFICULTIES.map(level => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              className='rounded-2xl border px-3 py-2.5 text-sm font-bold transition-all active:scale-95'
              style={difficulty === level
                ? { background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'var(--accent)' }
                : { background: 'var(--surface-2)', color: 'var(--ink-soft)', borderColor: 'var(--border)' }}
            >
              {t(`games.trivia.${level}`)}
            </button>
          ))}
        </div>

        <div className='mt-5 flex flex-wrap gap-2'>
          {TOPICS.map(name => (
            <button
              key={name}
              onClick={() => setTopic(name)}
              className='rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95'
              style={topic === name
                ? { background: 'var(--accent-2-soft)', color: 'var(--accent-2)', borderColor: 'var(--accent-2)' }
                : { background: 'transparent', color: 'var(--ink-muted)', borderColor: 'var(--border-strong)' }}
            >
              {t(`games.topics.${name}`)}
            </button>
          ))}
        </div>

        <button onClick={startQuiz} className='btn-primary mt-6 w-full'>{t('games.startQuiz')}</button>
      </div>
    )
  }

  /* ---------------------------------------------------------- result ---- */
  if (phase === 'result') {
    return (
      <div className='grain card card-3d p-5 text-center'>
        <h3 className='t-title notranslate'>{t('games.trivia.title')}</h3>
        <div className='mt-6 flex items-center justify-center gap-8'>
          <div>
            <p className='flex items-center justify-center gap-1 text-3xl font-black tabular-nums' style={{ color: 'var(--accent)' }}>
              {score}/{QUESTIONS_PER_SESSION}
              <CoinBurst burst={score} />
            </p>
            <p className='mt-1 text-[10px] font-bold uppercase tracking-wide' style={{ color: 'var(--ink-muted)' }}>
              {t('games.trivia.score')}
            </p>
          </div>
          <div>
            <p className='animate-coin-pop text-3xl font-black tabular-nums' style={{ color: 'var(--vendor)' }}>
              {totalCoins}
            </p>
            <p className='mt-1 text-[10px] font-bold uppercase tracking-wide' style={{ color: 'var(--ink-muted)' }}>
              {t('games.trivia.earned')}
            </p>
          </div>
        </div>

        {newBadges.length > 0 && (
          <div className='mt-5 flex flex-wrap justify-center gap-1.5'>
            {newBadges.map(badge => (
              <span key={badge.id} className='badge badge-brand animate-coin-pop'>
                <HiOutlineSparkles size={12} /> {badge.name}
              </span>
            ))}
          </div>
        )}

        <button onClick={startQuiz} className='btn-primary mt-6 w-full'>{t('games.playAgain')}</button>
      </div>
    )
  }

  /* --------------------------------------------------------- playing ---- */
  return (
    <div className='grain card card-3d p-5'>
      <div className='flex items-center justify-between gap-3'>
        <h3 className='t-title notranslate'>{t('games.trivia.title')}</h3>
        <span className='badge badge-muted'>
          {Math.min(questionNumber, QUESTIONS_PER_SESSION)} {t('games.trivia.of')} {QUESTIONS_PER_SESSION}
        </span>
      </div>

      {loading && (
        <div className='flex flex-col items-center gap-3 py-12'>
          <div className='loading-dots'><span /><span /><span /></div>
          <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>{t('games.loading')}</p>
        </div>
      )}

      {!loading && error && (
        <div className='py-10 text-center'>
          <p className='text-sm' style={{ color: 'var(--danger)' }}>{t('games.error')}</p>
          <p className='mt-1 text-xs' style={{ color: 'var(--ink-faint)' }}>{error}</p>
          <button onClick={loadQuestion} className='btn-ghost mt-4'>{t('games.retry')}</button>
        </div>
      )}

      {!loading && !error && currentQ && (
        <>
          <p className='mt-3 text-lg font-bold leading-snug' style={{ color: 'var(--ink)' }}>{currentQ.question}</p>

          <div className='mt-4 grid gap-2'>
            {currentQ.options.map((option, index) => {
              const isCorrect = index === currentQ.correctIndex
              const isPicked = selected === index
              const revealed = selected !== null

              let style = { background: 'var(--surface-2)', color: 'var(--ink)', borderColor: 'var(--border-strong)' }
              if (revealed && isCorrect) {
                style = { background: 'var(--success-soft)', color: 'var(--success)', borderColor: 'var(--success)' }
              } else if (revealed && isPicked) {
                style = { background: 'var(--danger-soft)', color: 'var(--danger)', borderColor: 'var(--danger)' }
              } else if (revealed) {
                style = { background: 'var(--surface-2)', color: 'var(--ink-muted)', borderColor: 'var(--border)' }
              }

              return (
                <button
                  key={index}
                  onClick={() => answer(index)}
                  disabled={revealed}
                  className='flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all active:scale-[0.99] disabled:cursor-default'
                  style={style}
                >
                  <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black'
                    style={{ background: 'var(--surface-3)' }}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className='flex-1'>{option}</span>
                  {revealed && isCorrect && <HiOutlineCheckCircle size={18} />}
                  {revealed && isPicked && !isCorrect && <HiOutlineXCircle size={18} />}
                </button>
              )
            })}
          </div>

          {selected !== null && (
            <div className='animate-rise-in mt-4 space-y-2'>
              <p className='text-sm font-black' style={{ color: selected === currentQ.correctIndex ? 'var(--success)' : 'var(--danger)' }}>
                {selected === currentQ.correctIndex ? t('games.trivia.correct') : t('games.trivia.wrong')}
              </p>
              {currentQ.explanation && (
                <p className='rounded-2xl p-3 text-xs leading-relaxed' style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}>
                  <span className='font-bold'>{t('games.trivia.explanation')}: </span>{currentQ.explanation}
                </p>
              )}
              {currentQ.funFact && (
                <p className='flex items-start gap-2 rounded-2xl p-3 text-xs leading-relaxed'
                  style={{ background: 'var(--warning-soft)', color: 'var(--ink-soft)' }}>
                  <HiOutlineLightBulb className='mt-0.5 shrink-0' style={{ color: 'var(--warning)' }} size={14} />
                  <span><span className='font-bold'>{t('games.trivia.funFact')}: </span>{currentQ.funFact}</span>
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default FoodTrivia

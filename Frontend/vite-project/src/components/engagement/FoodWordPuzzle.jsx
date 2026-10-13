import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HiOutlineBackspace, HiOutlineSparkles } from 'react-icons/hi2'
import { engagementApi, readError } from './engagementApi'
import Confetti from './Confetti.jsx'
import CoinBurst from './CoinBurst.jsx'

/*
 * FoodWordPuzzle — Wordle rules on a food word.
 *
 * The word never reaches this component. The server hands back only the
 * length, hint and category; every guess is graded by POST /word/verify.
 */
const MAX_ROWS = 6
const KEY_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL']
]

function FoodWordPuzzle({ orderId, onEarn }) {
    const { t } = useTranslation()

    const [gameDate, setGameDate] = useState('')
    const [wordLength, setWordLength] = useState(0)
    const [hint, setHint] = useState('')
    const [category, setCategory] = useState('')
    const [rows, setRows] = useState([])   // submitted rows: { letters, states }
    const [currentGuess, setCurrentGuess] = useState('')
    const [phase, setPhase] = useState('playing')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [checking, setChecking] = useState(false)
    const [newBadges, setNewBadges] = useState([])

    useEffect(() => {
        let active = true
        const load = async () => {
            setLoading(true)
            try {
                const result = await engagementApi.dailyWord()
                if (!active) return
                setGameDate(result.data?.date || '')
                setWordLength(result.data?.length || 0)
                setHint(result.data?.hint || '')
                setCategory(result.data?.category || '')
            } catch (caught) {
                if (active) setError(readError(caught))
            } finally {
                if (active) setLoading(false)
            }
        }
        load()
        return () => { active = false }
    }, [])

    const submitGuess = useCallback(async () => {
        if (checking || phase !== 'playing') return
        if (currentGuess.length !== wordLength) return
        setChecking(true)
        try {
            const result = await engagementApi.verifyWord(gameDate, currentGuess)
            setRows(previous => [...previous, { letters: currentGuess.split(''), states: result.data.result.map(cell => cell.state) }])
            setCurrentGuess('')

            if (result.data?.solved) {
                setPhase('won')
                try {
                    const credited = await engagementApi.recordWordWin(orderId, rows.length + 1)
                    setNewBadges(credited.data?.newBadges || [])
                    onEarn?.()
                } catch (caught) {
                    console.log('word record failed:', readError(caught))
                }
            } else if (rows.length + 1 >= MAX_ROWS) {
                setPhase('lost')
            }
        } catch (caught) {
            setError(readError(caught))
        } finally {
            setChecking(false)
        }
    }, [checking, currentGuess, gameDate, onEarn, orderId, phase, rows.length, wordLength])

    const pressKey = useCallback(letter => {
        if (phase !== 'playing') return
        if (letter === 'ENTER') { submitGuess(); return }
        if (letter === 'DEL') { setCurrentGuess(previous => previous.slice(0, -1)); return }
        setCurrentGuess(previous => (previous.length < wordLength ? previous + letter : previous))
    }, [phase, submitGuess, wordLength])

    /* Physical keyboard: same handler as the on-screen keys. */
    useEffect(() => {
        const onKeyDown = event => {
            if (event.key === 'Enter') pressKey('ENTER')
            else if (event.key === 'Backspace') pressKey('DEL')
            else if (/^[a-zA-Z]$/.test(event.key)) pressKey(event.key.toUpperCase())
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [pressKey])

    /* Best-known state per letter for the keyboard tinting. */
    const letterStates = {}
    rows.forEach(row => row.letters.forEach((letter, index) => {
        const state = row.states[index]
        const rank = { absent: 0, present: 1, correct: 2 }
        if (!letterStates[letter] || rank[state] > rank[letterStates[letter]]) letterStates[letter] = state
    }))

    const cellStyle = state => {
        if (state === 'correct') return { background: 'var(--success)', color: '#06231f', borderColor: 'var(--success)' }
        if (state === 'present') return { background: 'var(--warning)', color: '#2a2107', borderColor: 'var(--warning)' }
        if (state === 'absent') return { background: 'var(--surface-3)', color: 'var(--ink-muted)', borderColor: 'var(--surface-3)' }
        return { background: 'var(--surface-1)', color: 'var(--ink)', borderColor: 'var(--border-strong)' }
    }

    if (loading) {
        return (
            <div className='grain card card-3d p-5'>
                <h3 className='t-title notranslate'>{t('games.word.title')}</h3>
                <div className='flex flex-col items-center gap-3 py-12'>
                    <div className='loading-dots'><span /><span /><span /></div>
                    <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>{t('games.loading')}</p>
                </div>
            </div>
        )
    }

    if (error && !wordLength) {
        return (
            <div className='grain card card-3d p-5 text-center'>
                <h3 className='t-title notranslate'>{t('games.word.title')}</h3>
                <p className='mt-6 text-sm' style={{ color: 'var(--danger)' }}>{t('games.error')}</p>
                <p className='mt-1 text-xs' style={{ color: 'var(--ink-faint)' }}>{error}</p>
                <button onClick={() => window.location.reload()} className='btn-ghost mt-4'>{t('games.retry')}</button>
            </div>
        )
    }

    const emptyRows = Math.max(0, MAX_ROWS - rows.length - 1)

    return (
        <div className='grain card card-3d p-5'>
            {phase === 'won' && <Confetti />}
            <div className='flex justify-center'><CoinBurst burst={phase === 'won' ? 1 : 0} /></div>

            <h3 className='t-title notranslate'>{t('games.word.title')}</h3>
            <p className='mt-1 text-sm' style={{ color: 'var(--ink-soft)' }}>{t('games.word.desc')}</p>

            <div className='mt-4 flex flex-wrap gap-2'>
                {hint && <span className='badge badge-brand'>{t('games.word.hint')}: {hint}</span>}
                {category && <span className='badge badge-muted'>{t('games.word.category')}: {category}</span>}
                <span className='badge badge-muted'>{t('games.word.attempts')}: {rows.length}/{MAX_ROWS}</span>
            </div>

            {/* ---------------- board ---------------- */}
            <div className='mt-5 flex flex-col items-center gap-1.5'>
                {rows.map((row, rowIndex) => (
                    <div key={rowIndex} className='flex gap-1.5 stagger-item' style={{ animationDelay: `${rowIndex * 80}ms` }}>
                        {row.letters.map((letter, index) => (
                            <span
                                key={index}
                                className='animate-tile-flip flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-black uppercase sm:h-10 sm:w-10 sm:text-base lg:h-12 lg:w-12 lg:text-lg'
                                style={cellStyle(row.states[index])}
                            >
                                {letter}
                            </span>
                        ))}
                    </div>
                ))}

                {phase === 'playing' && (
                    <div className='flex gap-1.5'>
                        {Array.from({ length: wordLength }, (_, index) => (
                            <span
                                key={index}
                                className='flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-black uppercase sm:h-10 sm:w-10 sm:text-base lg:h-12 lg:w-12 lg:text-lg'
                                style={cellStyle(currentGuess[index] ? 'typing' : 'empty')}
                            >
                                {currentGuess[index] || ''}
                            </span>
                        ))}
                    </div>
                )}

                {Array.from({ length: emptyRows }, (_, rowIndex) => (
                    <div key={rowIndex} className='flex gap-1.5 stagger-item' style={{ animationDelay: `${rowIndex * 80}ms` }}>
                        {Array.from({ length: wordLength }, (_, index) => (
                            <span key={index} className='h-8 w-8 rounded-lg border sm:h-10 sm:w-10 lg:h-12 lg:w-12 stagger-item'
                                style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }} />
                        ))}
                    </div>
                ))}
            </div>

            {/* ---------------- outcome ---------------- */}
            {phase !== 'playing' && (
                <div className='animate-rise-in mt-5 text-center'>
                    <p className='text-base font-black' style={{ color: phase === 'won' ? 'var(--success)' : 'var(--danger)' }}>
                        {phase === 'won' ? t('games.word.won') : t('games.word.lost')}
                    </p>
                    {newBadges.length > 0 && (
                        <div className='mt-3 flex flex-wrap justify-center gap-1.5'>
                            {newBadges.map(badge => (
                                <span key={badge} className='badge badge-brand animate-coin-pop'>
                                    <HiOutlineSparkles size={12} /> {badge.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ---------------- keyboard ---------------- */}
            {phase === 'playing' && (
                <div className='mt-5 -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0'>
                    <div className='space-y-1.5'>
                    {KEY_ROWS.map((row, rowIndex) => (
                        <div key={rowIndex} className='flex w-max min-w-full justify-center gap-1 stagger-item' style={{ animationDelay: `${rowIndex * 80}ms` }}>
                            {row.map(key => {
                                const state = letterStates[key]
                                const wide = key === 'ENTER' || key === 'DEL'
                                return (
                                    <button
                                        key={key}
                                        onClick={() => pressKey(key)}
                                        disabled={checking}
                                        aria-label={key}
                                        className='flex shrink-0 items-center justify-center rounded-lg text-xs font-black uppercase transition-all active:scale-90 disabled:opacity-50'
                                        style={{
                                            minWidth: wide ? 46 : 28, height: 40, padding: '0 6px',
                                            ...(state === 'correct'
                                                ? { background: 'var(--success)', color: '#06231f' }
                                                : state === 'present'
                                                    ? { background: 'var(--warning)', color: '#2a2107' }
                                                    : state === 'absent'
                                                        ? { background: 'var(--surface-3)', color: 'var(--ink-faint)' }
                                                        : { background: 'var(--surface-2)', color: 'var(--ink)' })
                                        }}
                                    >
                                        {key === 'DEL' ? <HiOutlineBackspace size={16} /> : key === 'ENTER' ? '↵' : key}
                                    </button>
                                )
                            })}
                        </div>
                    ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default FoodWordPuzzle

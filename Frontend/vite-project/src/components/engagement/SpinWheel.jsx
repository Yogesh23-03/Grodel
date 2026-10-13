import React, { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HiOutlineBanknotes, HiOutlineTruck, HiOutlineSparkles, HiOutlineTrophy } from 'react-icons/hi2'
import { engagementApi, readError } from './engagementApi'
import Confetti from './Confetti.jsx'
import CoinBurst from './CoinBurst.jsx'

/*
 * SpinWheel — seven weighted prizes, but the client never picks one.
 * POST /spin returns the winning index from the server, which also guarantees
 * a single spin per order. The wheel only animates to whatever it is told.
 */
const SEGMENT_COUNT = 7
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT
const SEGMENT_FILL = [
  'var(--accent)', '#0d1a12', 'var(--vendor)', '#2f4a52',
  'var(--rescue)', 'var(--plan)', 'var(--danger)'
]

/* Localise the prize: the server sends a type + value, never display text. */
const prizeKey = prize => {
  if (prize?.type === 'discount') return `discount${prize.value}`
  if (prize?.type === 'coins') return `coins${prize.value}`
  if (prize?.type === 'freeDelivery') return 'freeDelivery'
  return 'none'
}

/* Polar → cartesian, with 0° pointing at the 12 o'clock pointer. */
const pointOnWheel = (centre, radius, angle) => {
  const radians = (angle * Math.PI) / 180
  return {
    x: centre + radius * Math.sin(radians),
    y: centre - radius * Math.cos(radians)
  }
}

const SegmentFace = ({ prize }) => {
  if (prize?.type === 'discount') return <span className='text-[13px] font-black'>{prize.value}%</span>
  if (prize?.type === 'coins') return (
    <span className='flex items-center gap-0.5 text-[13px] font-black'>
      <HiOutlineBanknotes size={13} />{prize.value}
    </span>
  )
  if (prize?.type === 'freeDelivery') return <HiOutlineTruck size={17} />
  return <HiOutlineSparkles size={16} />
}

function SpinWheel({ orderId, onEarn }) {
  const { t } = useTranslation()

  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [prize, setPrize] = useState(null)
  const [alreadySpun, setAlreadySpun] = useState(false)
  const [error, setError] = useState('')
  /* Full turns already completed, so every animation only ever goes forward. */
  const turnsRef = useRef(0)

  const segments = useMemo(() => Array.from({ length: SEGMENT_COUNT }, (_, index) => {
    const start = index * SEGMENT_ANGLE
    const end = start + SEGMENT_ANGLE
    const centre = 100
    const radius = 92
    const from = pointOnWheel(centre, radius, start)
    const to = pointOnWheel(centre, radius, end)
    const mid = pointOnWheel(centre, radius * 0.64, start + SEGMENT_ANGLE / 2)
    return { index, from, to, mid, fill: SEGMENT_FILL[index] }
  }), [])

  /* Placeholder faces so the wheel reads as a wheel before it is spun. */
  const faces = [
    { type: 'discount', value: 5 },
    { type: 'discount', value: 10 },
    { type: 'freeDelivery', value: 1 },
    { type: 'coins', value: 10 },
    { type: 'coins', value: 25 },
    { type: 'coins', value: 50 },
    { type: 'none', value: 0 }
  ]

  const spin = async () => {
    if (spinning || alreadySpun || !orderId) return
    setSpinning(true)
    setError('')
    try {
      const result = await engagementApi.spin(orderId)
      const index = result.data?.prizeIndex ?? 0

      /* Land slice `index` under the fixed top pointer: the slice centre sits
         at index*51.43 + 25.71, so we need R ≡ -(centre) (mod 360). */
      const sliceCentre = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2
      const alignment = ((360 - sliceCentre) % 360 + 360) % 360
      turnsRef.current += 5
      const target = turnsRef.current * 360 + alignment

      setPrize(result.data?.prize || null)
      setRotation(target)
      onEarn?.()

      /* Matches the 4s CSS transition below. */
      window.setTimeout(() => setSpinning(false), 4000)
    } catch (caught) {
      const message = readError(caught)
      if (caught?.response?.status === 400) setAlreadySpun(true)
      else setError(message)
      setSpinning(false)
    }
  }

  const won = !spinning && prize !== null
  const isWinningPrize = won && prize?.type !== 'none'

  return (
    <div className='grain card card-3d p-5'>
      {isWinningPrize && <Confetti />}
      <div className='flex justify-center'><CoinBurst burst={isWinningPrize ? 1 : 0} /></div>

      <h3 className='t-title notranslate'>{t('games.spin.title')}</h3>
      <p className='mt-1 text-sm' style={{ color: 'var(--ink-soft)' }}>{t('games.spin.desc')}</p>

      <div className='relative mx-auto mt-5 w-full max-w-[300px] sm:max-w-[380px]'>
        {/* the pointer */}
        <div className='absolute left-1/2 top-[-6px] z-10 -translate-x-1/2' aria-hidden='true'>
          <span className='block h-0 w-0 border-x-[9px] border-t-[14px] border-x-transparent'
            style={{ borderTopColor: 'var(--accent)' }} />
        </div>

        <svg viewBox='0 0 200 200' className='w-full'
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
          }}
          role='img'
          aria-label={t('games.spin.title')}
        >
          {segments.map(segment => (
            <path
              key={segment.index}
              d={`M 100 100 L ${segment.from.x} ${segment.from.y} A 92 92 0 0 1 ${segment.to.x} ${segment.to.y} Z`}
              fill={segment.fill}
              stroke='var(--surface-1)'
              strokeWidth='1.5'
            />
          ))}

          {segments.map(segment => (
            <foreignObject
              key={`face-${segment.index}`}
              x={segment.mid.x - 22}
              y={segment.mid.y - 12}
              width='44'
              height='24'
            >
              <div className='flex h-full w-full items-center justify-center'
                style={{ color: segment.index % 2 === 1 ? 'var(--ink)' : '#141a04' }}>
                <SegmentFace prize={faces[segment.index]} />
              </div>
            </foreignObject>
          ))}

          <circle cx='100' cy='100' r='26' fill='var(--surface-1)' stroke='var(--border)' />
          <foreignObject x='74' y='88' width='52' height='24'>
            <div className='flex h-full w-full items-center justify-center text-sm font-black'
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              GroDel
            </div>
          </foreignObject>
        </svg>
      </div>

      <button
        onClick={spin}
        disabled={spinning || alreadySpun}
        className='btn-primary mt-5 w-full disabled:opacity-60'
      >
        {spinning ? t('games.spin.spinning') : alreadySpun ? t('games.spin.alreadySpun') : t('games.spin.spin')}
      </button>

      {error && (
        <p className='mt-3 text-center text-xs' style={{ color: 'var(--danger)' }}>{t('games.error')} — {error}</p>
      )}

      {won && (
        <div className='animate-modal-in mt-5 rounded-2xl p-4 text-center' style={{ background: 'var(--surface-2)' }}>
          {prize?.type === 'none' ? (
            <p className='text-sm font-bold' style={{ color: 'var(--ink-muted)' }}>{t('games.spin.prizes.none')}</p>
          ) : (
            <>
              <p className='t-eyebrow flex items-center justify-center gap-1.5'>
                <HiOutlineTrophy style={{ color: 'var(--accent)' }} /> {t('games.spin.youWon')}
              </p>
              <p className='animate-coin-pop mt-2 text-lg font-black' style={{ color: 'var(--accent)' }}>
                {t(`games.spin.prizes.${prizeKey(prize)}`)}
              </p>
              <p className='mt-1 text-xs' style={{ color: 'var(--ink-faint)' }}>{t('games.coinsInfo')}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default SpinWheel

import React, { useMemo } from 'react'

/*
 * CoinBurst — a small, dependency-free coin explosion for the moment a game
 * is won. It renders nothing while `burst` is 0, and replays the
 * @keyframes coin-burst declared in index.css every time `burst` changes
 * (the keyed span is remounted, so the animation starts over).
 *
 *   <CoinBurst burst={phase === 'won' ? 1 : 0} />
 *
 * No state and no timers: once the animation finishes the pieces sit at
 * opacity 0 and never intercept a tap.
 */
const PIECES = 14

function CoinBurst({ burst = 0, count = PIECES, coins = ['🪙', '💰', '✨'], className = '' }) {
  const pieces = useMemo(
    () => Array.from({ length: count }, (_, index) => {
      const spread = (index / Math.max(1, count - 1)) * 2 - 1        // -1 … 1
      const distance = 54 + (index % 3) * 16
      return {
        key: index,
        emoji: coins[index % coins.length],
        x: Math.round(spread * 78),
        y: -Math.round(distance * (0.75 + (index % 2) * 0.35)),
        delay: `${(index % 4) * 45}ms`,
        size: index % 3 === 0 ? 'text-base' : 'text-sm'
      }
    }),
    [count, coins]
  )

  if (!burst) return null

  return (
    <span key={burst} className={`relative inline-flex h-0 w-0 items-center justify-center ${className}`} aria-hidden='true'>
      {pieces.map(piece => (
        <span
          key={piece.key}
          className={`coin-burst-piece notranslate ${piece.size}`}
          style={{
            '--coin-x': `${piece.x}px`,
            '--coin-y': `${piece.y}px`,
            '--coin-delay': piece.delay,
            left: 0,
            top: 0
          }}
        >
          {piece.emoji}
        </span>
      ))}
    </span>
  )
}

export default CoinBurst

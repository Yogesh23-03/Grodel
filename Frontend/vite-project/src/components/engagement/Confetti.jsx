import React from 'react'

/*
 * Confetti — 50 plain divs on the fixed overlay, no animation library.
 *
 * Positions come from a deterministic hash of each piece's index rather than
 * Math.random(): rendering stays pure (so React may re-render freely without
 * re-shuffling pieces mid-flight), and the burst looks the same every time.
 */
const COLORS = ['#cdf060', '#5eead4', '#e8956d', '#b7a6f2', '#ecc56a', '#8fd6a4', '#f08c7d']
const PIECE_COUNT = 50

/* Hash → 0..1. Math.sin is pure, so this is safe to call during render. */
const scatter = (index, salt) => {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return Math.abs(value - Math.floor(value))
}

const PIECES = Array.from({ length: PIECE_COUNT }, (_, index) => ({
  id: index,
  left: scatter(index, 1) * 100,
  delay: scatter(index, 2) * 1.6,
  duration: 2.2 + scatter(index, 3) * 1.8,
  size: 6 + scatter(index, 4) * 7,
  color: COLORS[index % COLORS.length],
  round: scatter(index, 5) > 0.5
}))

function Confetti() {
  return (
    <div aria-hidden='true'>
      {PIECES.map(piece => (
        <span
          key={piece.id}
          className='confetti-piece'
          style={{
            left: `${piece.left}vw`,
            width: piece.size,
            height: piece.round ? piece.size : piece.size * 1.6,
            background: piece.color,
            borderRadius: piece.round ? '50%' : '2px',
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`
          }}
        />
      ))}
    </div>
  )
}

export default Confetti

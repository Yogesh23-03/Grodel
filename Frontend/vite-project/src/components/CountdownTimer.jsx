import React, { useEffect, useState } from 'react'

const CountdownTimer = ({ expiresAt, onExpire }) => {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const tick = () => {
      const next = Math.max(0, new Date(expiresAt).getTime() - Date.now())
      setRemaining(next)
      if (!next) onExpire?.()
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [expiresAt, onExpire])

  const totalSeconds = Math.floor(remaining / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return <span className={`font-bold tabular-nums ${remaining < 5 * 60 * 1000 ? 'text-red-600' : 'text-[#07111c]'}`}>{minutes}:{seconds}</span>
}

export default CountdownTimer

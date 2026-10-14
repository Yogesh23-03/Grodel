import { useEffect } from 'react'

/*
 * AuroraBg — the ambient room: four slowly drifting blurred orbs, plus the
 * pointer-parallax publisher.
 *
 * Renders once from App.jsx, before the routes. There is deliberately no
 * state, no props, no handlers and no data access here. Page content is lifted
 * above this layer by `.animate-page-fade { z-index: 1 }` in index.css, so
 * nothing in this file can cover or intercept a click.
 *
 * The drifting food objects live in FloatingFoodBackground.jsx — this file
 * owns only the light. It is also what publishes --mouse-x / --mouse-y, the
 * pointer offset that the food layer reads for its per-tier depth parallax,
 * so the whole app needs just this one pointer listener.
 */

/* Four orbs, each with its own drift keyframe and colour. */
const ORBS = [
  { key: 'o1', cls: 'aurora-orb-1 orb-drift-1', size: 700, style: { top: '8%', left: '16%' }, tier: 'all' },
  { key: 'o2', cls: 'aurora-orb-2 orb-drift-2', size: 600, style: { top: '48%', right: '6%' }, tier: 'all' },
  { key: 'o3', cls: 'aurora-orb-3 orb-drift-3', size: 500, style: { bottom: '6%', left: '38%' }, tier: 'lg' },
  { key: 'o4', cls: 'aurora-orb-4 orb-drift-4', size: 420, style: { top: '28%', right: '38%' }, tier: 'lg' },
]

function AuroraBg() {
  /* Presentational only: publishes the pointer offset as CSS variables that
     decorative layers read. Never applied to interactive elements. */
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMove = (event) => {
      if (reduce.matches) return
      const x = (event.clientX / window.innerWidth - 0.5) * 20
      const y = (event.clientY / window.innerHeight - 0.5) * 20
      const root = document.documentElement
      root.style.setProperty('--mouse-x', `${x.toFixed(2)}px`)
      root.style.setProperty('--mouse-y', `${y.toFixed(2)}px`)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <div className='aurora-bg' aria-hidden='true'>
      {ORBS.map((orb) => (
        <div
          key={orb.key}
          className={`aurora-orb ${orb.cls}${orb.tier === 'lg' ? ' hidden md:block' : ''}`}
          style={{ width: orb.size, height: orb.size, ...orb.style }}
        />
      ))}
    </div>
  )
}

export default AuroraBg

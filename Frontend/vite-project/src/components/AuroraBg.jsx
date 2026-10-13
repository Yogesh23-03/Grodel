import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/*
 * AuroraBg — a purely decorative background layer.
 *
 * Renders ONCE from App.jsx, before the routes:
 *   · four slowly drifting blurred orbs (brand / teal / violet / amber)
 *   · on the landing route only, a handful of floating food shapes
 *   · a pointer parallax driver that only writes the --mouse-x / --mouse-y
 *     custom properties used by decorative elements
 *
 * There is deliberately no state, no props, no handlers and no data access.
 * Page content is lifted above this layer by `.animate-page-fade { z-index: 1 }`
 * in index.css, so nothing here can cover or intercept a click.
 */

/* Shapes are inline SVG rather than emoji: emoji glyph coverage varies across
   the 15 UI languages and would render inconsistently (and as text). */
const SHAPE = {
  plate: (
    <svg viewBox='0 0 48 48' width='100%' height='100%' fill='none'>
      <circle cx='24' cy='24' r='20' stroke='currentColor' strokeWidth='2.5' />
      <circle cx='24' cy='24' r='12' stroke='currentColor' strokeWidth='2.5' />
      <circle cx='24' cy='24' r='4' fill='currentColor' />
    </svg>
  ),
  leaf: (
    <svg viewBox='0 0 48 48' width='100%' height='100%' fill='none'>
      <path d='M38 10C22 12 12 20 11 33c0 2 1 4 3 4 13 1 21-9 24-27Z' stroke='currentColor' strokeWidth='2.5' strokeLinejoin='round' />
      <path d='M33 16 13 37' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' />
    </svg>
  ),
  bowl: (
    <svg viewBox='0 0 48 48' width='100%' height='100%' fill='none'>
      <path d='M6 22h36c0 10-8 17-18 17S6 32 6 22Z' stroke='currentColor' strokeWidth='2.5' strokeLinejoin='round' />
      <path d='M16 15c0-3 2-4 2-7M24 14c0-3 2-4 2-7M32 15c0-3 2-4 2-7' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' />
    </svg>
  ),
  chili: (
    <svg viewBox='0 0 48 48' width='100%' height='100%' fill='none'>
      <path d='M18 14c10 2 16 9 16 16 0 5-4 8-9 8-8 0-13-7-13-16' stroke='currentColor' strokeWidth='2.5' strokeLinejoin='round' />
      <path d='M18 14c-1-4 1-7 5-8' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' />
    </svg>
  ),
  hat: (
    <svg viewBox='0 0 48 48' width='100%' height='100%' fill='none'>
      <path d='M14 30v-6c-4-1-6-4-6-8 0-5 4-8 9-8 1-3 4-5 7-5s6 2 7 5c5 0 9 3 9 8 0 4-2 7-6 8v6' stroke='currentColor' strokeWidth='2.5' strokeLinejoin='round' />
      <path d='M13 30h22v6H13z' stroke='currentColor' strokeWidth='2.5' strokeLinejoin='round' />
    </svg>
  ),
  carrot: (
    <svg viewBox='0 0 48 48' width='100%' height='100%' fill='none'>
      <path d='M30 18 12 36l-3-3 18-18Z' stroke='currentColor' strokeWidth='2.5' strokeLinejoin='round' />
      <path d='M30 18c3-3 3-8 0-11-3-3-8-3-11 0' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' />
      <path d='M34 8c2-2 5-2 7 0M33 20c2 2 2 5 0 7' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' />
    </svg>
  ),
  spice: (
    <svg viewBox='0 0 48 48' width='100%' height='100%' fill='none'>
      <path d='M24 8v32M16 16h16M14 30h20' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' />
      <circle cx='24' cy='8' r='3' stroke='currentColor' strokeWidth='2.5' />
      <circle cx='14' cy='30' r='3' stroke='currentColor' strokeWidth='2.5' />
      <circle cx='34' cy='30' r='3' stroke='currentColor' strokeWidth='2.5' />
    </svg>
  ),
}

/* Fixed placement, size and colour for the drifting shapes. Kept compact on
   purpose: four are shown on small screens, all of them from 768px up. */
const FLOATERS = [
  { key: 'a', shape: 'plate',  cls: 'float-slow', color: 'var(--brand)',  delay: '0s',   width: 60, opacity: 0.22, style: { left: '4%', top: '14%' }, tier: 'all' },
  { key: 'b', shape: 'bowl',   cls: 'float-mid',  color: 'var(--brand-2)', delay: '1.2s', width: 54, opacity: 0.20, style: { right: '6%', top: '10%' }, tier: 'all' },
  { key: 'c', shape: 'leaf',   cls: 'float-fast', color: 'var(--teal)',   delay: '2s',   width: 52, opacity: 0.20, style: { left: '2%', top: '46%' }, tier: 'all' },
  { key: 'd', shape: 'carrot', cls: 'float-slow', color: 'var(--amber)',  delay: '1.7s', width: 46, opacity: 0.19, style: { right: '4%', top: '42%' }, tier: 'all' },
  { key: 'e', shape: 'chili',  cls: 'float-mid',  color: 'var(--brand)',  delay: '0.6s', width: 42, opacity: 0.18, style: { left: '9%', bottom: '22%' }, tier: 'lg' },
  { key: 'f', shape: 'spice',  cls: 'float-fast', color: 'var(--violet)', delay: '3s',   width: 42, opacity: 0.18, style: { right: '9%', bottom: '26%' }, tier: 'lg' },
  { key: 'g', shape: 'hat',    cls: 'float-slow', color: 'var(--brand-2)', delay: '2.6s', width: 40, opacity: 0.16, style: { left: '44%', top: '7%' }, tier: 'lg' },
  { key: 'h', shape: 'leaf',   cls: 'float-mid',  color: 'var(--teal)',   delay: '1.1s', width: 38, opacity: 0.17, style: { left: '18%', bottom: '16%' }, tier: 'lg' },
]

/* Four orbs, each with its own drift keyframe and colour. */
const ORBS = [
  { key: 'o1', cls: 'aurora-orb-1 orb-drift-1', size: 700, style: { top: '8%', left: '16%' }, tier: 'all' },
  { key: 'o2', cls: 'aurora-orb-2 orb-drift-2', size: 600, style: { top: '48%', right: '6%' }, tier: 'all' },
  { key: 'o3', cls: 'aurora-orb-3 orb-drift-3', size: 500, style: { bottom: '6%', left: '38%' }, tier: 'lg' },
  { key: 'o4', cls: 'aurora-orb-4 orb-drift-4', size: 420, style: { top: '28%', right: '38%' }, tier: 'lg' },
]

function AuroraBg() {
  const { pathname } = useLocation()

  /* Presentational only: publishes the pointer offset as CSS variables that
     decorative elements read. Never applied to interactive elements. */
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

  const isLanding = pathname === '/'

  return (
    <div className='aurora-bg' aria-hidden='true'>
      {ORBS.map((orb) => (
        <div
          key={orb.key}
          className={`aurora-orb ${orb.cls}${orb.tier === 'lg' ? ' hidden md:block' : ''}`}
          style={{ width: orb.size, height: orb.size, ...orb.style }}
        />
      ))}

      {isLanding && FLOATERS.map((f) => (
        <div
          key={f.key}
          className='food-float'
          style={f.style}
        >
          <div
            className={`${f.cls}${f.tier === 'lg' ? ' hidden md:block' : ''}`}
            style={{
              width: f.width,
              height: f.width,
              opacity: f.opacity,
              color: f.color,
              animationDelay: f.delay,
            }}
          >
            {SHAPE[f.shape]}
          </div>
        </div>
      ))}
    </div>
  )
}

export default AuroraBg

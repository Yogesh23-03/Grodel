import { useEffect } from 'react'

/*
 * GlobalTilt — one listener that gives EVERY card on EVERY route a
 * pointer-driven 3D tilt.
 *
 * Why delegated instead of per-card React state:
 *   A <TiltCard> that tracks the mouse with useState re-renders its subtree
 *   on every pointermove — at 20 cards that is thousands of renders a
 *   second. Here a single document-level listener writes two CSS custom
 *   properties on the hovered element, and CSS does the transform. Zero
 *   React renders, zero reflow, one listener for the whole app.
 *
 * Any element matching `.tilt`, `.card-3d` or `.tile` is picked up
 * automatically. `.card-3d` matters most: it is the class the ~57 existing
 * cards, panels and rows across the app already carry, so binding the
 * listener to it lights up the whole product's 3D hover without editing a
 * single page. Each of those rules reads the --rx/--ry channels written
 * here and applies its own transform.
 *
 * Mount once, next to <AuroraBg /> in App.jsx. Purely presentational.
 */

/* How far a corner tilts, in degrees. Larger = more theatrical, less legible. */
const MAX_TILT = 7

/* A 40px chip and a 900px dashboard panel cannot share one angle: 7deg is
   right for the chip and nauseating on the panel. Scale the angle down as
   the element grows, on the element's smaller axis so a wide short banner
   is judged by its height. */
function tiltFactor(rect) {
  const small = Math.min(rect.width, rect.height)
  const damped = (small - 180) / (700 - 180)   /* 180px → 1, 700px+ → 0 */
  return Math.max(0.32, Math.min(1, 1 - damped * 0.68))
}

export default function GlobalTilt() {
  useEffect(() => {
    /* Respect the OS setting and skip touch-only devices entirely — a tilt
       driven by a finger is meaningless and costs a listener for nothing. */
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const coarse = window.matchMedia('(hover: none)')
    if (reduce.matches || coarse.matches) return

    let current = null

    const reset = (el) => {
      if (!el) return
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
      el.style.removeProperty('will-change')
    }

    const onMove = (event) => {
      const el = event.target instanceof Element ? event.target.closest('.tilt, .card-3d, .tile') : null

      if (el !== current) {
        reset(current)
        current = el
      }
      if (!el) return

      const rect = el.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      /* -0.5..0.5 across the card, then scaled to degrees. Y is inverted so
         the card leans away from the pointer rather than into it. */
      const px = (event.clientX - rect.left) / rect.width - 0.5
      const py = (event.clientY - rect.top) / rect.height - 0.5

      const scale = MAX_TILT * 2 * tiltFactor(rect)
      el.style.setProperty('--ry', `${(px * scale).toFixed(2)}deg`)
      el.style.setProperty('--rx', `${(-py * scale).toFixed(2)}deg`)
    }

    const onLeave = () => {
      reset(current)
      current = null
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    document.addEventListener('scroll', onLeave, { passive: true })

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('scroll', onLeave)
      reset(current)
    }
  }, [])

  return null
}

import { useEffect, useRef } from 'react'

/*
 * useScrollReveal — attach the returned ref to any element and it fades in
 * (and rises) the first time it scrolls into view.
 *
 * Two call styles are supported on purpose. New work (the landing page) uses
 * the plain form, while the pages that already shipped use the options object:
 *
 *   const heading = useScrollReveal()                 // plain
 *   const heading = useScrollReveal(120)              // plain, 120ms delay
 *   const grid    = useScrollReveal({ delay: '120ms' }) // older pages
 *
 * Pure CSS under the hood (see the .reveal rules in index.css), so nothing
 * animates on the JS thread. Elements start visible when IntersectionObserver
 * is unavailable, so content can never end up stuck hidden.
 */

const REVEAL_ROOT_MARGIN = '0px 0px -8% 0px'

function useRevealRef({ delayMs, delayCss, threshold, rootMargin, once, visibleClass }) {
  const ref = useRef(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      element.classList.add(visibleClass)
      return undefined
    }

    element.classList.add('reveal')
    if (delayCss) element.style.transitionDelay = delayCss

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (delayMs) window.setTimeout(() => entry.target.classList.add(visibleClass), delayMs)
          else entry.target.classList.add(visibleClass)
          if (once) observer.unobserve(entry.target)
        } else if (!once) {
          entry.target.classList.remove(visibleClass)
        }
      })
    }, { threshold, rootMargin })

    observer.observe(element)
    return () => observer.disconnect()
  }, [delayMs, delayCss, threshold, rootMargin, once, visibleClass])

  return ref
}

export function useScrollReveal(delay = 0) {
  return useRevealRef({
    delayMs: typeof delay === 'number' ? delay : 0,
    delayCss: typeof delay === 'string' ? delay : '',
    threshold: 0.12,
    rootMargin: REVEAL_ROOT_MARGIN,
    once: true,
    visibleClass: 'visible'
  })
}

export default function useScrollRevealWithOptions({
  delay = '0ms',
  threshold = 0.15,
  rootMargin = REVEAL_ROOT_MARGIN,
  once = true
} = {}) {
  return useRevealRef({
    delayMs: 0,
    delayCss: delay,
    threshold,
    rootMargin,
    once,
    visibleClass: 'is-visible'
  })
}

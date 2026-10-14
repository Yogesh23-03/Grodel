import { useEffect } from 'react'

/*
 * ============================================================================
 *  FloatingFoodBackground — the "dreamy floating 3D food world"
 * ============================================================================
 *
 *  HOW TO TUNE IT  (everything below is in the CONFIG object)
 *  ---------------------------------------------------------------------------
 *  density.far / density.mid / density.near
 *      How many objects each depth tier draws. The three tiers are also the
 *      quality dial: cut `far` first if you want it cheaper, since those are
 *      the blurred, smallest, least noticeable objects.
 *  mobileFraction
 *      Share of objects kept below 640px (0.5 = half). The rest are hidden
 *      with CSS, not by re-rendering, so there is no resize listener.
 *  tiers.*.size / opacity / blur / parallax
 *      size      px range. The first object in a tier takes the top of the
 *                range and the last takes the bottom, so 30px distant fruit
 *                and 220px close-ups come out of these two numbers alone.
 *      opacity   keep these low — the brief's ceiling is 0.40 so a card's text
 *                never has to compete with the background.
 *      blur      depth-of-field in px. 0 = crisp foreground, 6 = far haze.
 *      parallax  pointer/scroll travel multiplier. This is what makes the
 *                tiers feel like separate distances; raise `near.parallax`
 *                for a stronger 3D push, or set all three equal to flatten it.
 *  motion.floatSeconds / delaySeconds
 *      Each object picks its own duration and delay from these ranges, so
 *      nothing ever syncs into a wave.
 *  drifters / driftSeconds
 *      How many objects slowly cross the screen horizontally, and over how
 *      long. Set drifters: 0 to switch that off entirely.
 *  scroll.amplitude / scroll.wavelength / scroll.share
 *      Scroll parallax is a bounded oscillation, not a scroll-linked offset.
 *      A linear offset would push every object out of the viewport on a long
 *      page and leave the background empty further down; an oscillation stays
 *      inside `amplitude` px forever. wavelength = px of scroll per half
 *      cycle (bigger = lazier), share = how much of each tier's parallax
 *      weight the scroll uses. Set share to 0 to disable it and drop the
 *      listener.
 *
 *  PERFORMANCE
 *  ---------------------------------------------------------------------------
 *  No JS animation loop. Motion is CSS keyframes on `transform`; the parallax
 *  is a CSS `translate` fed by two custom properties. One passive, rAF-batched
 *  scroll listener publishes --bg-scroll; the pointer publisher already exists
 *  in AuroraBg.jsx, so this component adds no second pointer listener. Objects
 *  animate `transform` while the wrapper owns `translate`, which is why the two
 *  never fight over one property.
 *
 *  LAYERING
 *  ---------------------------------------------------------------------------
 *  fixed, pointer-events: none, z-index 0 — the same slot as AuroraBg, and
 *  below `.animate-page-fade { z-index: 1 }` which lifts all page content. So
 *  it can never cover text or intercept a click. The vignette is the last child
 *  of this layer, which keeps it above the food but still under the UI.
 *
 *  ART
 *  ---------------------------------------------------------------------------
 *  Inline SVG, not emoji or bitmap: no network cost, no glyph-coverage gaps
 *  across the 15 UI languages, and every shape can be lit with the theme
 *  tokens. Volume comes from a radial gradient, the "3D" read from a specular
 *  highlight plus a rim stroke, and the neon from a per-object
 *  `drop-shadow`glow` in the object's accent.
 */

/* --------------------------------------------------------------------------- */
/*  TUNING CONFIG                                                              */
/* --------------------------------------------------------------------------- */
const CONFIG = {
  density: { far: 7, mid: 6, near: 4 },
  mobileFraction: 0.5,

  tiers: {
    far:  { size: [30, 70],  opacity: [0.15, 0.22], blur: 6,   parallax: 0.30 },
    mid:  { size: [70, 120], opacity: [0.20, 0.30], blur: 2.5, parallax: 0.70 },
    near: { size: [130, 220], opacity: [0.28, 0.40], blur: 0,   parallax: 1.40 },
  },

  motion: {
    floatSeconds: [6, 14],
    delaySeconds: [0, 9],
  },

  drifters: 3,
  driftSeconds: [34, 52],

  scroll: { amplitude: 90, wavelength: 900, share: 0.5 },
}

/* --------------------------------------------------------------------------- */
/*  FOOD ASSETS — inline SVG. ids are namespaced per food so two different     */
/*  foods can never collide on a gradient url().                               */
/* --------------------------------------------------------------------------- */

const S = {
  width: '100%',
  height: '100%',
  viewBox: '0 0 64 64',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
}

const FOOD = {
  orange: (accent) => (
    <svg {...S}>
      <defs>
        <radialGradient id='ffb-orange' cx='36%' cy='30%' r='78%'>
          <stop offset='0' stopColor='#FFD9A0' />
          <stop offset='0.55' stopColor='#FF8A5B' />
          <stop offset='1' stopColor='#D2521F' />
        </radialGradient>
      </defs>
      <circle cx='32' cy='34' r='22' fill='url(#ffb-orange)' />
      <ellipse cx='24' cy='25' rx='7' ry='5' fill='#fff' opacity='0.30' />
      <path d='M32 12c0-3 2-5 5-5' stroke={accent} strokeWidth='2.5' strokeLinecap='round' opacity='0.85' />
      <path d='M32 13c4-4 10-3 11 1-4 3-9 2-11-1Z' fill='#00FF94' opacity='0.55' />
      <circle cx='32' cy='34' r='22' stroke={accent} strokeWidth='1.2' opacity='0.35' />
    </svg>
  ),

  strawberry: (accent) => (
    <svg {...S}>
      <defs>
        <radialGradient id='ffb-berry' cx='34%' cy='26%' r='80%'>
          <stop offset='0' stopColor='#FF9FB0' />
          <stop offset='0.6' stopColor='#FF4D6D' />
          <stop offset='1' stopColor='#A8123A' />
        </radialGradient>
      </defs>
      <path d='M32 58c-9 0-18-12-18-24 0-8 7-13 18-13s18 5 18 13c0 12-9 24-18 24Z' fill='url(#ffb-berry)' />
      <ellipse cx='24' cy='30' rx='5' ry='4' fill='#fff' opacity='0.28' />
      <path d='M20 20h24l-12 9-12-9Z' fill='#00FF94' opacity='0.5' />
      <circle cx='30' cy='38' r='1.6' fill='#FFC53D' opacity='0.9' />
      <circle cx='38' cy='44' r='1.6' fill='#FFC53D' opacity='0.9' />
      <circle cx='26' cy='48' r='1.6' fill='#FFC53D' opacity='0.9' />
      <path d='M32 58c-9 0-18-12-18-24 0-8 7-13 18-13s18 5 18 13c0 12-9 24-18 24Z' stroke={accent} strokeWidth='1.2' opacity='0.35' />
    </svg>
  ),

  lemon: (accent) => (
    <svg {...S}>
      <defs>
        <radialGradient id='ffb-lemon' cx='34%' cy='28%' r='80%'>
          <stop offset='0' stopColor='#FFF4C2' />
          <stop offset='0.6' stopColor='#FFC53D' />
          <stop offset='1' stopColor='#C98A05' />
        </radialGradient>
      </defs>
      <ellipse cx='32' cy='34' rx='24' ry='17' transform='rotate(-16 32 34)' fill='url(#ffb-lemon)' />
      <ellipse cx='24' cy='27' rx='7' ry='4' transform='rotate(-16 24 27)' fill='#fff' opacity='0.35' />
      <path d='M10 40c-3 1-4 3-2 5M54 26c3-1 4-3 2-5' stroke='#FFC53D' strokeWidth='2.5' strokeLinecap='round' />
      <ellipse cx='32' cy='34' rx='24' ry='17' transform='rotate(-16 32 34)' stroke={accent} strokeWidth='1.2' opacity='0.35' />
    </svg>
  ),

  grapes: (accent) => (
    <svg {...S}>
      <defs>
        <radialGradient id='ffb-grape' cx='34%' cy='28%' r='80%'>
          <stop offset='0' stopColor='#D8C7FF' />
          <stop offset='0.6' stopColor='#8B5CF6' />
          <stop offset='1' stopColor='#4C1D95' />
        </radialGradient>
      </defs>
      <path d='M32 16v-8' stroke='#00FF94' strokeWidth='2.5' strokeLinecap='round' opacity='0.8' />
      {[[24, 24], [40, 24], [32, 30], [20, 36], [44, 36], [26, 44], [38, 44], [32, 53]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r='7.2' fill='url(#ffb-grape)' stroke={accent} strokeWidth='0.9' opacity='0.95' />
      ))}
      <ellipse cx='30' cy='28' rx='2.4' ry='1.8' fill='#fff' opacity='0.4' />
    </svg>
  ),

  tomato: (accent) => (
    <svg {...S}>
      <defs>
        <radialGradient id='ffb-tomato' cx='34%' cy='28%' r='80%'>
          <stop offset='0' stopColor='#FFA8B6' />
          <stop offset='0.55' stopColor='#E2334F' />
          <stop offset='1' stopColor='#8E0C28' />
        </radialGradient>
      </defs>
      <circle cx='32' cy='36' r='21' fill='url(#ffb-tomato)' />
      <ellipse cx='24' cy='28' rx='6' ry='4' fill='#fff' opacity='0.26' />
      <path d='M32 15c-4-4-10-4-13 0 3 2 6 3 9 3M32 15c4-4 10-4 13 0-3 2-6 3-9 3' fill='#00FF94' opacity='0.5' />
      <path d='M32 12v7' stroke='#00FF94' strokeWidth='2.4' strokeLinecap='round' opacity='0.7' />
      <circle cx='32' cy='36' r='21' stroke={accent} strokeWidth='1.2' opacity='0.35' />
    </svg>
  ),

  pepper: (accent) => (
    <svg {...S}>
      <defs>
        <radialGradient id='ffb-pepper' cx='34%' cy='26%' r='82%'>
          <stop offset='0' stopColor='#FFC49B' />
          <stop offset='0.55' stopColor='#FF6B35' />
          <stop offset='1' stopColor='#B23A0C' />
        </radialGradient>
      </defs>
      <path d='M32 18c10 0 18 8 18 18s-8 16-18 16-18-6-18-16 8-18 18-18Z' fill='url(#ffb-pepper)' />
      <path d='M32 18c-9 0-16 6-17 15 6 4 13 6 17 6V18Z' fill='#fff' opacity='0.10' />
      <path d='M32 18v-6' stroke='#00FF94' strokeWidth='3' strokeLinecap='round' opacity='0.75' />
      <path d='M32 12c-3-3-8-3-10 1 3 2 7 2 10-1Z' fill='#00FF94' opacity='0.5' />
      <path d='M32 18c10 0 18 8 18 18s-8 16-18 16-18-6-18-16 8-18 18-18Z' stroke={accent} strokeWidth='1.2' opacity='0.35' />
    </svg>
  ),

  broccoli: (accent) => (
    <svg {...S}>
      <defs>
        <radialGradient id='ffb-broc' cx='34%' cy='26%' r='80%'>
          <stop offset='0' stopColor='#8CFFC4' />
          <stop offset='0.55' stopColor='#00C97A' />
          <stop offset='1' stopColor='#046B45' />
        </radialGradient>
      </defs>
      {[[22, 24, 12], [42, 24, 12], [32, 18, 13], [18, 36, 10], [46, 36, 10], [32, 34, 12]].map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill='url(#ffb-broc)' stroke={accent} strokeWidth='0.9' opacity='0.95' />
      ))}
      <path d='M26 44h12l-2 16h-8l-2-16Z' fill='#00A868' />
      <ellipse cx='27' cy='21' rx='4' ry='2.6' fill='#fff' opacity='0.35' />
    </svg>
  ),

  carrot: (accent) => (
    <svg {...S}>
      <defs>
        <radialGradient id='ffb-carrot' cx='30%' cy='24%' r='84%'>
          <stop offset='0' stopColor='#FFCFA3' />
          <stop offset='0.5' stopColor='#FF8A5B' />
          <stop offset='1' stopColor='#C2410C' />
        </radialGradient>
      </defs>
      <path d='M32 60c-6 0-10-4-9-9l7-30 9 30c1 5-1 9-7 9Z' fill='url(#ffb-carrot)' />
      <path d='M31 25l4 3M30 34l6 3M29 43l7 3' stroke='#fff' strokeWidth='1.2' opacity='0.28' strokeLinecap='round' />
      <path d='M32 21c-4-6-2-13 2-16 2 5 2 10-2 16ZM32 21c4-5 10-6 13-3-3 4-8 6-13 3ZM32 21c-4-4-10-4-13 0 3 3 9 3 13 0Z' fill='#00FF94' opacity='0.5' />
      <path d='M32 60c-6 0-10-4-9-9l7-30 9 30c1 5-1 9-7 9Z' stroke={accent} strokeWidth='1.2' opacity='0.35' />
    </svg>
  ),

  coffee: (accent) => (
    <svg {...S}>
      <defs>
        <radialGradient id='ffb-cup' cx='32%' cy='26%' r='82%'>
          <stop offset='0' stopColor='#EAFDFF' />
          <stop offset='0.6' stopColor='#9BE8FF' />
          <stop offset='1' stopColor='#2A7D9E' />
        </radialGradient>
      </defs>
      <path d='M16 26h32l-4 26c-0.4 3-3 5-6 5H26c-3 0-5.6-2-6-5l-4-26Z' fill='url(#ffb-cup)' />
      <path d='M46 30h4c4 0 6 3 5 7-1 5-5 7-9 6' stroke='#9BE8FF' strokeWidth='3' fill='none' opacity='0.8' />
      <path d='M18 33h28l-3 19c-0.3 2-2 3-4 3H25c-2 0-3.7-1-4-3l-3-19Z' fill='#6B3E1E' opacity='0.85' />
      <ellipse cx='32' cy='33' rx='14' ry='3' fill='#C98A5A' opacity='0.75' />
      <path d='M26 20c-3-3 2-5 0-8M35 20c-3-3 2-5 0-8' stroke={accent} strokeWidth='2.2' strokeLinecap='round' opacity='0.6' />
      <ellipse cx='24' cy='29' rx='3.4' ry='2.2' fill='#fff' opacity='0.5' />
    </svg>
  ),

  croissant: (accent) => (
    <svg {...S}>
      <defs>
        <radialGradient id='ffb-crois' cx='38%' cy='26%' r='82%'>
          <stop offset='0' stopColor='#FFE7B8' />
          <stop offset='0.55' stopColor='#FFB35C' />
          <stop offset='1' stopColor='#B26A18' />
        </radialGradient>
      </defs>
      <path d='M8 42c4-14 14-22 24-22s20 8 24 22c-6 4-14 6-24 6s-18-2-24-6Z' fill='url(#ffb-crois)' />
      <path d='M22 22c2 8 2 16-2 24M42 22c-2 8-2 16 2 24M32 20v28' stroke='#B26A18' strokeWidth='2' opacity='0.45' strokeLinecap='round' />
      <path d='M20 26c3 1 5 3 6 6' stroke='#fff' strokeWidth='2' opacity='0.3' strokeLinecap='round' />
      <path d='M8 42c4-14 14-22 24-22s20 8 24 22c-6 4-14 6-24 6s-18-2-24-6Z' stroke={accent} strokeWidth='1.2' opacity='0.35' />
    </svg>
  ),

  sushi: (accent) => (
    <svg {...S}>
      <defs>
        <radialGradient id='ffb-rice' cx='36%' cy='30%' r='78%'>
          <stop offset='0' stopColor='#FFFFFF' />
          <stop offset='1' stopColor='#C9D6E4' />
        </radialGradient>
      </defs>
      <circle cx='32' cy='32' r='23' fill='#1B2331' stroke='#2A3441' strokeWidth='2' />
      <circle cx='32' cy='32' r='17' fill='url(#ffb-rice)' />
      <circle cx='32' cy='32' r='8' fill='#FF8A5B' />
      <circle cx='32' cy='32' r='8' stroke={accent} strokeWidth='1.6' opacity='0.7' />
      <ellipse cx='27' cy='25' rx='4' ry='3' fill='#fff' opacity='0.55' />
      <circle cx='32' cy='32' r='23' stroke={accent} strokeWidth='1.2' opacity='0.3' />
    </svg>
  ),

  donut: (accent) => (
    <svg {...S}>
      <defs>
        <radialGradient id='ffb-dough' cx='34%' cy='28%' r='80%'>
          <stop offset='0' stopColor='#FFE0A8' />
          <stop offset='0.6' stopColor='#FFB35C' />
          <stop offset='1' stopColor='#B26A18' />
        </radialGradient>
      </defs>
      <circle cx='32' cy='33' r='23' fill='url(#ffb-dough)' />
      <path d='M32 12c12 0 21 8 22 18-3-3-7-4-11-2-2-4-7-5-11-3-3-2-8-1-11 2-3-2-7-1-10 3C12 20 20 12 32 12Z' fill='#8B5CF6' opacity='0.92' />
      <path d='M12 35c3-4 8-5 11-3 3-2 8-1 11 3 4-2 8-1 11 2 0 2-1 4-2 6-4 5-12 8-20 8s-16-3-20-8c-1-2-2-5-2-8 3-4 7-3 11 0Z' fill='#8B5CF6' opacity='0.92' />
      <circle cx='32' cy='33' r='8' fill='#0B0E14' />
      <rect x='21' y='24' width='6' height='2.4' rx='1.2' fill='#00E5FF' transform='rotate(-24 24 25)' />
      <rect x='38' y='27' width='6' height='2.4' rx='1.2' fill='#00FF94' transform='rotate(18 41 28)' />
      <rect x='28' y='40' width='6' height='2.4' rx='1.2' fill='#FFC53D' transform='rotate(-8 31 41)' />
      <circle cx='32' cy='33' r='23' stroke={accent} strokeWidth='1.2' opacity='0.35' />
    </svg>
  ),

  pizza: (accent) => (
    <svg {...S}>
      <defs>
        <radialGradient id='ffb-cheese' cx='40%' cy='26%' r='82%'>
          <stop offset='0' stopColor='#FFE9A8' />
          <stop offset='0.6' stopColor='#FFC53D' />
          <stop offset='1' stopColor='#C98A05' />
        </radialGradient>
      </defs>
      <path d='M32 12 58 52c-8 3-17 4-26 4s-18-1-26-4L32 12Z' fill='url(#ffb-cheese)' />
      <path d='M32 12 58 52c-2 1-5 2-8 2L32 12Z' fill='#fff' opacity='0.10' />
      <circle cx='30' cy='34' r='5' fill='#E2334F' />
      <circle cx='41' cy='45' r='4.4' fill='#E2334F' />
      <circle cx='24' cy='46' r='3.6' fill='#00FF94' opacity='0.65' />
      <path d='M32 12 58 52c-8 3-17 4-26 4s-18-1-26-4L32 12Z' stroke={accent} strokeWidth='1.2' opacity='0.35' />
    </svg>
  ),

  burger: (accent) => (
    <svg {...S}>
      <defs>
        <radialGradient id='ffb-bun' cx='36%' cy='24%' r='80%'>
          <stop offset='0' stopColor='#FFE0A8' />
          <stop offset='0.6' stopColor='#FFB35C' />
          <stop offset='1' stopColor='#A9611A' />
        </radialGradient>
      </defs>
      <path d='M8 30c0-12 11-20 24-20s24 8 24 20H8Z' fill='url(#ffb-bun)' />
      <circle cx='24' cy='20' r='1.6' fill='#fff' opacity='0.5' />
      <circle cx='34' cy='17' r='1.6' fill='#fff' opacity='0.5' />
      <circle cx='43' cy='22' r='1.6' fill='#fff' opacity='0.5' />
      <path d='M6 34c6-4 12-2 16 0 4-3 10-3 14 0 4-2 10-4 16 0 0 3-2 5-4 6H10c-2-1-4-3-4-6Z' fill='#00FF94' opacity='0.5' />
      <rect x='9' y='40' width='46' height='7' rx='3.5' fill='#3A2A22' />
      <path d='M10 49h44c1 4-2 7-6 7H16c-4 0-7-3-6-7Z' fill='url(#ffb-bun)' />
      <path d='M8 30c0-12 11-20 24-20s24 8 24 20H8Z' stroke={accent} strokeWidth='1.2' opacity='0.35' />
    </svg>
  ),
}

/* --------------------------------------------------------------------------- */
/*  PLACEMENT — hand-placed rather than randomised: a curated scatter reads as  */
/*  calm, and it is stable across reloads. Each object names its own timing so  */
/*  nothing ever syncs.                                                        */
/* --------------------------------------------------------------------------- */
const OBJECTS = [
  /* --- near: crisp, largest, most visible. Kept to the outer bands so the
         centre column of cards always sits on clean background. --- */
  { key: 'n1', food: 'orange',    tier: 'near', left: '88%', top: '20%', dur: 11, delay: 0.4, glow: '#FF6B35' },
  { key: 'n2', food: 'tomato',    tier: 'near', left: '3%',  top: '62%', dur: 13, delay: 2.1, glow: '#FF4D6D' },
  { key: 'n3', food: 'croissant', tier: 'near', left: '84%', top: '72%', dur: 12.2, delay: 5.6, glow: '#FFC53D' },
  { key: 'n4', food: 'donut',     tier: 'near', left: '12%', top: '10%', dur: 9.1, delay: 3.3, glow: '#8B5CF6', drift: true },

  /* --- mid --- */
  { key: 'm1', food: 'lemon',    tier: 'mid', left: '76%', top: '10%', dur: 8,   delay: 1.2, glow: '#FFC53D' },
  { key: 'm2', food: 'coffee',   tier: 'mid', left: '4%',  top: '32%', dur: 10,  delay: 4.4, glow: '#00E5FF' },
  { key: 'm3', food: 'broccoli', tier: 'mid',  left: '93%', top: '46%', dur: 12.5, delay: 6.2, glow: '#00FF94' },
  { key: 'm4', food: 'grapes',   tier: 'mid', left: '21%', top: '86%', dur: 7,   delay: 2.8, glow: '#8B5CF6', drift: true },
  { key: 'm5', food: 'sushi',    tier: 'mid',  left: '69%', top: '90%', dur: 13.4, delay: 0.9, glow: '#00E5FF' },
  { key: 'm6', food: 'pepper',   tier: 'mid',  left: '33%', top: '5%',  dur: 9.3, delay: 7.1, glow: '#FF6B35' },

  /* --- far: smallest, most blurred, faintest. Hidden first on mobile. --- */
  { key: 'f1', food: 'strawberry', tier: 'far', left: '61%', top: '17%', dur: 11.5, delay: 3.9, glow: '#FF4D6D' },
  { key: 'f2', food: 'carrot',     tier: 'far', left: '11%', top: '45%', dur: 8.4,  delay: 1.6, glow: '#FF8A5B' },
  { key: 'f3', food: 'pizza',      tier: 'far', left: '85%', top: '33%', dur: 14,   delay: 5.1, glow: '#FFC53D' },
  { key: 'f4', food: 'burger',     tier: 'far', left: '45%', top: '80%', dur: 10.4, delay: 8.2, glow: '#FF8A5B' },
  { key: 'f5', food: 'orange',     tier: 'far', left: '27%', top: '26%', dur: 7.3,  delay: 6.6, glow: '#FF6B35' },
  { key: 'f6', food: 'lemon',      tier: 'far', left: '73%', top: '60%', dur: 12.8, delay: 2.4, glow: '#FFC53D' },
  { key: 'f7', food: 'tomato',     tier: 'far', left: '6%',  top: '82%', dur: 9.7,  delay: 4.8, glow: '#FF4D6D', drift: true },
]

/* Deterministic derived values, so the numbers above stay the only knobs. */
const pick = ([lo, hi], t) => lo + (hi - lo) * t
const spread = (i, n) => (n <= 1 ? 0 : i / (n - 1))

const LAYOUT = (() => {
  const counts = { far: 0, mid: 0, near: 0 }
  const totals = { far: 0, mid: 0, near: 0 }
  OBJECTS.forEach(o => { totals[o.tier]++ })

  /* CONFIG.drifters is the authority: an object only drifts if it is flagged
     in OBJECTS *and* there is budget left, so setting drifters: 0 turns every
     horizontal crossing off without touching the table below. */
  let driftBudget = CONFIG.drifters

  return OBJECTS.map((o, i) => {
    const idx = counts[o.tier]++
    const t = spread(idx, totals[o.tier])
    const tier = CONFIG.tiers[o.tier]
    /* Within a tier, the first object is the closest: biggest, most opaque and
       deepest in the parallax, tapering to the smallest and faintest last. So
       a tier is sorted by distance internally instead of being flat. */
    const depth = 1 - t * 0.55
    return {
      ...o,
      size: Math.round(pick(tier.size, 1 - t)),
      opacity: +(pick(tier.opacity, depth) * (o.tier === 'near' ? 1 : 0.9)).toFixed(3),
      blur: tier.blur,
      parallax: +(tier.parallax * (0.8 + depth * 0.4)).toFixed(3),
      scroll: +(tier.parallax * CONFIG.scroll.share).toFixed(3),
      /* ~half the field is dropped on small screens, evenly across tiers. */
      hideOnMobile: i % 2 === 1,
      floatKey: `ffb-float-${'abcd'[i % 4]}`,
      drift: !!o.drift && driftBudget-- > 0,
      driftSec: pick(CONFIG.driftSeconds, spread(idx, Math.max(1, totals[o.tier]))),
    }
  })
})()

const FoodIcon = ({ food, accent }) => (FOOD[food] || FOOD.orange)(accent)

function FloatingFoodBackground() {
  /* One passive, rAF-batched listener publishing a bounded scroll offset for
     the layer-parallax `translate`. No animation loop: CSS does the moving,
     this only reports a number. The sine keeps the offset inside
     ±amplitude px however long the page is. */
  useEffect(() => {
    const { amplitude, wavelength, share } = CONFIG.scroll
    if (!share || !amplitude) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduce.matches) return

    let frame = 0
    const publish = () => {
      frame = 0
      const y = Math.sin(window.scrollY / wavelength) * amplitude
      document.documentElement.style.setProperty('--bg-scroll', `${y.toFixed(1)}px`)
    }
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(publish) }

    publish()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
      document.documentElement.style.removeProperty('--bg-scroll')
    }
  }, [])

  return (
    <div className='ffb-root' aria-hidden='true'>
      <div className='ffb-ambient' />

      {LAYOUT.map(o => (
        <div
          key={o.key}
          className='ffb-object'
          data-ffb-min={o.hideOnMobile ? 'hide' : undefined}
          style={{
            left: o.left,
            top: o.top,
            width: o.size,
            height: o.size,
            /* Opacity goes through a custom property so the light theme can
               scale the whole field down in one rule. */
            '--o': o.opacity,
            '--par': o.parallax,
            '--scroll-par': o.scroll,
          }}
        >
          {/* Drifters get their own wrapper so the slow horizontal crossing and
              the vertical bob stay independent animations. */}
          {o.drift ? (
            <div className='ffb-drift' style={{ animationDuration: `${o.driftSec}s`, animationDelay: `-${o.delay}s` }}>
              <div
                className={`ffb-float ${o.floatKey}`}
                style={{ animationDuration: `${o.dur}s`, animationDelay: `-${o.delay}s`, '--blur': `${o.blur}px`, '--glow': o.glow }}
              >
                <FoodIcon food={o.food} accent={o.glow} />
              </div>
            </div>
          ) : (
            <div
              className={`ffb-float ${o.floatKey}`}
              style={{ animationDuration: `${o.dur}s`, animationDelay: `-${o.delay}s`, '--blur': `${o.blur}px`, '--glow': o.glow }}
            >
              <FoodIcon food={o.food} accent={o.glow} />
            </div>
          )}
        </div>
      ))}

      {/* Last child on purpose: the vignette darkens the edges of everything
          above it, while the centre stays clear so the UI reads as the focus. */}
      <div className='ffb-vignette' />
    </div>
  )
}

export { CONFIG, FOOD }
export default FloatingFoodBackground

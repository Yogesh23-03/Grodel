import React from 'react'

/*
 * TiltCard — the universal 3D wrapper for the whole app.
 *
 * Drop it around anything that should read as a floating physical panel:
 * product cards, stat blocks, login forms, order rows, vendor cards.
 *
 *   <TiltCard glow="cyan" float delay={0.1} className="p-6">
 *     …content…
 *   </TiltCard>
 *
 * The tilt maths lives in GlobalTilt.jsx (one window listener) and the
 * transform lives in theme.css (`.tilt`), so this component adds no state
 * and no listeners of its own — a hundred of these cost the same as one.
 */

const GLOW_RING = {
  brand:  'var(--brand)',
  mint:   'var(--mint)',
  cyan:   'var(--cyan)',
  violet: 'var(--violet)',
  mango:  'var(--mango)',
  none:   'var(--glass-border-2)',
}

/*
 * parallax — on hover the inner image drifts and scales a touch more than
 * its container, which is what sells the card as a window with depth
 * behind it rather than a flat rectangle.
 */
function TiltCard({
  children,
  className = '',
  glow = 'cyan',
  float = false,
  delay = 0,
  as: Tag = 'div',
  style,
  ...rest
}) {
  const classes = [
    'tilt',
    'g-card',
    'noise',
    float ? 'float-card' : '',
    className,
  ].filter(Boolean).join(' ')

  /* createElement rather than JSX here: the tag is dynamic, and the project
     lints with no-unused-vars but without the react plugin's jsx-uses-vars,
     so `<Tag>` would be reported as an unused variable. */
  return React.createElement(
    Tag,
    {
      className: classes,
      style: {
        '--tilt-ring': GLOW_RING[glow] ?? GLOW_RING.cyan,
        '--float-delay': `${delay}s`,
        ...style,
      },
      ...rest,
    },
    /* The .tilt transform preserves 3d, so content can push forward.
       `depth` is opt-in per child via className="depth-1|2|3". */
    children
  )
}

/* Image wrapper that adds the hover parallax inside a tilted card. */
export function TiltImage({ src, alt = '', className = '', imgClassName = '', children }) {
  return (
    <div className={`group relative overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.09] group-hover:translate-x-1 group-hover:-translate-y-1 ${imgClassName}`}
      />
      {children}
    </div>
  )
}

export default TiltCard

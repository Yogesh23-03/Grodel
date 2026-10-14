import React from 'react'

/*
 * GlowSpinner — the inline loading indicator for the whole app.
 *
 * The brief retires stock spinners in favour of glowing, floating loaders
 * that belong to the dark theme. GlowSkeleton covers block-level loading
 * (a card or a list of rows); this covers the small inline case — inside a
 * submit button, beside a label — where a skeleton bar is the wrong shape.
 *
 * It inherits `currentColor` by default, so it automatically matches the
 * ink of whatever button it sits in; pass `color` only when a slot needs a
 * specific ink (e.g. white on a filled primary button).
 *
 *   <GlowSpinner size={20} />
 *   {loading ? <GlowSpinner size={16} /> : 'Save changes'}
 *
 * Replaces `react-spinners`' ClipLoader, which was the last stock loader in
 * the app.
 */
function GlowSpinner({ size = 16, color = 'currentColor', className = '', style }) {
  return (
    <span
      role='status'
      aria-label='Loading'
      className={`glow-spinner ${className}`}
      style={{
        width: size,
        height: size,
        '--glow-spin-ink': color,
        ...style,
      }}
    />
  )
}

export default GlowSpinner

import React from 'react'

/*
 * GlowingButton — the single button for the whole app.
 *
 * variants
 *   primary (default) — mango, pulsing glow. This is the checkout /
 *                       add-to-cart / main-action button; the pulse is what
 *                       draws the eye to the conversion path.
 *   success           — neon mint, for rescue / confirm-positive actions.
 *   info              — electric cyan, for secondary-but-important actions.
 *   ghost              — glass outline that turns cyan on hover.
 *   danger            — destructive actions.
 *
 * sizes: sm | md | lg
 *
 *   <GlowingButton pulse icon={<HiOutlineShoppingCart />} onClick={buy}>
 *     Add to basket
 *   </GlowingButton>
 */

const VARIANTS = {
  primary: {
    base: 'g-btn',
    style: { color: 'var(--accent-ink, #0B0E14)' },
  },
  success: {
    base: 'g-btn',
    style: { background: 'var(--mint)', color: '#04140D', boxShadow: 'var(--shadow-mint)' },
  },
  info: {
    base: 'g-btn',
    style: { background: 'var(--cyan)', color: '#04141A', boxShadow: 'var(--shadow-cyan)' },
  },
  danger: {
    base: 'g-btn',
    style: { background: 'var(--danger)', color: '#FFFFFF', boxShadow: '0 12px 34px rgba(255,77,109,0.32)' },
  },
  ghost: { base: 'g-btn-ghost', style: undefined },
}

const SIZES = {
  sm: { padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: 'var(--r-full)' },
  md: undefined,
  lg: { padding: '0.95rem 2.1rem', fontSize: '1rem' },
}

function GlowingButton({
  children,
  variant = 'primary',
  size = 'md',
  pulse = false,
  loading = false,
  fullWidth = false,
  icon = null,
  className = '',
  style,
  disabled,
  ...rest
}) {
  const v = VARIANTS[variant] ?? VARIANTS.primary

  return (
    <button
      className={[
        v.base,
        pulse && !disabled && variant !== 'ghost' ? 'glow-pulse' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={{
        ...(v.style || {}),
        ...(SIZES[size] || {}),
        ...(fullWidth ? { width: '100%' } : {}),
        ...style,
      }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        /* A glowing ring rather than a stock spinner, so loading states
           match the theme instead of importing a third-party default. */
        <span
          aria-hidden="true"
          className="inline-block animate-spin"
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.25)',
            borderTopColor: 'currentColor',
            boxShadow: '0 0 12px currentColor',
          }}
        />
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  )
}

export default GlowingButton

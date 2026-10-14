import React from 'react'

/*
 * GlowSkeleton — the loading state for the whole app.
 *
 * Bright stock spinners on a midnight background look like a bug. These are
 * dark glass tiles with a cyan→mint sweep drifting slowly upward, matching
 * the surface they will be replaced by.
 *
 *   {loading ? <GlowCardSkeleton /> : <FoodCard data={item} />}
 *   <GlowSkeleton width={180} height={14} />
 *   <GlowText lines={3} />
 */

export function GlowSkeleton({ width = '100%', height = 14, radius = 'var(--r-sm)', className = '', style }) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-glow ${className}`}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  )
}

/* Staggered text lines — the last one short, the way real copy breaks. */
export function GlowText({ lines = 3, className = '' }) {
  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <GlowSkeleton key={i} height={11} width={i === lines - 1 ? '62%' : '100%'} />
      ))}
    </div>
  )
}

/* A full card placeholder: image block, title, two lines, price row. */
export function GlowCardSkeleton({ className = '' }) {
  return (
    <div className={`tilt g-card noise overflow-hidden p-0 ${className}`}>
      <GlowSkeleton height={185} radius="0" />
      <div className="flex flex-col gap-3 p-4">
        <GlowSkeleton height={15} width="72%" />
        <GlowText lines={2} />
        <div className="mt-1 flex items-center justify-between">
          <GlowSkeleton height={22} width={64} />
          <GlowSkeleton height={42} width={42} radius="var(--r-full)" />
        </div>
      </div>
    </div>
  )
}

/* A stats row placeholder for the dashboards. */
export function GlowStatSkeleton({ count = 4, className = '' }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="tilt g-stat" style={{ '--float-delay': `${i * 0.2}s` }}>
          <GlowSkeleton height={30} width="58%" />
          <GlowSkeleton height={9} width="80%" />
        </div>
      ))}
    </div>
  )
}

export default GlowSkeleton

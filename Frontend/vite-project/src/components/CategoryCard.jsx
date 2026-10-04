import React from 'react'

/* J — Category as an arched market signboard: a doorway into a stall. */
function CategoryCard({ name, image, onClick }) {
  return (
    <button
      className='group relative h-[140px] w-[130px] shrink-0 overflow-hidden border shadow-lg transition-transform duration-300 hover:-translate-y-1 active:scale-95 md:h-[190px] md:w-[180px]'
      style={{ borderRadius: '50% 50% 18px 18px / 34% 34% 18px 18px', borderColor: 'var(--border-strong)', background: 'var(--surface-2)' }}
      onClick={onClick}
    >
      {image && <img src={image} alt='' className='h-full w-full object-cover transition-transform duration-700 group-hover:scale-110' />}
      <div className='absolute inset-0' style={{ background: 'linear-gradient(to top, rgba(8,12,9,0.88) 8%, rgba(8,12,9,0.12) 46%, transparent 70%)' }} />
      <div className='absolute bottom-0 left-0 w-full px-3 py-4 text-center font-display text-sm font-semibold tracking-tight text-white' style={{ fontFamily: 'var(--font-display)' }}>
        {name}
      </div>
    </button>
  )
}

export default CategoryCard

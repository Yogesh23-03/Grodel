import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import {
  HiOutlineArrowLeft, HiOutlineClock, HiOutlineFire, HiOutlineUserGroup,
  HiOutlineLightBulb, HiOutlineBeaker, HiOutlineXMark
} from 'react-icons/hi2'
import { serverUrl } from '../App'

/*
 * RecipeCard — full-screen slide-up reader for the "how do I cook this?"
 * flow. Recipes are cached in MongoDB for 30 days, so this only hits Groq
 * the first time an item is opened.
 */
function RecipeCard({ itemName, isOpen, onClose }) {
  const { t, i18n } = useTranslation()
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!isOpen || !itemName) return
    let active = true
    const load = async () => {
      setLoading(true)
      setFailed(false)
      try {
        const params = new URLSearchParams({ name: itemName, language: i18n.language || 'en' })
        const result = await axios.get(`${serverUrl}/api/recipe?${params.toString()}`)
        if (active) setRecipe(result.data?.recipe || null)
      } catch (error) {
        console.log(error)
        if (active) setFailed(true)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [isOpen, itemName, i18n.language])

  if (!isOpen) return null

  const difficultyKey = String(recipe?.difficulty || '').toLowerCase()
  const difficultyLabel = ['easy', 'medium', 'hard'].includes(difficultyKey)
    ? t(`recipe.${difficultyKey}`)
    : recipe?.difficulty

  /* Portalled to <body> so card-level transforms can never trap the overlay.
     Positioned with inline styles rather than the `.animate-page-fade` class
     it used to carry: that class (index.css) also sets `position: relative;
     z-index: 1`, which sits later in the sheet than Tailwind's `fixed` /
     `z-[9999]` utilities and so won the cascade — leaving the reader in
     normal document flow, i.e. shoved below the page instead of covering it.
     The inner card uses `animate-modal-in`, the same entrance the other
     dialogs use. */
  return createPortal(
    <div
      className='fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-4'
      style={{
        background: 'rgba(7,17,28,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)'
      }}
      onClick={onClose}
      role='dialog'
      aria-modal='true'
      aria-label={t('recipe.title')}
    >
      <div
        className='animate-modal-in grain relative max-h-[90vh] w-full max-w-[680px] overflow-y-auto rounded-3xl border'
        style={{
          background: 'var(--bg-2, #0d1b2a)',
          borderColor: 'rgba(255,255,255,0.1)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          color: 'var(--ink)'
        }}
        onClick={event => event.stopPropagation()}
      >
        {/* ---- sticky header ---- */}
        <header
          className='sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3 pr-14 backdrop-blur-2xl sm:px-6 sm:pr-16'
          style={{ borderColor: 'var(--border)', background: 'var(--glass-strong)' }}
        >
          <button onClick={onClose} className='btn-ghost !h-10 !w-10 !p-0' aria-label={t('common.back')}>
            <HiOutlineArrowLeft size={18} />
          </button>
          <div className='min-w-0 flex-1'>
            <p className='t-eyebrow'>{t('recipe.title')}</p>
            <h1 className='t-title mt-0.5 truncate notranslate'>
              {t('recipe.howToMake')} {recipe?.dishName || itemName}
            </h1>
          </div>
          {/* Absolute, per the requested design. It lives inside the sticky
              header (a positioned ancestor) so it stays pinned to the corner
              while the card scrolls, instead of scrolling out of reach.
              Inline styles so the pill button classes cannot win the cascade. */}
          <button
            onClick={onClose}
            className='btn-ghost !h-10 !w-10 !p-0'
            style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}
            aria-label={t('common.close')}
          >
            <HiOutlineXMark size={18} />
          </button>
        </header>

        <main className='w-full px-4 pb-10 pt-6 sm:px-6'>
        {loading && (
          <div className='flex flex-col items-center gap-3 py-24'>
            <div className='loading-dots'><span /><span /><span /></div>
            <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>{t('recipe.loading')}</p>
          </div>
        )}

        {!loading && failed && (
          <p className='py-24 text-center text-sm' style={{ color: 'var(--danger)' }}>{t('recipe.error')}</p>
        )}

        {!loading && !failed && recipe && (
          <>
            {/* ---- hero ---- */}
            <section className='grain card card-3d p-6'>
              <div className='flex flex-wrap items-center gap-2'>
                {difficultyLabel && <span className='badge badge-brand'>{difficultyLabel}</span>}
                {recipe.cuisineType && <span className='badge badge-muted'>{recipe.cuisineType}</span>}
                {recipe.mealType && <span className='badge badge-accent'>{recipe.mealType}</span>}
              </div>
              <p className='mt-3 text-[15px] leading-relaxed' style={{ color: 'var(--ink-soft)' }}>{recipe.description}</p>

              <div className='mt-5 grid grid-cols-3 gap-3'>
                {[
                  { Icon: HiOutlineClock, label: t('recipe.prepTime'), value: recipe.prepTime },
                  { Icon: HiOutlineFire, label: t('recipe.cookTime'), value: recipe.cookTime },
                  { Icon: HiOutlineUserGroup, label: t('recipe.servings'), value: recipe.servings }
                ].map(({ Icon, label, value }) => (
                  <div key={label} className='rounded-2xl px-3 py-3 text-center' style={{ background: 'var(--surface-2)' }}>
                    {React.createElement(Icon, { size: 18, className: 'mx-auto', style: { color: 'var(--accent-text)' } })}
                    <p className='mt-1 text-sm font-black'>{value || '—'}</p>
                    <p className='text-[10px] font-bold uppercase tracking-wide' style={{ color: 'var(--ink-muted)' }}>{label}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ---- ingredients ---- */}
            {recipe.ingredients?.length > 0 && (
              <section className='mt-8'>
                <h2 className='section-heading'>{t('recipe.ingredients')}</h2>
                <ul className='mt-4 space-y-2'>
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={`${ingredient}-${index}`} className='flex items-baseline gap-3 rounded-2xl px-4 py-2.5 stagger-item'
                      style={{ background: 'var(--surface-1)' }}>
                      <span className='h-1.5 w-1.5 shrink-0 rounded-full' style={{ background: 'var(--accent)' }} />
                      <span className='flex-1 font-semibold notranslate'>{ingredient.name}</span>
                      <span className='text-sm font-bold' style={{ color: 'var(--ink-muted)' }}>
                        {[ingredient.quantity, ingredient.unit].filter(Boolean).join(' ')}
                        {ingredient.optional && ` (${t('recipe.optional')})`}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ---- steps ---- */}
            {recipe.steps?.length > 0 && (
              <section className='mt-8'>
                <h2 className='section-heading'>{t('recipe.steps')}</h2>
                <ol className='mt-4 space-y-4'>
                  {recipe.steps.map((step, index) => (
                    <li key={index} className='grain card card-3d flex gap-4 p-5 stagger-item' style={{ animationDelay: `${index * 80}ms` }}>
                      <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black'
                        style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
                        {step.stepNumber || index + 1}
                      </span>
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center justify-between gap-2'>
                          <h3 className='font-bold notranslate'>{step.title}</h3>
                          {step.duration && (
                            <span className='badge badge-muted'>{step.duration}</span>
                          )}
                        </div>
                        <p className='mt-1.5 text-sm leading-relaxed' style={{ color: 'var(--ink-soft)' }}>{step.instruction}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* ---- tips ---- */}
            {recipe.tips?.length > 0 && (
              <section className='mt-8'>
                <h2 className='section-heading flex items-center gap-2'>
                  <HiOutlineLightBulb style={{ color: 'var(--warning)' }} /> {t('recipe.tips')}
                </h2>
                <ul className='mt-4 space-y-2'>
                  {recipe.tips.map((tip, index) => (
                    <li key={index} className='flex items-start gap-2 rounded-2xl px-4 py-3 text-sm stagger-item'
                      style={{ background: 'var(--warning-soft)', color: 'var(--ink-soft)' }}>
                      <HiOutlineLightBulb className='mt-0.5 shrink-0' style={{ color: 'var(--warning)' }} size={16} />
                      {tip}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ---- variations ---- */}
            {recipe.variations?.length > 0 && (
              <section className='mt-8'>
                <h2 className='section-heading flex items-center gap-2'>
                  <HiOutlineBeaker style={{ color: 'var(--plan)' }} /> {t('recipe.variations')}
                </h2>
                <ul className='mt-4 flex flex-wrap gap-2'>
                  {recipe.variations.map((variation, index) => (
                    <li key={index} className='badge px-3 py-2 text-xs stagger-item' style={{ background: 'var(--plan-soft)', color: 'var(--plan)' }}>
                      {variation}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {recipe.servingSuggestion && (
              <p className='mt-8 rounded-2xl px-4 py-3 text-sm font-semibold text-center'
                style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                🍽️ {recipe.servingSuggestion}
              </p>
            )}
          </>
        )}
      </main>
      </div>
    </div>,
    document.body
  )
}

export default RecipeCard

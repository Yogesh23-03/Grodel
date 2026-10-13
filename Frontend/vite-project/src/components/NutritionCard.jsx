import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { HiOutlineXMark, HiOutlineCheckCircle, HiOutlineSparkles, HiOutlineExclamationTriangle } from 'react-icons/hi2'
import { serverUrl } from '../App'

/*
 * NutritionCard — opens from any food or produce card.
 * Everything is fetched once per item per week from /api/nutrition, which
 * caches the Groq answer in MongoDB (NutritionCache).
 */

/* Reference daily values, used only to size the macro rings. */
const RING_TARGETS = { calories: 2000, protein: 50, carbohydrates: 275, fat: 78 }

const MacroRing = ({ value, label, color, target }) => {
  const ratio = target ? Math.min(1, (Number(value) || 0) / target) : 0
  const circumference = 2 * Math.PI * 26
  return (
    <div className='flex flex-col items-center gap-1.5'>
      <div className='relative h-16 w-16'>
        <svg viewBox='0 0 64 64' className='h-full w-full -rotate-90'>
          <circle cx='32' cy='32' r='26' fill='none' stroke='var(--surface-3)' strokeWidth='6' />
          <circle
            cx='32' cy='32' r='26' fill='none' stroke={color} strokeWidth='6'
            strokeLinecap='round'
            strokeDasharray={`${ratio * circumference} ${circumference}`}
          />
        </svg>
        <span className='absolute inset-0 flex items-center justify-center text-sm font-black' style={{ color: 'var(--ink)' }}>
          {Number(value) || 0}
        </span>
      </div>
      <span className='text-[10px] font-bold uppercase tracking-wide text-center' style={{ color: 'var(--ink-muted)' }}>
        {label}
      </span>
    </div>
  )
}

function NutritionCard({ itemName, isOpen, onClose }) {
  const { t, i18n } = useTranslation()
  const [nutrition, setNutrition] = useState(null)
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
        const result = await axios.get(`${serverUrl}/api/nutrition?${params.toString()}`)
        if (active) setNutrition(result.data?.nutrition || null)
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

  const dietType = nutrition?.dietType || 'veg'
  const dietBadge = dietType === 'non-veg'
    ? { icon: '🍗', label: t('nutrition.nonveg'), color: 'var(--danger)' }
    : dietType === 'vegan'
      ? { icon: '🌿', label: t('nutrition.vegan'), color: 'var(--rescue)' }
      : { icon: '🌱', label: t('nutrition.veg'), color: 'var(--rescue)' }

  const list = (value) => (Array.isArray(value) ? value.filter(Boolean) : [])

  /* Portalled to <body>: food cards live inside hover/animation transforms,
     which would otherwise become the containing block for `position: fixed`. */
  return createPortal(
    <div
      className='fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center'
      onClick={onClose}
      role='dialog'
      aria-modal='true'
      aria-label={t('nutrition.title')}
    >
      <div
        className='grain animate-modal-in max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl border p-6 shadow-2xl sm:rounded-3xl'
        style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--ink)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ---- header ---- */}
        <div className='flex items-start justify-between gap-3'>
          <div>
            <p className='t-eyebrow'>{t('nutrition.title')}</p>
            <h2 className='t-title mt-1 notranslate'>{itemName}</h2>
            <div className='mt-2 flex flex-wrap items-center gap-2'>
              <span className='badge' style={{ background: 'var(--surface-3)', color: dietBadge.color }}>
                {dietBadge.icon} {dietBadge.label}
              </span>
              {nutrition?.servingSize && (
                <span className='text-xs font-semibold' style={{ color: 'var(--ink-muted)' }}>
                  {t('nutrition.serving')}: {nutrition.servingSize}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className='btn-ghost !h-9 !w-9 !p-0' aria-label={t('common.close')}>
            <HiOutlineXMark size={18} />
          </button>
        </div>

        {loading && (
          <div className='flex flex-col items-center gap-3 py-12'>
            <div className='loading-dots'><span /><span /><span /></div>
            <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>{t('nutrition.loading')}</p>
          </div>
        )}

        {!loading && failed && (
          <p className='py-12 text-center text-sm' style={{ color: 'var(--danger)' }}>
            {t('nutrition.error')}
          </p>
        )}

        {!loading && !failed && nutrition && (
          <>
            {/* ---- macro rings ---- */}
            <div className='mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4'>
              <MacroRing value={nutrition.calories} label={t('nutrition.calories')} color='var(--accent-text)' target={RING_TARGETS.calories} />
              <MacroRing value={nutrition.protein} label={t('nutrition.protein')} color='var(--accent-2)' target={RING_TARGETS.protein} />
              <MacroRing value={nutrition.carbohydrates} label={t('nutrition.carbs')} color='var(--warning)' target={RING_TARGETS.carbohydrates} />
              <MacroRing value={nutrition.fat} label={t('nutrition.fat')} color='var(--danger)' target={RING_TARGETS.fat} />
            </div>

            {/* ---- secondary numbers ---- */}
            <div className='mt-5 grid grid-cols-3 gap-2 sm:gap-3'>
              {[
                { label: t('nutrition.fiber'), value: nutrition.fiber, unit: 'g' },
                { label: t('nutrition.sugar'), value: nutrition.sugar, unit: 'g' },
                { label: t('nutrition.sodium'), value: nutrition.sodium, unit: 'mg' }
              ].map(row => (
                <div key={row.label} className='rounded-2xl px-3 py-2 text-center' style={{ background: 'var(--surface-2)' }}>
                  <p className='text-base font-black'>{Number(row.value) || 0}<span className='text-[10px] font-bold'>{row.unit}</span></p>
                  <p className='text-[10px] font-bold uppercase tracking-wide' style={{ color: 'var(--ink-muted)' }}>{row.label}</p>
                </div>
              ))}
            </div>

            {/* ---- vitamins & minerals ---- */}
            {(list(nutrition.vitamins).length > 0 || list(nutrition.minerals).length > 0) && (
              <div className='mt-6'>
                {list(nutrition.vitamins).length > 0 && (
                  <>
                    <h3 className='t-eyebrow'>{t('nutrition.vitamins')}</h3>
                    <div className='mt-2 flex flex-wrap gap-1.5'>
                      {list(nutrition.vitamins).map(vitamin => (
                        <span key={vitamin} className='badge' style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>{vitamin}</span>
                      ))}
                    </div>
                  </>
                )}
                {list(nutrition.minerals).length > 0 && (
                  <>
                    <h3 className='t-eyebrow mt-4'>{t('nutrition.minerals')}</h3>
                    <div className='mt-2 flex flex-wrap gap-1.5'>
                      {list(nutrition.minerals).map(mineral => (
                        <span key={mineral} className='badge' style={{ background: 'var(--accent-2-soft)', color: 'var(--accent-2)' }}>{mineral}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ---- benefits ---- */}
            {list(nutrition.healthBenefits).length > 0 && (
              <div className='mt-6'>
                <h3 className='t-eyebrow flex items-center gap-1.5'>{t('nutrition.benefits')} <HiOutlineSparkles /></h3>
                <ul className='mt-2 space-y-1.5'>
                  {list(nutrition.healthBenefits).map(benefit => (
                    <li key={benefit} className='flex items-start gap-2 text-sm' style={{ color: 'var(--ink-soft)' }}>
                      <HiOutlineCheckCircle className='mt-0.5 shrink-0' style={{ color: 'var(--rescue)' }} size={16} />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ---- suitability ---- */}
            {(list(nutrition.suitableFor).length > 0 || list(nutrition.notSuitableFor).length > 0) && (
              <div className='mt-6 grid grid-cols-2 gap-3'>
                {list(nutrition.suitableFor).length > 0 && (
                  <div className='rounded-2xl p-3' style={{ background: 'var(--success-soft)' }}>
                    <p className='text-[11px] font-black uppercase tracking-wide' style={{ color: 'var(--success)' }}>{t('nutrition.suitableFor')}</p>
                    <p className='mt-1 text-xs' style={{ color: 'var(--ink-soft)' }}>{list(nutrition.suitableFor).join(', ')}</p>
                  </div>
                )}
                {list(nutrition.notSuitableFor).length > 0 && (
                  <div className='rounded-2xl p-3' style={{ background: 'var(--danger-soft)' }}>
                    <p className='text-[11px] font-black uppercase tracking-wide' style={{ color: 'var(--danger)' }}>{t('nutrition.notSuitable')}</p>
                    <p className='mt-1 text-xs' style={{ color: 'var(--ink-soft)' }}>{list(nutrition.notSuitableFor).join(', ')}</p>
                  </div>
                )}
              </div>
            )}

            {/* ---- allergens ---- */}
            {list(nutrition.allergens).length > 0 && (
              <div className='mt-4 flex items-start gap-2 rounded-2xl p-3' style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                <HiOutlineExclamationTriangle className='mt-0.5 shrink-0' size={16} />
                <p className='text-xs font-semibold'>
                  {t('nutrition.allergens')}: {list(nutrition.allergens).join(', ')}
                </p>
              </div>
            )}
          </>
        )}

        <button onClick={onClose} className='btn-primary mt-6 w-full'>{t('common.close')}</button>
      </div>
    </div>,
    document.body
  )
}

export default NutritionCard

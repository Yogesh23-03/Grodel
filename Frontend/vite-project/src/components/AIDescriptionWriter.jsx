import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { ClipLoader } from 'react-spinners'
import { HiOutlineSparkles, HiOutlinePhoto, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineArrowPath } from 'react-icons/hi2'
import { serverUrl } from '../App'

/*
 * AIDescriptionWriter — owners describe a dish in three fields and (optionally)
 * one photo, and the backend turns it into publishable menu copy.
 *
 * The result is deliberately editable: the owner is the last word on their own
 * menu, so nothing is saved until they press "Use this description".
 */

const CUISINES = ['southIndian', 'northIndian', 'chinese', 'continental', 'streetFood', 'desserts', 'beverages', 'other']
const SPICE_LEVELS = ['Mild', 'Medium', 'Spicy', 'Very Spicy']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function AIDescriptionWriter({ onDescriptionGenerated, dishName = '' }) {
  const { t } = useTranslation()
  const fileInput = useRef(null)

  const [name, setName] = useState(dishName)
  const [cuisine, setCuisine] = useState(CUISINES[0])
  const [isVeg, setIsVeg] = useState('veg')
  const [spiceLevel, setSpiceLevel] = useState(SPICE_LEVELS[1])
  const [ingredients, setIngredients] = useState('')
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [description, setDescription] = useState('')

  /* The parent owns the dish name field; keep them in step while the owner types. */
  useEffect(() => { setName(dishName) }, [dishName])

  /* Object URLs must be revoked or every preview leaks for the page's lifetime. */
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const acceptFile = file => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError(t('menu.ai.imageTypeError', 'Only image files can be uploaded'))
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(t('menu.ai.imageSizeError', 'Image must be 5MB or smaller'))
      return
    }
    setError('')
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  const generate = async event => {
    event?.preventDefault()
    if (!name.trim() || loading) return

    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('dishName', name.trim())
      formData.append('cuisine', t(`menu.ai.cuisines.${cuisine}`))
      formData.append('isVeg', isVeg)
      formData.append('spiceLevel', spiceLevel)
      formData.append('keyIngredients', ingredients)
      if (image) formData.append('image', image)

      const response = await axios.post(`${serverUrl}/api/item/ai-description`, formData, { withCredentials: true })
      setResult(response.data)
      setDescription(response.data?.description || '')
    } catch (caught) {
      setError(caught?.response?.data?.message || t('menu.ai.error', 'Could not generate a description. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const useDescription = () => {
    if (!description.trim()) return
    onDescriptionGenerated?.({ ...result, description: description.trim() })
  }

  return (
    <section className='grain card card-3d mt-5 p-5 sm:p-6' aria-labelledby='ai-description-heading'>
      <div className='flex items-center gap-2'>
        <HiOutlineSparkles size={20} style={{ color: 'var(--accent-2)' }} />
        <h3 id='ai-description-heading' className='t-title !text-lg'>{t('menu.ai.title', 'AI description writer')}</h3>
      </div>
      <p className='mt-1 text-sm' style={{ color: 'var(--ink-soft)' }}>
        {t('menu.ai.subtitle', 'Describe the dish in a few words — the AI writes the menu copy for you.')}
      </p>

      {/* Deliberately a div, not a form: this component is mounted inside the
          Add-item form, and a form inside a form is invalid HTML — the browser
          submitted it natively, reloading the page instead of generating copy. */}
      <div className='mt-5 space-y-4'>
        <label className='block'>
          <span className='t-eyebrow mb-1.5 block'>{t('menu.ai.dishName', 'Dish name')}</span>
          <input type='text' className='w-full px-3 py-2' value={name}
            placeholder={t('menu.ai.dishNamePlaceholder', 'e.g. Paneer Butter Masala')}
            onChange={event => setName(event.target.value)} />
        </label>

        <div className='grid gap-4 sm:grid-cols-2'>
          <label className='block'>
            <span className='t-eyebrow mb-1.5 block'>{t('menu.ai.cuisine', 'Cuisine')}</span>
            <select className='w-full px-3 py-2' value={cuisine} onChange={event => setCuisine(event.target.value)}>
              {CUISINES.map(key => (
                <option key={key} value={key}>{t(`menu.ai.cuisines.${key}`)}</option>
              ))}
            </select>
          </label>

          <div>
            <span className='t-eyebrow mb-1.5 block'>{t('menu.ai.foodType', 'Food type')}</span>
            <div className='grid grid-cols-2 gap-2'>
              {['veg', 'non veg'].map(option => (
                <button
                  key={option}
                  type='button'
                  onClick={() => setIsVeg(option)}
                  className='rounded-2xl px-3 py-2 text-sm font-bold transition-all'
                  style={isVeg === option
                    ? { background: option === 'veg' ? 'var(--rescue-soft)' : 'var(--danger-soft)', color: option === 'veg' ? 'var(--rescue)' : 'var(--danger)', border: `1px solid ${option === 'veg' ? 'var(--rescue)' : 'var(--danger)'}` }
                    : { background: 'var(--surface-2)', color: 'var(--ink-muted)', border: '1px solid var(--border-strong)' }}
                >
                  {t(`category.${option === 'veg' ? 'veg' : 'nonVeg'}`, option === 'veg' ? 'Veg' : 'Non-veg')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <span className='t-eyebrow mb-1.5 block'>{t('menu.ai.spiceLevel', 'Spice level')}</span>
          <div className='flex flex-wrap gap-2'>
            {SPICE_LEVELS.map(level => (
              <button
                key={level}
                type='button'
                onClick={() => setSpiceLevel(level)}
                className='rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95'
                style={spiceLevel === level
                  ? { background: 'var(--accent-2)', color: 'var(--accent-ink)', borderColor: 'var(--accent-2)' }
                  : { background: 'var(--surface-2)', color: 'var(--ink-muted)', borderColor: 'var(--border-strong)' }}
              >
                {t(`menu.ai.spice.${level.replace(/\s+/g, '').toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>

        <label className='block'>
          <span className='t-eyebrow mb-1.5 block'>{t('menu.ai.ingredients', 'Key ingredients')}</span>
          <input type='text' className='w-full px-3 py-2' value={ingredients}
            placeholder={t('menu.ai.ingredientsPlaceholder', 'comma separated, e.g. paneer, cream, tomato')}
            onChange={event => setIngredients(event.target.value)} />
        </label>

        {/* ---- optional photo: click or drop ---- */}
        <div>
          <span className='t-eyebrow mb-1.5 block'>{t('menu.ai.photo', 'Photo')} <span style={{ color: 'var(--ink-faint)' }}>({t('menu.ai.optional', 'optional')})</span></span>
          <div
            role='button'
            tabIndex={0}
            onClick={() => fileInput.current?.click()}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') fileInput.current?.click() }}
            onDragOver={event => event.preventDefault()}
            onDrop={event => { event.preventDefault(); acceptFile(event.dataTransfer?.files?.[0]) }}
            className='flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-center transition-colors'
            style={{ borderColor: 'var(--border-strong)', background: 'var(--surface-2)' }}
          >
            {preview ? (
              <img src={preview} alt='' className='h-36 w-full max-w-xs rounded-xl object-cover' />
            ) : (
              <>
                <HiOutlinePhoto size={24} style={{ color: 'var(--ink-muted)' }} />
                <p className='text-xs' style={{ color: 'var(--ink-muted)' }}>
                  {t('menu.ai.photoHint', 'Drop a photo here, or tap to choose one')}
                </p>
              </>
            )}
          </div>
          <input ref={fileInput} type='file' accept='image/*' className='hidden'
            onChange={event => acceptFile(event.target.files?.[0])} />
          {image && (
            <button type='button' onClick={() => { setImage(null); setPreview('') }}
              className='link-brand mt-2 text-xs'>
              {t('menu.ai.removePhoto', 'Remove photo')}
            </button>
          )}
        </div>

        {error && (
          <p className='flex items-center gap-1.5 text-sm' style={{ color: 'var(--danger)' }}>
            <HiOutlineXCircle /> {error}
          </p>
        )}        <button type='button' className='btn-primary w-full' onClick={generate} disabled={loading || !name.trim()}>
          {loading
            ? <><ClipLoader size={16} color='currentColor' /> <span className='ml-2'>{t('menu.ai.generating', 'Generating…')}</span></>
            : <><HiOutlineSparkles /> <span className='ml-2'>{t('menu.ai.generate', 'Generate description')}</span></>
          }
        </button>
      </div>

      {result && (
        <div className='animate-rise-in mt-6 rounded-2xl p-4 sm:p-5' style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <p className='t-eyebrow'>{t('menu.ai.result', 'Generated copy')}</p>

          <label className='mt-3 block'>
            <span className='mb-1.5 block text-xs' style={{ color: 'var(--ink-muted)' }}>
              {t('menu.ai.editHint', 'Edit it before you publish — it is your menu, not ours.')}
            </span>
            <textarea rows={4} className='w-full px-3 py-2' value={description}
              onChange={event => setDescription(event.target.value)} />
          </label>

          {result.shortTag && (
            <div className='mt-3 flex flex-wrap items-center gap-2'>
              <span className='badge badge-brand'>{result.shortTag}</span>
              {result.spiceLevel && <span className='badge badge-warning'>{result.spiceLevel}</span>}
            </div>
          )}

          {result.highlights?.length > 0 && (
            <ul className='mt-4 space-y-1.5'>
              {result.highlights.map(highlight => (
                <li key={highlight} className='flex items-start gap-2 text-sm' style={{ color: 'var(--ink-soft)' }}>
                  <HiOutlineCheckCircle className='mt-0.5 shrink-0' style={{ color: 'var(--success)' }} />
                  {highlight}
                </li>
              ))}
            </ul>
          )}

          {result.bestPairedWith && (
            <p className='mt-4 text-sm' style={{ color: 'var(--ink-soft)' }}>
              <span className='font-bold' style={{ color: 'var(--ink)' }}>{t('menu.ai.bestPairedWith', 'Best paired with')}: </span>
              {result.bestPairedWith}
            </p>
          )}

          <div className='mt-5 flex flex-wrap gap-2'>
            <button type='button' className='btn-primary' onClick={useDescription} disabled={!description.trim()}>
              <HiOutlineCheckCircle /> <span className='ml-2'>{t('menu.ai.use', 'Use this description')}</span>
            </button>
            <button type='button' className='btn-ghost' onClick={generate} disabled={loading}>
              <HiOutlineArrowPath /> <span className='ml-2'>{t('menu.ai.regenerate', 'Regenerate')}</span>
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default AIDescriptionWriter

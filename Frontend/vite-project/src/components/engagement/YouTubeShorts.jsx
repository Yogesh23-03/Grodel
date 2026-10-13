import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HiOutlinePlayCircle, HiOutlineMagnifyingGlass, HiOutlineArrowTopRightOnSquare } from 'react-icons/hi2'

/*
 * YouTubeShorts — the in-app shorts carousel never worked: YouTube's keyless
 * `listType=search` embed only resolves for the surfaces it whitelists, so the
 * frame sat empty. Instead of an empty box, the panel sends the hungry person
 * to YouTube itself — with their own typed search, or one of the default
 * searches below when they would rather just tap.
 */

const DEFAULT_SEARCHES = [
  { emoji: '🍛', query: 'South Indian meals recipe shorts' },
  { emoji: '🍔', query: 'Indian street food shorts' },
  { emoji: '🍮', query: '5 minute Indian dessert recipe' },
  { emoji: '🥗', query: 'healthy Indian lunch recipe shorts' },
  { emoji: '☕', query: 'filter coffee and snacks shorts' }
]

const openYouTubeSearch = (query) => {
  const trimmed = String(query || '').trim()
  if (!trimmed) return
  window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`, '_blank', 'noopener')
}

function YouTubeShorts() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const submit = (event) => {
    event.preventDefault()
    openYouTubeSearch(query)
  }

  return (
    <div className='grain card card-3d overflow-hidden'>
      <div className='flex items-center justify-between gap-3 p-5 pb-3'>
        <div>
          <h3 className='t-title notranslate flex items-center gap-2'>
            <HiOutlinePlayCircle style={{ color: 'var(--danger)' }} /> {t('games.youtube.title')}
          </h3>
          <p className='mt-1 text-sm' style={{ color: 'var(--ink-soft)' }}>{t('games.youtube.desc')}</p>
        </div>
      </div>

      <div className='px-5 pb-5'>
        <form onSubmit={submit} className='flex flex-wrap items-center gap-2'>
          <input
            type='text'
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('games.youtube.searchPlaceholder', { defaultValue: 'Type a dish or a craving…' })}
            aria-label={t('games.youtube.searchPlaceholder', { defaultValue: 'Type a dish or a craving…' })}
            className='glass-input min-w-[180px] flex-1'
          />
          <button type='submit' className='btn-glow shrink-0 text-sm' disabled={!query.trim()}>
            <HiOutlineMagnifyingGlass /> {t('games.youtube.searchOnYouTube', { defaultValue: 'Watch on YouTube' })}
          </button>
        </form>

        <p className='mt-3 text-xs' style={{ color: 'var(--ink-muted)' }}>
          {t('games.youtube.opensOnYouTube', { defaultValue: 'Videos open on YouTube in a new tab — nothing to install.' })}
        </p>

        <div className='mt-3 flex flex-wrap gap-2'>
          {DEFAULT_SEARCHES.map((item) => (
            <button
              key={item.query}
              type='button'
              onClick={() => openYouTubeSearch(item.query)}
              className='flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95'
              style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)', border: '1px solid var(--border)' }}
            >
              <span aria-hidden='true'>{item.emoji}</span>
              {item.query.replace(/ shorts$/, '')}
              <HiOutlineArrowTopRightOnSquare size={13} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default YouTubeShorts

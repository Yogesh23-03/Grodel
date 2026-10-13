import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HiOutlineTrophy } from 'react-icons/hi2'
import { engagementApi, readError } from './engagementApi'

/*
 * Leaderboard — top ten players by coins, streak or trivia wins.
 * Public by design: no wallet details beyond the tally are exposed.
 */
const TABS = ['coins', 'streak', 'trivia']
const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

function Leaderboard() {
  const { t } = useTranslation()

  const [activeTab, setActiveTab] = useState('coins')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const result = await engagementApi.leaderboard(activeTab)
        if (active) setRows(Array.isArray(result.data) ? result.data : [])
      } catch (caught) {
        if (active) setError(readError(caught))
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [activeTab])

  const scoreOf = row => (activeTab === 'coins' ? row.coins : activeTab === 'trivia' ? row.triviaScore : row.streak)

  return (
    <div className='grain card card-3d p-5'>
      <h3 className='t-title notranslate flex items-center gap-2'>
        <HiOutlineTrophy style={{ color: 'var(--warning)' }} /> {t('games.leaderboard.title')}
      </h3>

      <div className='mt-4 flex gap-2'>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className='flex-1 rounded-2xl border px-3 py-2 text-xs font-bold transition-all active:scale-95'
            style={activeTab === tab
              ? { background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'var(--accent)' }
              : { background: 'var(--surface-2)', color: 'var(--ink-muted)', borderColor: 'var(--border)' }}
          >
            {t(`games.leaderboard.${tab}`)}
          </button>
        ))}
      </div>

      <p className='t-eyebrow mt-5'>{t('games.leaderboard.topPlayers')}</p>

      {loading && (
        <div className='flex flex-col items-center gap-3 py-10'>
          <div className='loading-dots'><span /><span /><span /></div>
          <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>{t('games.loading')}</p>
        </div>
      )}

      {!loading && error && (
        <p className='py-8 text-center text-sm' style={{ color: 'var(--danger)' }}>{t('games.error')}</p>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className='py-8 text-center text-sm' style={{ color: 'var(--ink-muted)' }}>{t('games.noData')}</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <ol className='mt-2 space-y-1.5'>
          {rows.map((row, index) => (
            <li key={`${row.fullName}-${index}`}
              className='flex items-center gap-3 rounded-2xl px-3.5 py-2.5'
              style={{ background: index === 0 ? 'var(--accent-soft)' : 'var(--surface-2)' }}>
              <span className='w-6 shrink-0 text-center text-sm font-black tabular-nums' style={{ color: 'var(--ink-muted)' }}>
                {MEDALS[index + 1] || index + 1}
              </span>
              <span className='notranslate min-w-0 flex-1 truncate text-sm font-bold' style={{ color: 'var(--ink)' }}>
                {row.fullName}
              </span>
              {row.badge && (
                <span className='badge badge-muted hidden sm:inline-flex'>{row.badge.name}</span>
              )}
              <span className='shrink-0 text-sm font-black tabular-nums' style={{ color: 'var(--accent)' }}>
                {scoreOf(row)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default Leaderboard

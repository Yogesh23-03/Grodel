import React from 'react'
import { useTranslation } from 'react-i18next'
import { HiOutlineSparkles, HiFire, HiOutlineTrophy, HiOutlineBanknotes } from 'react-icons/hi2'

/*
 * CoinsBar — the wallet header for the wait screen.
 * The bar fills toward the next 100-coin reward, which is the same unit the
 * redeem endpoint pays out at (100 coins = ₹10).
 */
const Reward = 100

function CoinsBar({ coins = 0, streak = {}, badges = [] }) {
  const { t } = useTranslation()

  const towardNext = coins % Reward
  const progress = Math.min(100, Math.max(0, towardNext))

  const stats = [
    { key: 'coins', Icon: HiOutlineBanknotes, value: coins, label: t('games.yourCoins'), color: 'var(--accent)' },
    { key: 'streak', Icon: HiFire, value: streak?.current || 0, label: t('games.streak'), color: 'var(--vendor)' },
    { key: 'badges', Icon: HiOutlineTrophy, value: badges.length, label: t('games.badges'), color: 'var(--plan)' }
  ]

  return (
    <div className='grain card card-3d overflow-hidden p-5'>
      <div className='grid grid-cols-3 gap-3'>
        {stats.map(({ key, Icon, value, label, color }) => (
          <div key={key} className='flex flex-col items-center gap-1 text-center'>
            <span className='flex h-10 w-10 items-center justify-center rounded-full'
              style={{ background: 'var(--surface-2)', color }}>
              {React.createElement(Icon, { size: 20 })}
            </span>
            <span className='text-xl font-black tabular-nums' style={{ color: 'var(--ink)' }}>{value}</span>
            <span className='text-[10px] font-bold uppercase tracking-wide' style={{ color: 'var(--ink-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      <div className='mt-5'>
        <div className='h-2 w-full overflow-hidden rounded-full' style={{ background: 'var(--surface-3)' }}>
          <div
            className='h-2 rounded-full transition-all duration-500'
            style={{ width: `${progress}%`, background: 'var(--accent)' }}
          />
        </div>
        <p className='mt-2 flex items-center gap-1.5 text-xs' style={{ color: 'var(--ink-muted)' }}>
          <HiOutlineSparkles style={{ color: 'var(--accent)' }} />
          {t('games.coinsInfo')}
        </p>
      </div>

      {badges.length > 0 && (
        <div className='mt-4 flex flex-wrap gap-1.5'>
          {badges.map(badge => (
            <span key={badge.id || badge.name} className='badge badge-brand' title={badge.description}>
              <HiOutlineTrophy size={12} /> {badge.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default CoinsBar

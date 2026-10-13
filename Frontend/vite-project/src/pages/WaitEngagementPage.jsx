import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { engagementApi, readError } from '../components/engagement/engagementApi.js'
import CoinsBar from '../components/engagement/CoinsBar.jsx'

/*
 * WaitEngagementPage — the tabbed "while you wait" hub on the tracking page.
 *
 * Every game is React.lazy()'d so opening an order never pulls nine game
 * bundles; only the tab the customer actually taps is fetched.
 */
const FoodTrivia = lazy(() => import('../components/engagement/FoodTrivia.jsx'))
const FoodWordPuzzle = lazy(() => import('../components/engagement/FoodWordPuzzle.jsx'))
const SpinWheel = lazy(() => import('../components/engagement/SpinWheel.jsx'))
const GuessDish = lazy(() => import('../components/engagement/GuessDish.jsx'))
const RecipeChallenge = lazy(() => import('../components/engagement/RecipeChallenge.jsx'))
const FoodFact = lazy(() => import('../components/engagement/FoodFact.jsx'))
const TrendingNow = lazy(() => import('../components/engagement/TrendingNow.jsx'))
const YouTubeShorts = lazy(() => import('../components/engagement/YouTubeShorts.jsx'))
const Leaderboard = lazy(() => import('../components/engagement/Leaderboard.jsx'))

const TABS = [
  { key: 'coins', emoji: '🎁' },
  { key: 'trivia', emoji: '❓' },
  { key: 'word', emoji: '🔤' },
  { key: 'spin', emoji: '🎡' },
  { key: 'guess', emoji: '🍽️' },
  { key: 'recipe', emoji: '👨‍🍳' },
  { key: 'facts', emoji: '💡' },
  { key: 'trending', emoji: '🔥' },
  { key: 'shorts', emoji: '📺' },
  { key: 'board', emoji: '🏆' }
]

function TabFallback() {
  const { t } = useTranslation()
  return (
    <div className='grain card card-3d flex flex-col items-center gap-3 p-5 py-14'>
      <div className='loading-dots'><span /><span /><span /></div>
      <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>{t('games.loading')}</p>
    </div>
  )
}

function WaitEngagementPage({ orderId, dishName, restaurantName, city }) {
  const { t } = useTranslation()
  const { userData } = useSelector(state => state.user)

  const [activeTab, setActiveTab] = useState('coins')
  const [wallet, setWallet] = useState(null)

  const loadWallet = useCallback(async () => {
    if (!userData) return
    try {
      const result = await engagementApi.getWallet()
      setWallet(result.data)
    } catch (caught) {
      console.log('wallet load failed:', readError(caught))
    }
  }, [userData])

  /* One fetch covers mount, every tab change, sign-in, and every payout a game
     reports through onEarn (which is loadWallet itself). */
  useEffect(() => { loadWallet() }, [activeTab, loadWallet])

  const tabLabel = key => t(`games.tabs.${key}`)

  const renderTab = () => {
    switch (activeTab) {
      /* The wallet bar is already pinned above the tabs, so the Coins tab adds
         the leaderboard rather than repeating the same card twice on screen. */
      case 'coins': return <Leaderboard />
      case 'trivia': return <FoodTrivia orderId={orderId} onEarn={loadWallet} />
      case 'word': return <FoodWordPuzzle orderId={orderId} onEarn={loadWallet} />
      case 'spin': return <SpinWheel orderId={orderId} onEarn={loadWallet} />
      case 'guess': return <GuessDish orderId={orderId} onEarn={loadWallet} />
      case 'recipe': return <RecipeChallenge orderId={orderId} onEarn={loadWallet} />
      case 'facts': return <FoodFact dishName={dishName} restaurantName={restaurantName} />
      case 'trending': return <TrendingNow city={city} />
      case 'shorts': return <YouTubeShorts />
      case 'board': return <Leaderboard />
      default: return null
    }
  }

  return (
    <section className='mt-8' aria-label={t('games.earnCoins')}>
      <div className='text-center'>
        <p className='t-eyebrow'>{t('games.whileYouWait')}</p>
        <h2 className='t-title mt-1'>{t('games.earnCoins')}</h2>
      </div>

      {userData && (
        <div className='mt-4'>
          <CoinsBar coins={wallet?.coins || 0} streak={wallet?.streak} badges={wallet?.badges || []} />
        </div>
      )}

      {/* ---- tab strip: horizontal scroll, never wraps ---- */}
      <div className='mt-4 -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0'>
        <div className='flex w-max gap-2'>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={activeTab === tab.key}
              className='flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-all active:scale-95'
              style={activeTab === tab.key
                ? { background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'var(--accent)' }
                : { background: 'var(--surface-2)', color: 'var(--ink-muted)', borderColor: 'var(--border)' }}
            >
              <span aria-hidden='true'>{tab.emoji}</span>
              {tabLabel(tab.key)}
            </button>
          ))}
        </div>
      </div>

      {/* ---- active tab only ---- */}
      <div className='mt-4'>
        <Suspense fallback={<TabFallback />}>
          {renderTab()}
        </Suspense>
      </div>
    </section>
  )
}

export default WaitEngagementPage

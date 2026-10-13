import React, { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { ClipLoader } from 'react-spinners'
import {
  HiOutlineSparkles, HiOutlineArrowLeft, HiOutlineArrowPath, HiOutlineCheckCircle,
  HiOutlineExclamationTriangle, HiOutlineExclamationCircle, HiOutlineLightBulb,
  HiOutlineMegaphone, HiOutlineStar, HiOutlineBolt, HiOutlineTruck,
  HiOutlineShoppingBag, HiOutlineCurrencyRupee, HiOutlineInboxStack
} from 'react-icons/hi2'
import { serverUrl } from '../App'
import MarketNav from '../components/MarketNav.jsx'
import useScrollReveal from '../hooks/useScrollReveal.js'

/*
 * BusinessAnalysisPage — one page, three roles.
 *
 * The backend returns the SAME analysis shape for every role, so this page has a
 * single renderer; only the stat tiles and the "boost this item" action differ.
 *
 * Refresh is throttled to once an hour in localStorage because each refresh is a
 * paid model call and the underlying 30-day window barely moves in an hour.
 */

const REFRESH_COOLDOWN_MS = 60 * 60 * 1000

const ROLE_ENDPOINT = {
  owner: '/api/analysis/owner',
  vendor: '/api/analysis/vendor',
  deliveryBoy: '/api/analysis/delivery'
}

const impactStyle = impact => {
  switch (impact) {
    case 'High': return { background: 'var(--danger-soft)', color: 'var(--danger)' }
    case 'Low': return { background: 'var(--surface-2)', color: 'var(--ink-muted)' }
    default: return { background: 'var(--warning-soft)', color: 'var(--warning)' }
  }
}

const effortStyle = effort => {
  switch (effort) {
    case 'Easy': return { background: 'var(--success-soft)', color: 'var(--success)' }
    case 'Hard': return { background: 'var(--danger-soft)', color: 'var(--danger)' }
    default: return { background: 'var(--warning-soft)', color: 'var(--warning)' }
  }
}

const scoreColor = score => {
  if (score > 75) return 'var(--success)'
  if (score > 50) return 'var(--warning)'
  return 'var(--danger)'
}

/* SVG donut for the health score. */
const ScoreRing = ({ score }) => {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const filled = Math.max(0, Math.min(100, score)) / 100 * circumference
  const color = scoreColor(score)

  return (
    <svg viewBox='0 0 140 140' className='h-32 w-32 -rotate-90' role='img' aria-label={`${score}/100`}>
      <circle cx='70' cy='70' r={radius} fill='none' stroke='var(--border-strong)' strokeWidth='12' />
      <circle
        cx='70' cy='70' r={radius} fill='none' stroke={color} strokeWidth='12' strokeLinecap='round'
        strokeDasharray={`${filled} ${circumference}`}
        style={{ transition: 'stroke-dasharray 900ms var(--ease-out)' }}
      />
    </svg>
  )
}

function BusinessAnalysisPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userData } = useSelector(state => state.user)
  const role = userData?.role
  const endpoint = ROLE_ENDPOINT[role]

  const storageKey = role ? `grodel_analysis_last_${role}` : ''
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(Boolean(endpoint))
  const [error, setError] = useState('')
  const [boostMessage, setBoostMessage] = useState('')
  const [boosting, setBoosting] = useState(false)
  const [now, setNow] = useState(Date.now())

  /* Section reveals: the report unfolds as the reader scrolls it. */
  const statsRef = useScrollReveal()
  const insightRef = useScrollReveal({ delay: '80ms' })
  const featureRef = useScrollReveal({ delay: '160ms' })

  const lastFetched = storageKey ? Number(localStorage.getItem(storageKey)) || 0 : 0
  const remainingMs = Math.max(0, lastFetched + REFRESH_COOLDOWN_MS - now)

  const load = useCallback(async ({ force = false } = {}) => {
    if (!endpoint) return
    setLoading(true)
    setError('')
    try {
      const result = await axios.get(`${serverUrl}${endpoint}`, { withCredentials: true })
      setData(result.data)
      if (force) localStorage.setItem(storageKey, String(Date.now()))
    } catch (caught) {
      setError(caught?.response?.data?.message || t('analysis.error', 'Could not build your analysis right now'))
    } finally {
      setLoading(false)
    }
  }, [endpoint, storageKey, t])

  useEffect(() => { load() }, [load])

  /* Drive the cooldown countdown while it is still running. */
  useEffect(() => {
    if (remainingMs <= 0) return
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [remainingMs])

  const raw = data?.rawData
  const analysis = data?.analysis

  const stats = useMemo(() => {
    if (!raw) return []
    if (role === 'owner') {
      return [
        { key: 'orders', value: raw.totalOrders, label: t('analysis.stats.orders', 'Orders'), Icon: HiOutlineShoppingBag },
        { key: 'revenue', value: `₹${raw.totalRevenue}`, label: t('analysis.stats.revenue', 'Revenue'), Icon: HiOutlineCurrencyRupee },
        { key: 'avg', value: `₹${raw.avgOrderValue}`, label: t('analysis.stats.avgOrder', 'Avg order'), Icon: HiOutlineBolt },
        { key: 'rating', value: raw.avgRating ? `${raw.avgRating}/5` : '—', label: t('analysis.stats.rating', 'Rating'), Icon: HiOutlineStar }
      ]
    }
    if (role === 'vendor') {
      return [
        { key: 'orders', value: raw.totalOrders, label: t('analysis.stats.orders', 'Orders'), Icon: HiOutlineShoppingBag },
        { key: 'revenue', value: `₹${raw.totalRevenue}`, label: t('analysis.stats.revenue', 'Revenue'), Icon: HiOutlineCurrencyRupee },
        { key: 'listings', value: raw.listingCount, label: t('analysis.stats.listings', 'Listings'), Icon: HiOutlineInboxStack },
        { key: 'rating', value: raw.avgRating ? `${raw.avgRating}/5` : '—', label: t('analysis.stats.rating', 'Rating'), Icon: HiOutlineStar }
      ]
    }
    return [
      { key: 'done', value: raw.completedDeliveries, label: t('analysis.stats.deliveries', 'Deliveries'), Icon: HiOutlineTruck },
      { key: 'assigned', value: raw.assignedJobs, label: t('analysis.stats.assigned', 'Jobs assigned'), Icon: HiOutlineInboxStack },
      { key: 'avg', value: raw.avgDeliveryMinutes ? `${raw.avgDeliveryMinutes}m` : '—', label: t('analysis.stats.avgTime', 'Avg time'), Icon: HiOutlineBolt },
      { key: 'rate', value: `${raw.completionRate}%`, label: t('analysis.stats.completion', 'Completion'), Icon: HiOutlineCheckCircle }
    ]
  }, [raw, role, t])

  /* "Boost this item" turns the AI's suggestion into a real 10% discount. */
  const boostItem = async () => {
    if (!analysis?.itemToFeature) return
    setBoosting(true)
    setBoostMessage('')
    try {
      const shopResult = await axios.get(`${serverUrl}/api/shop/getmy`, { withCredentials: true })
      const target = (shopResult.data?.items || []).find(
        item => item.name?.toLowerCase().trim() === analysis.itemToFeature.toLowerCase().trim()
      )
      if (!target) {
        setBoostMessage(t('analysis.boostNotFound', 'That dish is not on your current menu.'))
        return
      }
      await axios.patch(`${serverUrl}/api/item/${target._id}/discount`, { discountPercent: 10 }, { withCredentials: true })
      setBoostMessage(t('analysis.boosted', { name: target.name, defaultValue: `10% off applied to ${target.name}.` }))
    } catch (caught) {
      setBoostMessage(caught?.response?.data?.message || t('analysis.boostFailed', 'Could not boost that item'))
    } finally {
      setBoosting(false)
    }
  }

  if (!endpoint) {
    return (
      <div className='min-h-screen lg:pl-[76px]'>
        <MarketNav />
        <main className='mx-auto w-full max-w-lg px-4 pb-20 pt-6 sm:px-6'>
          <div className='grain card card-3d p-5 sm:p-8 lg:p-10 text-center'>
            <span className='text-4xl' aria-hidden='true'>📊</span>
            <h1 className='t-title mt-4'>{t('analysis.unavailableTitle', 'Analysis is for businesses')}</h1>
            <p className='mt-2 text-sm' style={{ color: 'var(--ink-soft)' }}>
              {t('analysis.unavailable', 'This page is available to restaurant owners, farmers and delivery partners.')}
            </p>
            <button className='btn-primary mt-6' onClick={() => navigate('/')}>{t('common.back', 'Back')}</button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />
      <main className='mx-auto w-full max-w-[1000px] px-4 pb-20 pt-6 sm:px-6'>
        <header className='flex items-center gap-3'>
          <button onClick={() => navigate('/')} className='btn-ghost !h-10 !w-10 !p-0' aria-label={t('common.back', 'Back')}>
            <HiOutlineArrowLeft size={18} />
          </button>
          <div>
            <p className='t-eyebrow' style={{ color: 'var(--accent-2)' }}>{t('analysis.eyebrow', 'Business intelligence')}</p>
            <h1 className='t-title mt-0.5'>{t('analysis.title', 'Your business analysis')}</h1>
          </div>
        </header>

        {loading && (
          <div className='grain card card-3d mt-6 flex flex-col items-center gap-3 p-12'>
            <div className='loading-dots'><span /><span /><span /></div>
            <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>
              {t('analysis.loading', 'Reading the last 30 days…')}
            </p>
          </div>
        )}

        {!loading && error && (
          <div className='grain card card-3d mt-6 p-8 text-center'>
            <HiOutlineExclamationCircle size={26} style={{ color: 'var(--danger)' }} className='mx-auto' />
            <p className='mt-3 text-sm' style={{ color: 'var(--danger)' }}>{error}</p>
            <button className='btn-ghost mt-4' onClick={() => load()}>{t('analysis.retry', 'Try again')}</button>
          </div>
        )}

        {!loading && !error && analysis && (
          <>
            {/* ---------- hero: score + summary ---------- */}
            <section className='grain card card-3d mt-6 flex flex-col items-center gap-6 p-6 sm:flex-row sm:p-8'>
              <div className='relative shrink-0'>
                <ScoreRing score={analysis.healthScore} />
                <div className='absolute inset-0 flex flex-col items-center justify-center'>
                  <span className='font-display text-3xl font-black' style={{ fontFamily: 'var(--font-display)', color: scoreColor(analysis.healthScore) }}>
                    {analysis.healthScore}
                  </span>
                  <span className='t-eyebrow'>{t('analysis.outOf', '/ 100')}</span>
                </div>
              </div>

              <div className='min-w-0 text-center sm:text-left'>
                <span className='badge badge-brand'>{analysis.overallHealth}</span>
                <p className='mt-3 text-sm leading-relaxed' style={{ color: 'var(--ink-soft)' }}>{analysis.summary}</p>
                <p className='mt-2 text-xs' style={{ color: 'var(--ink-faint)' }}>
                  {t('analysis.window', { days: raw?.windowDays ?? 30, defaultValue: 'Based on the last {{days}} days' })}
                  {raw?.businessName ? ` · ${raw.businessName}` : ''}
                </p>
              </div>
            </section>

            {/* ---------- stat tiles ---------- */}
            <div ref={statsRef} className='stagger mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4'>
              {stats.map(stat => (
                <div key={stat.key} className='grain card card-3d p-5'>
                  <stat.Icon size={18} style={{ color: 'var(--accent-2)' }} />
                  <p className='mt-2 font-display text-2xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>{stat.value}</p>
                  <p className='t-eyebrow mt-0.5'>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* ---------- strengths / weaknesses ---------- */}
            <div className='mt-4 grid gap-4 sm:grid-cols-2'>
              <section className='grain card card-3d p-5'>
                <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--success)' }}>
                  <HiOutlineCheckCircle /> {t('analysis.strengths', 'What is working')}
                </p>
                <ul className='mt-3 space-y-2'>
                  {analysis.strengths.map(entry => (
                    <li key={entry} className='flex items-start gap-2 text-sm' style={{ color: 'var(--ink-soft)' }}>
                      <HiOutlineCheckCircle className='mt-0.5 shrink-0' style={{ color: 'var(--success)' }} /> {entry}
                    </li>
                  ))}
                  {analysis.strengths.length === 0 && (
                    <li className='text-sm' style={{ color: 'var(--ink-muted)' }}>{t('analysis.none', 'Nothing flagged yet.')}</li>
                  )}
                </ul>
              </section>

              <section className='grain card card-3d p-5'>
                <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--warning)' }}>
                  <HiOutlineExclamationTriangle /> {t('analysis.weaknesses', 'What needs work')}
                </p>
                <ul className='mt-3 space-y-2'>
                  {analysis.weaknesses.map(entry => (
                    <li key={entry} className='flex items-start gap-2 text-sm' style={{ color: 'var(--ink-soft)' }}>
                      <HiOutlineExclamationTriangle className='mt-0.5 shrink-0' style={{ color: 'var(--warning)' }} /> {entry}
                    </li>
                  ))}
                  {analysis.weaknesses.length === 0 && (
                    <li className='text-sm' style={{ color: 'var(--ink-muted)' }}>{t('analysis.none', 'Nothing flagged yet.')}</li>
                  )}
                </ul>
              </section>
            </div>

            {/* ---------- warnings ---------- */}
            {analysis.warningFlags.length > 0 && (
              <section className='mt-4 rounded-2xl p-5' style={{ background: 'var(--danger-soft)' }}>
                <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--danger)' }}>
                  <HiOutlineExclamationCircle /> {t('analysis.warnings', 'Watch out for')}
                </p>
                <ul className='mt-3 space-y-2'>
                  {analysis.warningFlags.map(flag => (
                    <li key={flag} className='text-sm font-bold' style={{ color: 'var(--danger)' }}>• {flag}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* ---------- insight boxes ---------- */}
            <div ref={insightRef} className='mt-4 grid gap-4 sm:grid-cols-2'>
              {analysis.revenueInsight && (
                <section className='grain card card-3d p-5'>
                  <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--accent-2)' }}>
                    <HiOutlineLightBulb /> {t('analysis.revenueInsight', 'Revenue insight')}
                  </p>
                  <p className='mt-2 text-sm' style={{ color: 'var(--ink-soft)' }}>{analysis.revenueInsight}</p>
                </section>
              )}

              {analysis.bestTimeToPromote && (
                <section className='grain card card-3d p-5'>
                  <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--plan)' }}>
                    <HiOutlineMegaphone /> {t('analysis.bestTime', 'Best time to promote')}
                  </p>
                  <p className='mt-2 text-sm' style={{ color: 'var(--ink-soft)' }}>{analysis.bestTimeToPromote}</p>
                </section>
              )}
            </div>

            {analysis.itemToFeature && (
              <section ref={featureRef} className='grain card card-3d mt-4 p-5'>
                <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--accent-text)' }}>
                  <HiOutlineSparkles /> {t('analysis.itemToFeature', 'Item to feature')}
                </p>
                <div className='mt-3 flex flex-wrap items-center justify-between gap-3'>
                  <span className='font-display text-lg font-black' style={{ fontFamily: 'var(--font-display)' }}>
                    {analysis.itemToFeature}
                  </span>
                  {role === 'owner' && (
                    <button type='button' className='btn-primary' onClick={boostItem} disabled={boosting}>
                      {boosting
                        ? <ClipLoader size={14} color='currentColor' />
                        : <HiOutlineBolt />}
                      <span className='ml-2'>{t('analysis.boost', 'Boost with 10% off')}</span>
                    </button>
                  )}
                </div>
                {boostMessage && (
                  <p className='mt-2 text-xs font-bold' style={{ color: 'var(--ink-soft)' }}>{boostMessage}</p>
                )}
              </section>
            )}

            {/* ---------- recommendations ---------- */}
            {analysis.recommendations.length > 0 && (
              <section className='mt-6'>
                <h2 className='t-title !text-lg'>{t('analysis.recommendations', 'What to do next')}</h2>
                <div className='stagger mt-4 space-y-3'>
                  {analysis.recommendations.map(entry => (
                    <article key={entry.title || entry.description} className='grain card card-3d p-5'>
                      <div className='flex flex-wrap items-start justify-between gap-2'>
                        <h3 className='font-display text-base font-bold' style={{ fontFamily: 'var(--font-display)' }}>{entry.title}</h3>
                        <div className='flex gap-2'>
                          <span className='badge' style={impactStyle(entry.impact)}>
                            {t('analysis.impact', 'Impact')}: {entry.impact}
                          </span>
                          <span className='badge' style={effortStyle(entry.effort)}>
                            {t('analysis.effort', 'Effort')}: {entry.effort}
                          </span>
                        </div>
                      </div>
                      <p className='mt-2 text-sm' style={{ color: 'var(--ink-soft)' }}>{entry.description}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* ---------- refresh (throttled) ---------- */}
            <div className='mt-6 text-center'>
              <button
                type='button'
                className='btn-ghost'
                disabled={remainingMs > 0 || loading}
                onClick={() => load({ force: true })}
              >
                <HiOutlineArrowPath /> <span className='ml-2'>{t('analysis.refresh', 'Refresh analysis')}</span>
              </button>
              <p className='mt-2 text-xs' style={{ color: 'var(--ink-faint)' }}>
                {remainingMs > 0
                  ? t('analysis.cooldown', { minutes: Math.ceil(remainingMs / 60000), defaultValue: 'Next refresh in {{minutes}} min' })
                  : t('analysis.refreshHint', 'Refresh at most once an hour.')}
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default BusinessAnalysisPage

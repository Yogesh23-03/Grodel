import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { IoIosArrowRoundBack } from 'react-icons/io'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { serverUrl } from '../App'
import MarketNav from '../components/MarketNav.jsx'

const TONE_FOR_STATUS = {
  pending: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  accepted: { bg: 'var(--accent-2-soft)', color: 'var(--accent-2)' },
  picked_up: { bg: 'var(--plan-soft)', color: 'var(--plan)' },
  delivered: { bg: 'var(--rescue-soft)', color: 'var(--rescue)' },
  cancelled: { bg: 'var(--danger-soft)', color: 'var(--danger)' }
}

function MyDonationsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDonations = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/donations/my`, { withCredentials: true })
      setDonations(result.data || [])
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load donations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDonations() }, [])

  const cancelDonation = async (id) => {
    const ok = window.confirm('Cancel this pending donation?')
    if (!ok) return
    try {
      const result = await axios.patch(`${serverUrl}/api/donations/${id}/cancel`, {}, { withCredentials: true })
      setDonations(prev => prev.map(item => item._id === id ? result.data.donation : item))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel donation')
    }
  }

  const totalUnits = donations.reduce((sum, d) => {
    const items = Array.isArray(d.foodItems) ? d.foodItems : []
    return sum + items.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0)
  }, 0)
  const deliveredCount = donations.filter(d => d.status === 'delivered').length
  const ringFill = Math.min(1, deliveredCount / Math.max(1, donations.length)) * 213.6

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />

      <main className='mx-auto max-w-[900px] px-4 pb-16 pt-8 sm:px-6'>
        <button onClick={() => navigate('/')} className='link-brand mb-6 inline-flex items-center gap-2 text-sm'>
          <IoIosArrowRoundBack size={22} /> Back
        </button>

        <header className='flex flex-wrap items-center justify-between gap-6'>
          <div>
            <p className='t-eyebrow' style={{ color: 'var(--rescue)' }}>{t('rescue.eyebrow', { defaultValue: 'Rescue' })}</p>
            <h1 className='t-display mt-2'>{t('rescue.myDonationsTitle', { defaultValue: 'Your rescue record' })}</h1>
            <p className='mt-2 text-sm' style={{ color: 'var(--ink-soft)' }}>
              {t('rescue.myDonationsCopy', { defaultValue: 'Every entry here is food that fed someone instead of filling a bin.' })}
            </p>
          </div>

          {/* impact ring */}
          <div className='flex items-center gap-4'>
            <div className='relative h-24 w-24' role='img'
              aria-label={`${deliveredCount} of ${donations.length} donations delivered`}>
              <svg viewBox='0 0 80 80' className='h-full w-full -rotate-90'>
                <circle cx='40' cy='40' r='34' fill='none' stroke='var(--surface-3)' strokeWidth='8' />
                <circle cx='40' cy='40' r='34' fill='none' stroke='var(--rescue)' strokeWidth='8' strokeLinecap='round'
                  strokeDasharray={`${ringFill} 213.6`} />
              </svg>
              <span className='absolute inset-0 flex items-center justify-center font-display text-xl font-semibold'
                style={{ fontFamily: 'var(--font-display)', color: 'var(--rescue)' }}>
                {Math.round((deliveredCount / Math.max(1, donations.length)) * 100)}%
              </span>
            </div>
            <div className='text-sm'>
              <p className='font-black' style={{ color: 'var(--rescue)' }}>
                {Math.round(totalUnits)} {t('rescue.units', { defaultValue: 'units rescued' })}
              </p>
              <p style={{ color: 'var(--ink-muted)' }}>
                {deliveredCount}/{donations.length} {t('rescue.deliveredRuns', { defaultValue: 'runs delivered' })}
              </p>
            </div>
          </div>
        </header>

        {loading && <div className='skeleton mt-8 h-32 w-full' style={{ borderRadius: 'var(--radius-lg)' }} />}
        {error && (
          <div className='card mt-8 p-6 text-center' style={{ color: 'var(--danger)' }}>{error}</div>
        )}

        {!loading && donations.length === 0 && (
          <div className='grain card mt-8 p-12 text-center'>
            <span className='text-4xl' aria-hidden='true'>🌾</span>
            <p className='mt-3' style={{ color: 'var(--ink-muted)' }}>{t('rescue.empty', { defaultValue: 'No rescues yet — the first one starts with you.' })}</p>
            <button onClick={() => navigate('/donate-food')} className='btn-primary mt-5' style={{ background: 'var(--rescue)', color: '#08130c', boxShadow: 'none' }}>
              {t('rescue.submit', { defaultValue: 'Rescue this food' })}
            </button>
          </div>
        )}

        <div className='stagger mt-8 space-y-4'>
          {donations.map((donation) => {
            const tone = TONE_FOR_STATUS[donation.status] || TONE_FOR_STATUS.pending
            return (
              <article key={donation._id} className='grain card p-5'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap gap-2'>
                      {donation.foodItems.map((item, index) => (
                        <span className='rounded-full px-3 py-1 text-xs font-bold'
                          style={{ background: 'var(--rescue-soft)', color: 'var(--rescue)' }}
                          key={`${donation._id}-${index}`}>
                          {item.name} — {item.quantity} {item.unit}
                        </span>
                      ))}
                    </div>
                    <p className='mt-2 text-sm' style={{ color: 'var(--ink-soft)' }}>{donation.foodDescription || 'No description'}</p>
                    <p className='mt-2 text-sm' style={{ color: 'var(--ink-muted)' }}>
                      <span className='font-semibold' style={{ color: 'var(--ink-soft)' }}>Pickup:</span> {donation.pickupAddress}
                    </p>
                    <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>
                      <span className='font-semibold' style={{ color: 'var(--ink-soft)' }}>Trust:</span> {donation.assignedTrustId?.name || 'Not assigned'}
                    </p>
                  </div>
                  <div className='flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end'>
                    <span className='rounded-full px-3 py-1.5 text-xs font-black capitalize' style={{ background: tone.bg, color: tone.color }}>
                      {donation.status.replace('_', ' ')}
                    </span>
                    {donation.status === 'pending' && (
                      <button className='text-xs font-bold' style={{ color: 'var(--danger)' }} onClick={() => cancelDonation(donation._id)}>
                        {t('common.cancel')}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}

export default MyDonationsPage

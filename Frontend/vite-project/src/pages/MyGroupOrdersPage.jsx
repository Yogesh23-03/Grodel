import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { serverUrl } from '../App'
import MarketNav from '../components/MarketNav.jsx'
import { HiOutlineUserGroup, HiOutlineArrowPath } from 'react-icons/hi2'

const TONE_FOR_STATUS = {
  open: { bg: 'var(--accent-2-soft)', color: 'var(--accent-2)' },
  locked: { bg: 'var(--plan-soft)', color: 'var(--plan)' },
  all_paid: { bg: 'var(--rescue-soft)', color: 'var(--rescue)' },
  placed: { bg: 'var(--rescue-soft)', color: 'var(--rescue)' },
  expired: { bg: 'var(--surface-2)', color: 'var(--ink-muted)' }
}

const MyGroupOrdersPage = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const userData = useSelector(state => state.user.userData)
  const [groups, setGroups] = useState([])

  useEffect(() => {
    axios.get(`${serverUrl}/api/group-orders/my`, { withCredentials: true }).then(res => setGroups(res.data || [])).catch(console.log)
  }, [])

  const reorder = async (event, id) => {
    event.stopPropagation()
    try {
      const { data } = await axios.post(`${serverUrl}/api/group-orders/reorder/${id}`, {}, { withCredentials: true })
      navigate(`/group/${data.shareableLink}`)
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to reorder.')
    }
  }

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />
      <main className='mx-auto max-w-5xl px-4 py-10 sm:px-6'>
        <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--accent)' }}>
          <HiOutlineUserGroup /> {t('group.eyebrow', { defaultValue: 'Together' })}
        </p>
        <h1 className='t-display mt-1.5'>{t('group.myTables', { defaultValue: 'Your tables' })}</h1>

        <div className='stagger mt-7 grid gap-4 md:grid-cols-2'>
          {groups.map(group => {
            const me = group.participants.find(p => String(p.userId) === String(userData?._id))
            const amount = Number(me?.subtotal || 0) + Number(me?.deliveryShare || 0) - Number(me?.couponDiscount || 0)
            const tone = TONE_FOR_STATUS[group.status] || TONE_FOR_STATUS.expired
            return (
              <button key={group._id} onClick={() => navigate(`/group/${group.shareableLink}`)}
                className='grain card card-hover p-5 text-left'>
                <div className='flex items-start justify-between gap-3'>
                  <h2 className='t-title !text-[1.15rem]'>{group.restaurantName}</h2>
                  <span className='badge shrink-0 px-3 py-1.5' style={{ background: tone.bg, color: tone.color }}>
                    {group.status.replace('_', ' ')}
                  </span>
                </div>
                <p className='mt-1.5 text-xs' style={{ color: 'var(--ink-muted)' }}>
                  {new Date(group.createdAt).toLocaleString()}
                </p>
                {group.isScheduled && (
                  <p className='mt-2 rounded-xl px-3 py-2 text-xs font-bold' style={{ background: 'var(--plan-soft)', color: 'var(--plan)' }}>
                    🗓️ {t('group.scheduledFor', { defaultValue: 'Scheduled for' })} {new Date(group.scheduledFor).toLocaleString()}
                  </p>
                )}
                <div className='mt-4 flex items-center justify-between text-sm'>
                  <span className='flex items-center gap-2'>
                    {/* avatar stack: who was at the table */}
                    <span className='flex -space-x-1.5' aria-hidden='true'>
                      {group.participants.slice(0, 4).map((p, i) => (
                        <span key={i} className='flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-black'
                          style={{ borderColor: 'var(--surface-1)', background: 'var(--surface-3)', color: 'var(--ink-soft)' }}>
                          {(p.guestName || '?').charAt(0).toUpperCase()}
                        </span>
                      ))}
                    </span>
                    {group.participants.length} {t('group.seated', { defaultValue: 'seated' })}
                  </span>
                  <span className='font-display font-semibold' style={{ fontFamily: 'var(--font-display)' }}>
                    {t('group.myShare', { defaultValue: 'My share' })} ₹{amount.toFixed(2)}
                  </span>
                </div>
                {group.status === 'placed' && (
                  <span onClick={event => reorder(event, group._id)}
                    className='mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold active:scale-95'
                    style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
                    <HiOutlineArrowPath size={13} /> {t('group.reorder', { defaultValue: 'Reorder' })}
                  </span>
                )}
              </button>
            )
          })}
          {!groups.length && (
            <div className='card grain col-span-full p-12 text-center'>
              <span className='text-4xl' aria-hidden='true'>🍽️</span>
              <p className='mt-3' style={{ color: 'var(--ink-muted)' }}>{t('group.noTables', { defaultValue: 'No tables yet — open one tonight.' })}</p>
              <button onClick={() => navigate('/start-group-order')} className='btn-primary mt-5'>{t('dashboard.startGroupOrder')}</button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default MyGroupOrdersPage

import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { serverUrl } from '../App'
import CountdownTimer from '../components/CountdownTimer'
import { HiOutlineTicket, HiOutlineUserGroup, HiOutlineHome, HiOutlineArrowRight } from 'react-icons/hi2'

const JoinGroupOrderPage = () => {
  const { shareableLink } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const userData = useSelector(state => state.user.userData)
  const [group, setGroup] = useState(null)
  const [guestName, setGuestName] = useState('')
  const [joining, setJoining] = useState(false)

  const join = async name => {
    setJoining(true)
    try {
      const { data } = await axios.post(`${serverUrl}/api/group-orders/link/${shareableLink}/join`, { guestName: name }, { withCredentials: true })
      sessionStorage.setItem(`group-participant-${shareableLink}`, data.participantIndex)
      navigate(`/group/${shareableLink}`, { replace: true })
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to join.')
    } finally {
      setJoining(false)
    }
  }

  // The /group page pushes new visitors here to collect their details. Because
  // this page always forwards back to /group, arriving via browser Back (or
  // Forward) must NOT re-run the auto-join effect — otherwise Back out of a
  // group order would immediately bounce the user into the group again,
  // trapping them in the flow. Skip the effect for back/forward history visits;
  // only fresh entries (invite link typed, opened from WhatsApp, etc.) join.
  const isBackForwardVisit = useRef(
    typeof window !== 'undefined' && window.navigation?.type === 'BACK_FORWARD'
  )

  useEffect(() => {
    if (isBackForwardVisit.current) return
    axios.get(`${serverUrl}/api/group-orders/link/${shareableLink}`).then(({ data }) => {
      setGroup(data)
      const existing = userData && data.participants.some(p => String(p.userId) === String(userData._id))
      if (existing) navigate(`/group/${shareableLink}`, { replace: true })
      else if (userData) {
        setJoining(true)
        axios.post(`${serverUrl}/api/group-orders/link/${shareableLink}/join`, { guestName: userData.fullName }, { withCredentials: true })
          .then(res => {
            sessionStorage.setItem(`group-participant-${shareableLink}`, res.data.participantIndex)
            navigate(`/group/${shareableLink}`, { replace: true })
          })
          .catch(error => alert(error.response?.data?.message || 'Unable to join.'))
          .finally(() => setJoining(false))
      }
    }).catch(error => alert(error.response?.data?.message || 'Group order not found.'))
  }, [navigate, shareableLink, userData])

  /* Back/forward visit: a calm landing instead of a bounce loop. */
  if (isBackForwardVisit.current) return (
    <div className='flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center'>
      <span className='flex h-16 w-16 items-center justify-center rounded-3xl text-3xl' style={{ background: 'var(--accent-soft)' }} aria-hidden='true'>
        <HiOutlineUserGroup style={{ color: 'var(--accent-text)' }} />
      </span>
      <h1 className='t-title text-2xl'>{t('group.alreadyInTitle', { defaultValue: 'You are already at this table' })}</h1>
      <p className='max-w-sm text-sm' style={{ color: 'var(--ink-muted)' }}>
        {t('group.alreadyInCopy', { defaultValue: 'You came here with the back button, so we did not seat you again.' })}
      </p>
      <div className='flex flex-wrap justify-center gap-3'>
        <button onClick={() => navigate(`/group/${shareableLink}`, { replace: true })} className='btn-primary'>
          {t('group.returnToTable', { defaultValue: 'Return to the table' })} <HiOutlineArrowRight />
        </button>
        <button onClick={() => navigate('/')} className='btn-ghost'>
          <HiOutlineHome /> {t('group.goHome', { defaultValue: 'Back to the market' })}
        </button>
      </div>
    </div>
  )

  if (!group || userData) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center gap-4'>
        <div className='loading-dots'><span /><span /><span /></div>
        <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>{t('group.findingTable', { defaultValue: 'Finding your table…' })}</p>
      </div>
    )
  }

  const seats = group.participants?.length || 0

  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <div className='grain w-full max-w-md rounded-[2rem] border p-8 shadow-2xl animate-rise-in'
        style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
        <div className='flex items-start justify-between'>
          <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--accent-text)' }}>
            <HiOutlineTicket /> {t('group.inviteEyebrow', { defaultValue: 'You are invited' })}
          </p>
          {/* presence dots: one per seated guest */}
          <span className='flex -space-x-1.5' aria-label={`${seats} guests seated`}>
            {Array.from({ length: Math.min(seats, 4) }).map((_, i) => (
              <span key={i} className='h-5 w-5 rounded-full border-2 animate-breathe stagger-item'
                style={{ borderColor: 'var(--surface-1)', background: 'var(--accent-soft)', animationDelay: `${i * 220}ms` }} />
            ))}
          </span>
        </div>

        <h1 className='t-display mt-3 !text-[1.7rem]'>
          {t('group.joinTitle', { defaultValue: 'A table is open at' })}{' '}
          <span className='gradient-text'>{group.restaurantName}</span>
        </h1>

        <p className='mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold'
          style={{ background: 'var(--plan-soft)', color: 'var(--plan)' }}>
          ⏳ {t('schedule.closesAt')} <CountdownTimer expiresAt={group.expiresAt} />
        </p>

        <form onSubmit={event => { event.preventDefault(); join(guestName) }} className='mt-6'>
          <label htmlFor='guest-name' className='text-sm font-bold'>
            {t('group.yourName', { defaultValue: 'What should the table call you?' })}
          </label>
          <input
            id='guest-name'
            value={guestName}
            onChange={e => setGuestName(e.target.value)}
            required
            placeholder={t('group.namePlaceholder', { defaultValue: 'Your name' })}
            className='mt-2 w-full px-4 py-3'
          />
          <button disabled={joining} className='btn-primary mt-4 w-full !py-3.5'>
            {joining ? t('common.loading') : <>{t('group.joinCta', { defaultValue: 'Take a seat' })} 🪑</>}
          </button>
        </form>
      </div>
    </div>
  )
}

export default JoinGroupOrderPage

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  HiOutlineCheckCircle, HiOutlineClock, HiOutlineLink, HiOutlineChevronRight,
  HiOutlineTicket
} from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa6'
import { serverUrl } from '../App'
import CountdownTimer from '../components/CountdownTimer'
import MarketNav from '../components/MarketNav.jsx'

const money = value => Number(value || 0).toFixed(2)

const AVATAR_TONES = ['var(--accent-2)', 'var(--vendor)', 'var(--rescue)', 'var(--plan)', 'var(--warning)', 'var(--danger)']
const toneFor = index => AVATAR_TONES[index % AVATAR_TONES.length]

/* Deterministic, playful avatar with the guest's initial. */
const Avatar = ({ name, index, size = 34 }) => (
  <span
    className='flex shrink-0 items-center justify-center rounded-full font-black'
    style={{
      width: size, height: size, fontSize: size * 0.4,
      background: `color-mix(in srgb, ${toneFor(index)} 22%, var(--surface-2))`,
      color: toneFor(index),
      border: `2px solid var(--surface-1)`
    }}
    aria-hidden='true'
  >
    {(name || '?').trim().charAt(0).toUpperCase()}
  </span>
)

function GroupOrderPage() {
  const { shareableLink } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const userData = useSelector(state => state.user.userData)
  const [group, setGroup] = useState(null)
  const [menu, setMenu] = useState([])
  const [quantities, setQuantities] = useState({})
  const [couponCode, setCouponCode] = useState('')
  const [chatText, setChatText] = useState('')
  const [expired, setExpired] = useState(false)
  const [busy, setBusy] = useState(false)
  const chatEnd = useRef(null)

  const participantIndex = useMemo(() => {
    if (!group) return -1
    if (userData?._id) return group.participants.findIndex(p => String(p.userId) === String(userData._id))
    return Number(sessionStorage.getItem(`group-participant-${shareableLink}`) ?? -1)
  }, [group, shareableLink, userData?._id])
  const isCreator = group && userData && String(group.creatorId) === String(userData._id)
  const me = group?.participants?.[participantIndex]

  const fetchGroup = useCallback(async () => {
    try {
      const { data } = await axios.get(`${serverUrl}/api/group-orders/link/${shareableLink}`)
      setGroup(data)
      setExpired(false)
    } catch (error) {
      if (error.response?.status === 410) {
        setGroup(error.response.data.groupOrder)
        setExpired(true)
      } else if (error.response?.status === 404) navigate('/')
    }
  }, [navigate, shareableLink])

  useEffect(() => {
    fetchGroup()
    const poll = setInterval(fetchGroup, 5000)
    return () => clearInterval(poll)
  }, [fetchGroup])

  useEffect(() => {
    if (!group) return
    if (participantIndex < 0 && group.status === 'open') navigate(`/join/${shareableLink}`, { replace: true })
  }, [group, navigate, participantIndex, shareableLink])

  useEffect(() => {
    if (!group?.restaurantId || group.votingOpen) return
    axios.get(`${serverUrl}/api/group-orders/menu/${group.restaurantId}`).then(res => setMenu(res.data || [])).catch(console.log)
  }, [group?.restaurantId, group?.votingOpen])

  useEffect(() => {
    if (!me) return
    setQuantities(Object.fromEntries(me.items.map(item => [item.foodId, item.quantity])))
    // Only initialise local quantities when this participant changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?._id])

  useEffect(() => chatEnd.current?.scrollIntoView({ behavior: 'smooth' }), [group?.messages?.length])

  const request = async (method, path, body = {}) => {
    setBusy(true)
    try {
      const { data } = await axios({ method, url: `${serverUrl}/api/group-orders/link/${shareableLink}${path}`, data: body, withCredentials: true })
      if (data?.participants) setGroup(data)
      else await fetchGroup()
      return data
    } catch (error) {
      alert(error.response?.data?.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const saveItems = () => request('patch', '/items', {
    participantIndex,
    items: menu.filter(item => quantities[item._id]).map(item => ({
      foodId: item._id,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: quantities[item._id]
    }))
  })

  const payShare = async index => {
    setBusy(true)
    try {
      const { data } = await axios.post(
        `${serverUrl}/api/group-orders/link/${shareableLink}/pay`,
        { participantIndex: index },
        { withCredentials: true }
      )
      if (!window.Razorpay) {
        alert('Payment gateway failed to load. Please refresh and try again.')
        setBusy(false)
        return
      }

      const razorpayWindow = new window.Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.razorOrder.amount,
        currency: data.razorOrder.currency,
        name: 'GroDel',
        description: `Group order share - ${group.restaurantName}`,
        order_id: data.razorOrder.id,
        prefill: {
          name: me?.guestName || userData?.fullName || '',
          email: userData?.email || '',
          contact: userData?.mobile || ''
        },
        handler: async response => {
          try {
            const result = await axios.post(
              `${serverUrl}/api/group-orders/link/${shareableLink}/verify-payment`,
              {
                participantIndex: index,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              },
              { withCredentials: true }
            )
            setGroup(result.data)
          } catch (error) {
            alert(error.response?.data?.message || 'Payment verification failed.')
          } finally {
            setBusy(false)
          }
        },
        modal: { ondismiss: () => setBusy(false) },
        theme: { color: '#34572c' }
      })
      razorpayWindow.on('payment.failed', response => {
        alert(response.error?.description || 'Payment failed. Please try again.')
        setBusy(false)
      })
      razorpayWindow.open()
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to start payment.')
      setBusy(false)
    }
  }

  const removeParticipant = index => {
    if (confirm('Remove this participant from the group?')) request('delete', '/participant', { participantIndex: index })
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    alert('Invite link copied.')
  }

  if (!group) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center gap-4 lg:pl-[76px]'>
        <div className='loading-dots'><span /><span /><span /></div>
      </div>
    )
  }

  if (expired || group.status === 'expired') {
    return (
      <div className='min-h-screen lg:pl-[76px]'>
        <MarketNav />
        <main className='mx-auto max-w-xl px-4 py-24 text-center'>
          <div className='grain card card-3d p-5 sm:p-8 lg:p-10'>
            <span className='text-4xl' aria-hidden='true'>🕒</span>
            <h1 className='t-title mt-3'>{t('group.expiredTitle', { defaultValue: 'This table has closed' })}</h1>
            <p className='mt-2 text-sm' style={{ color: 'var(--ink-muted)' }}>
              {t('group.expiredCopy', { defaultValue: 'The 30 minute ordering window has closed.' })}
            </p>
            <button onClick={() => navigate('/start-group-order')} className='btn-primary mt-6'>
              {t('group.expiredCta', { defaultValue: 'Open a new table' })}
            </button>
          </div>
        </main>
      </div>
    )
  }

  const participantAmount = participant => Number(participant.subtotal || 0) + Number(participant.deliveryShare || 0) - Number(participant.couponDiscount || 0)
  const complete = ['all_paid', 'placed', 'delivered'].includes(group.status)

  return (
    <div className='min-h-screen print:bg-white lg:pl-[76px]'>
      <MarketNav />

      <main className='mx-auto max-w-7xl px-4 py-8 pb-20 sm:px-6 lg:pb-8 print:max-w-none'>
        {/* ============ Table header ============ */}
        <header className='grain tile p-6 print:shadow-none'>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div>
              <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--accent)' }}>
                <HiOutlineTicket /> {t('group.eyebrow', { defaultValue: 'Together' })}
              </p>
              <h1 className='t-display mt-1.5 !text-[1.9rem]'>{group.restaurantName}</h1>
            </div>
            {!complete && (
              <div className='flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold'
                style={{ background: 'var(--plan-soft)', color: 'var(--plan)' }}>
                <HiOutlineClock size={15} />
                <span className='print:hidden'>{t('schedule.closesAt')}</span>
                <CountdownTimer expiresAt={group.expiresAt} onExpire={() => setExpired(true)} />
              </div>
            )}
          </div>

          {group.isScheduled && (
            <p className='mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold'
              style={{ background: 'var(--plan-soft)', color: 'var(--plan)' }}>
              🗓️ {t('group.scheduledFor', { defaultValue: 'Scheduled for' })} {new Date(group.scheduledFor).toLocaleString()}
            </p>
          )}

          <div className='mt-4 flex flex-wrap gap-2 print:hidden'>
            <button onClick={copyLink} className='btn-ghost !py-2 text-sm'>
              <HiOutlineLink size={15} /> {t('group.inviteLink', { defaultValue: 'Invite link' })}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Join my group order on GroDel: ${window.location.href}`)}`}
              target='_blank' rel='noreferrer' className='btn-primary !bg-[#25d366] !py-2 text-sm' style={{ color: '#08110a', boxShadow: 'none' }}>
              <FaWhatsapp /> WhatsApp
            </a>
          </div>
        </header>

        {/* ============ Voting ============ */}
        {group.votingOpen && (
          <section className='grain tile tile-plan mt-6 p-6'>
            <h2 className='t-title'>{t('group.voteTitle', { defaultValue: 'Vote for tonight\'s kitchen' })}</h2>
            <div className='mt-4 grid gap-3 md:grid-cols-3'>
              {group.restaurantOptions.map(option => (
                <button key={option.restaurantId} onClick={() => request('post', '/vote', { restaurantId: option.restaurantId })}
                  className='rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 active:scale-[0.98]'
                  style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                  <strong className='font-display text-lg' style={{ fontFamily: 'var(--font-display)' }}>{option.restaurantName}</strong>
                  <p className='mt-2 flex items-center gap-1.5 text-xs font-bold' style={{ color: 'var(--plan)' }}>
                    <span className='flex -space-x-1' aria-hidden='true'>
                      {option.votes.slice(0, 3).map((_, i) => (
                        <span key={i} className='h-4 w-4 rounded-full border stagger-item' style={{ background: toneFor(i), borderColor: 'var(--surface-1)' }} />
                      ))}
                    </span>
                    {option.votes.length} {t('group.votes', { defaultValue: 'votes' })}
                  </p>
                </button>
              ))}
            </div>
            {isCreator && (
              <button onClick={() => request('post', '/close-vote')} className='btn-primary mt-4'>
                {t('group.closeVote', { defaultValue: 'Close voting & confirm' })}
              </button>
            )}
          </section>
        )}

        {/* ============ Open: build your plate ============ */}
        {group.status === 'open' && !group.votingOpen && (
          <div className='mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]'>
            <section className='grain card card-3d p-5 sm:p-6'>
              <h2 className='t-title'>{t('group.buildTitle', { defaultValue: 'Build your plate' })}</h2>
              <div className='mt-4 grid gap-3 sm:grid-cols-2'>
                {menu.map(item => {
                  const qty = quantities[item._id] || 0
                  return (
                    <div key={item._id} className='flex gap-3 rounded-2xl border p-3 transition-all stagger-item'
                      style={{ borderColor: qty > 0 ? 'var(--accent)' : 'var(--border)', background: qty > 0 ? 'var(--accent-soft)' : 'var(--surface-2)' }}>
                      {item.image && <img src={item.image} alt='' className='h-20 w-20 rounded-xl object-cover' />}
                      <div className='flex min-w-0 flex-1 flex-col justify-between'>
                        <div>
                          <strong className='block truncate'>{item.name}</strong>
                          <p className='font-display text-sm font-semibold' style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
                            ₹{money(item.price)}
                          </p>
                        </div>
                        <div className='flex items-center gap-2'>
                          <button onClick={() => setQuantities(q => ({ ...q, [item._id]: Math.max(0, (q[item._id] || 0) - 1) }))}
                            aria-label='less' className='flex h-8 w-8 items-center justify-center rounded-full border active:scale-90'
                            style={{ borderColor: 'var(--border-strong)' }}>−</button>
                          <span className='w-6 text-center text-sm font-black'>{qty}</span>
                          <button onClick={() => setQuantities(q => ({ ...q, [item._id]: (q[item._id] || 0) + 1 }))}
                            aria-label='more' className='flex h-8 w-8 items-center justify-center rounded-full active:scale-90'
                            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>+</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button disabled={busy || participantIndex < 0} onClick={saveItems} className='btn-primary mt-5 disabled:opacity-50'>
                {t('group.addToMyOrder', { defaultValue: 'Add to my order' })}
              </button>
            </section>

            <SidePanel group={group} isCreator={isCreator} participantIndex={participantIndex} removeParticipant={removeParticipant}
              request={request} chatText={chatText} setChatText={setChatText} chatEnd={chatEnd} money={money} t={t} />

            <div className='text-center lg:col-span-2'>
              {isCreator
                ? <button disabled={busy} onClick={() => request('post', '/lock')} className='btn-primary !px-10 !py-3.5 text-base'>
                    {t('group.lockOrder', { defaultValue: 'Lock the order' })} 🔒
                  </button>
                : <p className='t-eyebrow animate-breathe'>{t('group.waitingCreator', { defaultValue: 'Waiting for the host to lock…' })}</p>}
            </div>
          </div>
        )}

        {/* ============ Locked: pay your share ============ */}
        {group.status === 'locked' && (
          <div className='mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]'>
            <section className='grain card card-3d p-5 sm:p-6'>
              <h2 className='t-title'>{t('group.payShare', { defaultValue: 'Pay your share' })}</h2>
              <div className='mt-4 space-y-3'>
                {group.participants.map((p, index) => (
                  <div key={p._id} className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 stagger-item'
                    style={{ borderColor: index === participantIndex ? 'var(--accent)' : 'var(--border)', background: 'var(--surface-2)' }}>
                    <div className='flex min-w-0 items-center gap-3'>
                      <Avatar name={p.guestName} index={index} />
                      <div className='min-w-0'>
                        <strong className='block truncate'>
                          {p.guestName}{index === participantIndex ? ` (${t('group.you', { defaultValue: 'you' })})` : ''}
                        </strong>
                        <p className='text-xs' style={{ color: 'var(--ink-muted)' }}>
                          {t('group.itemsDelivery', { defaultValue: 'Items ₹{{items}} + delivery ₹{{delivery}}', items: money(p.subtotal), delivery: money(p.deliveryShare) })}
                          {p.couponDiscount > 0 ? ` − ${t('group.coupon', { defaultValue: 'coupon' })} ₹${money(p.couponDiscount)}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-3'>
                      {p.paymentStatus === 'paid'
                        ? <span className='flex items-center gap-1.5 text-sm font-bold' style={{ color: 'var(--rescue)' }}>
                            <HiOutlineCheckCircle size={17} /> {t('group.paid', { defaultValue: 'Paid' })}
                          </span>
                        : <span className='flex items-center gap-1.5 text-sm font-bold' style={{ color: 'var(--warning)' }}>
                            <HiOutlineClock size={17} /> {t('group.pending', { defaultValue: 'Pending' })}
                          </span>}
                      {index === participantIndex && p.paymentStatus !== 'paid' && (
                        <button disabled={busy} onClick={() => payShare(index)} className='btn-primary !px-4 !py-2 text-sm'>
                          {t('group.payAmount', { defaultValue: 'Pay ₹{{amount}}', amount: money(participantAmount(p)) })}
                        </button>
                      )}
                      {isCreator && index !== participantIndex && p.paymentStatus !== 'paid' && (
                        <button onClick={() => request('post', '/nudge', { participantIndex: index }).then(data => data && alert(data.message))}
                          className='btn-ghost !px-3 !py-1.5 text-xs'>
                          {t('group.nudge', { defaultValue: 'Nudge' })} 👋
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className='mt-5 flex gap-2'>
                <input value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder={t('group.couponPlaceholder', { defaultValue: 'Coupon code' })}
                  className='w-full min-w-0 rounded-full px-4 py-2 text-sm' />
                <button onClick={() => request('post', '/apply-coupon', { couponCode })} className='btn-ghost !px-5 !py-2 text-sm'>
                  {t('group.applyCoupon', { defaultValue: 'Apply' })}
                </button>
              </div>
              {isCreator && group.participants.some(p => p.paymentStatus !== 'paid') && (
                <button onClick={() => request('post', '/nudge-all').then(data => data && alert(data.message))} className='btn-ghost mt-4 !py-2 text-sm'>
                  {t('group.nudgeAll', { defaultValue: 'Nudge everyone unpaid' })} 👋👋
                </button>
              )}
            </section>

            <SidePanel group={group} isCreator={isCreator} participantIndex={participantIndex} removeParticipant={removeParticipant}
              request={request} chatText={chatText} setChatText={setChatText} chatEnd={chatEnd} money={money} t={t} />
          </div>
        )}

        {/* ============ Receipts ============ */}
        {complete && (
          <section className='grain card card-3d mt-6 p-6 print:border-0 print:shadow-none'>
            <div className='text-center print:hidden'>
              <span className='mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl' style={{ background: 'var(--rescue-soft)' }} aria-hidden='true'>🎉</span>
              <h2 className='t-display mt-3 !text-[1.8rem]' style={{ color: 'var(--rescue)' }}>
                {group.status === 'all_paid'
                  ? t('group.allPaidTitle', { defaultValue: 'All paid. Table set!' })
                  : t('group.placedTitle', { defaultValue: 'Order placed!' })}
              </h2>
              <p className='mt-2 text-sm' style={{ color: 'var(--ink-muted)' }}>{group.deliveryAddress}</p>
              <button onClick={() => navigate('/my-orders')} className='btn-primary mt-5'>
                {t('group.trackCta', { defaultValue: 'Track the order' })} <HiOutlineChevronRight />
              </button>
            </div>

            <div className='mt-8 grid gap-4 md:grid-cols-2'>
              {group.participants.map((p, index) => (
                <div key={p._id} className={`${index === participantIndex ? 'print:block' : 'print:hidden'} grain rounded-2xl border p-5`}
                  style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                  <div className='hidden print:block'>
                    <h1 className='text-3xl font-bold text-[#34572c]'>GroDel</h1>
                    <p>{new Date(group.createdAt).toLocaleString()} — {group.restaurantName}</p>
                  </div>
                  <div className='flex items-center gap-2.5'>
                    <Avatar name={p.guestName} index={index} />
                    <h3 className='t-title !text-[1.1rem]'>{t('group.receiptFor', { defaultValue: "{{name}}'s plate", name: p.guestName })}</h3>
                  </div>
                  <div className='mt-3 space-y-1.5 text-sm'>
                    {p.items.map(item => (
                      <p key={item.foodId} className='flex justify-between stagger-item' style={{ animationDelay: `${index * 80}ms` }}>
                        <span>{item.name} × {item.quantity}</span>
                        <span style={{ color: 'var(--ink-soft)' }}>₹{money(item.price * item.quantity)}</span>
                      </p>
                    ))}
                  </div>
                  <hr className='my-3' style={{ borderColor: 'var(--border)' }} />
                  <p className='flex justify-between text-sm'><span>{t('group.subtotal', { defaultValue: 'Subtotal' })}</span><span>₹{money(p.subtotal)}</span></p>
                  <p className='flex justify-between text-sm'><span>{t('group.delivery', { defaultValue: 'Delivery' })}</span><span>₹{money(p.deliveryShare)}</span></p>
                  {p.couponDiscount > 0 && (
                    <p className='flex justify-between text-sm' style={{ color: 'var(--rescue)' }}>
                      <span>{t('group.coupon', { defaultValue: 'Coupon' })}</span><span>− ₹{money(p.couponDiscount)}</span>
                    </p>
                  )}
                  <p className='mt-2 flex justify-between font-bold'>
                    <span>{t('group.paidAmount', { defaultValue: 'Paid' })}</span>
                    <span className='font-display text-lg' style={{ fontFamily: 'var(--font-display)' }}>₹{money(participantAmount(p))}</span>
                  </p>
                  {index === participantIndex && (
                    <button onClick={() => window.print()} className='btn-ghost mt-4 !py-2 text-sm print:hidden'>
                      {t('group.downloadReceipt', { defaultValue: 'Download my receipt' })}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className='mt-6 text-right text-lg font-bold'>
              {t('group.groupTotal', { defaultValue: 'Group total' })}:{' '}
              <span className='font-display text-2xl' style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
                ₹{money(group.totalAmount)}
              </span>
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

/* --- Social side panel: who's here + the table talk --- */
const SidePanel = ({ group, isCreator, participantIndex, removeParticipant, request, chatText, setChatText, chatEnd, money, t }) => (
  <aside className='space-y-6'>
    <section className='grain card card-3d p-5'>
      <h2 className='t-title !text-[1.1rem]'>{t('group.participants', { defaultValue: 'At the table' })}</h2>
      <div className='mt-3 space-y-2.5'>
        {group.participants.map((p, index) => (
          <div key={p._id} className='rounded-2xl p-3 stagger-item' style={{ background: 'var(--surface-2)' }}>
            <div className='flex items-center justify-between gap-2'>
              <div className='flex min-w-0 items-center gap-2.5'>
                <Avatar name={p.guestName} index={index} size={28} />
                <strong className='truncate text-sm'>
                  {p.guestName}{index === participantIndex ? ` (${t('group.you', { defaultValue: 'you' })})` : ''}
                </strong>
              </div>
              <span className={`badge ${p.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                {p.paymentStatus === 'paid' ? t('group.paid', { defaultValue: 'Paid' }) : t('group.pending', { defaultValue: 'Pending' })}
              </span>
            </div>
            <p className='mt-1.5 truncate text-xs' style={{ color: 'var(--ink-muted)' }}>
              {p.items.map(item => `${item.name} ×${item.quantity}`).join(', ') || t('group.noItemsYet', { defaultValue: 'Still deciding…' })}
            </p>
            <p className='font-display mt-1 text-sm font-semibold' style={{ fontFamily: 'var(--font-display)' }}>₹{money(p.subtotal)}</p>
            {isCreator && index > 0 && group.status === 'open' && (
              <button onClick={() => removeParticipant(index)} className='mt-1.5 text-xs font-bold' style={{ color: 'var(--danger)' }}>
                {t('group.remove', { defaultValue: 'Remove' })}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>

    <section className='grain card card-3d p-5'>
      <h2 className='t-title !text-[1.1rem]'>{t('group.chatTitle', { defaultValue: 'Table talk' })}</h2>
      <div className='mt-3 max-h-56 space-y-2 overflow-y-auto pr-1'>
        {group.messages?.map((message, index) => (
          <div key={message._id} className='flex items-start gap-2 stagger-item' style={{ animationDelay: `${index * 80}ms` }}>
            <Avatar name={message.senderName} index={index} size={24} />
            <div className='max-w-[80%] rounded-2xl rounded-bl-md px-3 py-1.5 text-sm'
              style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>
              <strong className='notranslate' style={{ color: 'var(--ink-muted)', fontSize: '0.7rem' }}>{message.senderName}</strong>
              <span className='mx-1'>·</span>
              {message.text}
            </div>
          </div>
        ))}
        <div ref={chatEnd} />
      </div>
      <form onSubmit={event => { event.preventDefault(); request('post', '/chat', { senderName: group.participants[participantIndex]?.guestName || 'Guest', text: chatText }); setChatText('') }}
        className='mt-3 flex gap-2'>
        <input value={chatText} onChange={e => setChatText(e.target.value)} placeholder={t('group.chatPlaceholder', { defaultValue: 'Say something to the table…' })}
          className='min-w-0 flex-1 rounded-full px-4 py-2 text-sm' />
        <button className='btn-primary !px-4 !py-2 text-sm'>{t('group.send', { defaultValue: 'Send' })}</button>
      </form>
    </section>
  </aside>
)

export default GroupOrderPage

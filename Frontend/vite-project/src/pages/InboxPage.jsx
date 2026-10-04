import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import MarketNav from '../components/MarketNav.jsx'
import { dm } from '../api/dm'
import { serverUrl } from '../App'
import axios from 'axios'
import {
  HiOutlineChatBubbleLeftRight, HiOutlinePaperAirplane, HiOutlineScale,
  HiOutlineArrowRightCircle, HiOutlineBanknotes, HiOutlineUserGroup
} from 'react-icons/hi2'

/*
 * Farmer-buyer inbox: thread list (left / top on mobile) + conversation pane with
 * an offer card. Socket: farmerThreadMessage + farmerOfferUpdate keep the open
 * thread live. Offers flow proposed → countered → accepted → convert to order.
 * Dark + light: tokens only. Mobile: panes stack, list collapses to a back link.
 */
const OFFER_STATUS_STYLES = {
  proposed: 'badge-warning',
  countered: 'badge-accent',
  accepted: 'badge-success',
  rejected: 'badge-danger',
  expired: 'badge-muted'
}

function InboxPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { socket } = useSelector(state => state.user)
  const { userData } = useSelector(state => state.user)
  const [threads, setThreads] = useState([])
  const [activeId, setActiveId] = useState(location.state?.threadId || null)
  const [thread, setThread] = useState(null)
  const [viewerRole, setViewerRole] = useState('buyer')
  const [message, setMessage] = useState('')
  const [offer, setOffer] = useState({ qty: '', pricePerUnit: '', note: '' })
  const [loading, setLoading] = useState(true)
  const listEndRef = useRef(null)
  const isFarmer = userData?.role === 'vendor'

  const loadThreads = () => dm.get('/threads')
    .then(res => {
      setThreads(res.data?.threads || [])
      if (!activeId && res.data?.threads?.length) setActiveId(res.data.threads[0]._id)
    })
    .catch(() => {})

  useEffect(() => { loadThreads().finally(() => setLoading(false)) }, [])

  const loadThread = (id) => {
    if (!id) return
    dm.get(`/threads/${id}`).then(res => {
      setThread(res.data?.thread || null)
      setViewerRole(res.data?.viewerRole || 'buyer')
    }).catch(() => {})
  }

  useEffect(() => { loadThread(activeId) }, [activeId])

  useEffect(() => { listEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread?.messages?.length])

  /* Realtime updates for the open thread */
  useEffect(() => {
    if (!socket) return
    const onMessage = (data) => { if (String(data.threadId) === String(activeId)) loadThread(activeId) }
    const onOffer = (data) => { if (String(data.threadId) === String(activeId)) loadThread(activeId) }
    socket.on('farmerThreadMessage', onMessage)
    socket.on('farmerOfferUpdate', onOffer)
    return () => {
      socket.off('farmerThreadMessage', onMessage)
      socket.off('farmerOfferUpdate', onOffer)
    }
  }, [socket, activeId])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!message.trim() || !activeId) return
    const text = message
    setMessage('')
    try {
      await dm.post(`/threads/${activeId}/messages`, { text })
      loadThread(activeId)
    } catch { setMessage(text) }
  }

  const sendOffer = async () => {
    if (!offer.qty || !offer.pricePerUnit || !activeId) return
    try {
      await dm.post(`/threads/${activeId}/offers`, { qty: Number(offer.qty), pricePerUnit: Number(offer.pricePerUnit), note: offer.note })
      setOffer({ qty: '', pricePerUnit: '', note: '' })
      loadThread(activeId)
    } catch {}
  }

  const respond = async (action) => {
    try {
      await dm.patch(`/threads/${activeId}/offers/respond`, { action })
      loadThread(activeId)
    } catch {}
  }

  const convert = async () => {
    try {
      const res = await dm.post(`/threads/${activeId}/convert`, {})
      navigate('/farmer/orders')
    } catch {}
  }

  const standingOffer = useMemo(
    () => [...(thread?.offers || [])].reverse().find(o => ['proposed', 'countered'].includes(o.status)),
    [thread]
  )
  const acceptedOffer = useMemo(
    () => [...(thread?.offers || [])].reverse().find(o => o.status === 'accepted'),
    [thread]
  )
  const canRespond = standingOffer && standingOffer.fromRole !== viewerRole
  const counterpartName = thread?.buyerId?.fullName || (thread?.listingId ? 'Buyer' : 'Conversation')

  if (loading) {
    return (
      <div className='min-h-screen lg:pl-[76px]'>
        <MarketNav />
        <main className='mx-auto max-w-5xl px-4 py-10'><div className='skeleton h-10 w-64' /></main>
      </div>
    )
  }

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />
      <main className='mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6'>
        <header>
          <p className='t-eyebrow' style={{ color: 'var(--vendor)' }}>Farmer–buyer desk</p>
          <h1 className='t-display mt-2'>Negotiate, then shake hands</h1>
        </header>

        <div className='mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]'>
          {/* ---------- thread list ---------- */}
          <aside className='grain card max-h-[70vh] overflow-y-auto p-3'>
            {threads.length === 0 && (
              <p className='p-6 text-center text-sm' style={{ color: 'var(--ink-muted)' }}>
                No conversations yet. {isFarmer ? 'Buyers will appear here when they message you.' : 'Message a farmer from their storefront.'}
              </p>
            )}
            {threads.map(th => (
              <button key={th._id} onClick={() => setActiveId(th._id)}
                className='mb-1.5 block w-full rounded-2xl px-3 py-2.5 text-left transition-all'
                style={String(th._id) === String(activeId)
                  ? { background: 'var(--accent-soft)', color: 'var(--accent)' }
                  : { background: 'transparent', color: 'var(--ink)' }}>
                <p className='truncate text-sm font-bold'>{isFarmer ? th.buyerId?.fullName : th.listingId?.name || 'Farmer'}</p>
                <p className='truncate text-xs' style={{ color: 'var(--ink-muted)' }}>
                  {isFarmer ? (th.listingId?.name || 'General enquiry') : th.listingId ? `₹${th.listingId.pricePerUnit}/${th.listingId.unit}` : ''}
                </p>
              </button>
            ))}
          </aside>

          {/* ---------- conversation ---------- */}
          <section className='grain card flex max-h-[70vh] flex-col'>
            {!thread ? (
              <div className='flex flex-1 flex-col items-center justify-center p-10 text-center'>
                <HiOutlineChatBubbleLeftRight size={36} style={{ color: 'var(--ink-faint)' }} />
                <p className='mt-3 text-sm' style={{ color: 'var(--ink-muted)' }}>Pick a conversation to begin.</p>
              </div>
            ) : (
              <>
                <div className='flex flex-wrap items-center justify-between gap-2 px-5 py-3' style={{ borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p className='font-bold'>{counterpartName}</p>
                    {thread.listingId && (
                      <p className='text-xs' style={{ color: 'var(--ink-muted)' }}>
                        {thread.listingId.name} · listed ₹{thread.listingId.pricePerUnit}/{thread.listingId.unit}
                      </p>
                    )}
                  </div>
                  <span className='badge badge-muted capitalize'>{thread.status}</span>
                </div>

                <div className='flex-1 space-y-2 overflow-y-auto px-5 py-4'>
                  {(thread.messages || []).map((m, i) => (
                    <div key={i} className={`flex ${m.fromRole === viewerRole ? 'justify-end' : 'justify-start'}`}>
                      <div className='max-w-[75%] rounded-2xl px-3.5 py-2 text-sm'
                        style={m.fromRole === viewerRole
                          ? { background: 'var(--accent)', color: 'var(--accent-ink)' }
                          : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                        {m.text}
                        <span className='mt-0.5 block text-[10px] opacity-60'>{new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={listEndRef} />
                </div>

                {/* ---------- negotiation card ---------- */}
                <div className='px-5 pb-2'>
                  {acceptedOffer && thread.status !== 'converted' && (
                    <div className='mb-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl p-3'
                      style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                      <p className='text-sm font-bold'><HiOutlineScale size={15} className='mr-1 inline' /> Accepted: {acceptedOffer.qty} {acceptedOffer.unit} @ ₹{acceptedOffer.pricePerUnit} = ₹{acceptedOffer.qty * acceptedOffer.pricePerUnit}</p>
                      <button className='btn-primary !px-3.5 !py-1.5 text-xs' onClick={convert}>
                        <HiOutlineArrowRightCircle /> Convert to order
                      </button>
                    </div>
                  )}
                  {standingOffer && (
                    <div className='mb-2 rounded-2xl p-3' style={{ background: 'var(--surface-2)', border: '1px dashed var(--border-strong)' }}>
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <p className='text-sm font-bold'>
                          <HiOutlineScale size={15} className='mr-1 inline' style={{ color: 'var(--vendor)' }} />
                          {standingOffer.fromRole === viewerRole ? 'Your offer' : 'Their offer'}: {standingOffer.qty} {standingOffer.unit} @ ₹{standingOffer.pricePerUnit}
                          {standingOffer.note && <span className='ml-2 font-normal' style={{ color: 'var(--ink-muted)' }}>“{standingOffer.note}”</span>}
                        </p>
                        <span className={`badge ${OFFER_STATUS_STYLES[standingOffer.status]}`}>{standingOffer.status}</span>
                      </div>
                      {canRespond && (
                        <div className='mt-2 flex gap-2'>
                          <button className='btn-primary !px-3.5 !py-1.5 text-xs' onClick={() => respond('accept')}><HiOutlineBanknotes /> Accept</button>
                          <button className='btn-ghost !px-3.5 !py-1.5 text-xs' onClick={() => respond('reject')}>Decline</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ---------- composer ---------- */}
                <div className='px-5 pb-4'>
                  <div className='mb-2 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_2fr]'>
                    <input className='px-3 py-2 text-sm' placeholder='Qty' inputMode='decimal' value={offer.qty} onChange={e => setOffer(o => ({ ...o, qty: e.target.value }))} aria-label='Offer quantity' />
                    <input className='px-3 py-2 text-sm' placeholder='₹/unit' inputMode='decimal' value={offer.pricePerUnit} onChange={e => setOffer(o => ({ ...o, pricePerUnit: e.target.value }))} aria-label='Offer price per unit' />
                    <input className='col-span-2 px-3 py-2 text-sm sm:col-span-1' placeholder='Note (e.g. harvested today)' value={offer.note} onChange={e => setOffer(o => ({ ...o, note: e.target.value }))} aria-label='Offer note' />
                  </div>
                  <div className='flex gap-2'>
                    <button className='rounded-full px-3.5 py-2 text-xs font-black transition-transform active:scale-95'
                      style={{ background: 'var(--vendor)', color: '#1c1006' }} onClick={sendOffer} disabled={!offer.qty || !offer.pricePerUnit}>
                      <HiOutlineScale /> {standingOffer && standingOffer.fromRole !== viewerRole ? 'Counter' : 'Send offer'}
                    </button>
                    <form className='flex flex-1 gap-2' onSubmit={sendMessage}>
                      <input className='flex-1 px-3 py-2 text-sm' placeholder='Type a message…' value={message} onChange={e => setMessage(e.target.value)} aria-label='Message' />
                      <button type='submit' className='btn-primary !px-4 !py-2' aria-label='Send'><HiOutlinePaperAirplane /></button>
                    </form>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default InboxPage

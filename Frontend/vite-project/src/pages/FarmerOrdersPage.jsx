import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import MarketNav from '../components/MarketNav.jsx'
import { dm } from '../api/dm'
import axios from 'axios'
import { serverUrl } from '../App'
import {
  HiOutlineClipboardDocumentList, HiOutlineCheckCircle, HiOutlineXCircle,
  HiOutlineTruck, HiOutlineBuildingStorefront, HiOutlineUserGroup, HiOutlineClock
} from 'react-icons/hi2'

/*
 * Farmer order queue: extends vendor order cards with buyer type, fulfillment
 * (pickup/delivery), negotiation links, cooperative shares, accept/reject and
 * dispatch controls. Status flow unchanged: pending → confirmed → ready →
 * out of delivery → delivered.
 * Dark + light: tokens. Mobile: single-column cards, wrapped action rows.
 */
const STATUS_STYLES = {
  pending: 'badge-warning',
  confirmed: 'badge-brand',
  ready: 'badge-accent',
  'out of delivery': 'badge-accent',
  delivered: 'badge-success',
  cancelled: 'badge-danger'
}
const STATUS_FLOW = ['confirmed', 'ready', 'out of delivery', 'delivered']

function FarmerOrdersPage() {
  const navigate = useNavigate()
  const { socket } = useSelector(state => state.user)
  const [orders, setOrders] = useState([])
  const [coops, setCoops] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [pickupWhen, setPickupWhen] = useState({})

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3500)
  }

  const load = () => dm.get('/farmer/orders')
    .then(res => { setOrders(res.data?.orders || []); setCoops(res.data?.coops || []) })
    .catch(() => showToast('Could not load orders', 'error'))

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  useEffect(() => {
    if (!socket) return
    const onNew = () => { showToast('New order in the queue'); load() }
    socket.on('newVendorOrder', onNew)
    return () => socket.off('newVendorOrder', onNew)
  }, [socket])

  const advance = async (order, status) => {
    setBusyId(order._id)
    try {
      const res = await axios.patch(`${serverUrl}/api/vendor/orders/${order._id}/status`, { status }, { withCredentials: true })
      setOrders(prev => prev.map(o => (o._id === order._id ? res.data?.order || o : o)))
      showToast(`Marked ${status}`)
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not update', 'error')
    } finally { setBusyId(null) }
  }

  const reject = async (order) => {
    if (!window.confirm('Reject this order? The buyer will be notified.')) return
    advance(order, 'cancelled')
  }

  const respondCoop = async (coopId, shareIndex, action) => {
    try {
      await dm.patch(`/coop/${coopId}/shares/${shareIndex}/respond`, { action })
      showToast(action === 'accept' ? 'Coop share accepted' : 'Coop share declined')
      load()
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not respond', 'error')
    }
  }

  const myCoopShares = (coop, profileId) =>
    coop.shares?.map((s, i) => ({ ...s, i })).filter(s => String(s.farmerId) === String(profileId)) || []

  const active = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
  const past = orders.filter(o => ['delivered', 'cancelled'].includes(o.status))
  const proposedCoops = coops.filter(c => c.status === 'proposed' || c.status === 'partial')

  if (loading) {
    return (
      <div className='min-h-screen lg:pl-[76px]'>
        <MarketNav />
        <main className='mx-auto max-w-4xl px-4 py-10'><div className='skeleton h-10 w-64' /></main>
      </div>
    )
  }

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />
      {toast && (
        <div className='toast flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold shadow-lg'
          style={{ background: toast.type === 'error' ? 'var(--danger)' : 'var(--accent)', color: toast.type === 'error' ? '#2a0d08' : 'var(--accent-ink)' }}>
          {toast.message}
        </div>
      )}

      <main className='mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-6'>
        <header>
          <p className='t-eyebrow' style={{ color: 'var(--vendor)' }}>Order queue</p>
          <h1 className='t-display mt-2'>From field to hand</h1>
        </header>

        {/* ---------- incoming cooperative orders ---------- */}
        {proposedCoops.length > 0 && (
          <section className='mt-6'>
            <h2 className='t-title flex items-center gap-2'><HiOutlineUserGroup style={{ color: 'var(--accent-2)' }} /> Incoming cooperative orders</h2>
            <div className='stagger mt-4 space-y-3'>
              {proposedCoops.map(coop => coop.shares?.map((s, i) => (
                s.status === 'proposed' && (
                  <div key={`${coop._id}-${i}`} className='grain card p-4 card-3d stagger-item' style={{ borderColor: 'var(--accent-2)' }}>
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div>
                        <p className='t-eyebrow' style={{ color: 'var(--accent-2)' }}>Cooperative bulk order</p>
                        <p className='mt-1 font-bold'>{s.qty} {coop.unit} of {coop.cropName}</p>
                        <p className='text-sm' style={{ color: 'var(--ink-soft)' }}>
                          Your payout ₹{s.payout} (₹{s.pricePerUnit}/{coop.unit}) · total order {coop.totalQty} {coop.unit}
                        </p>
                        <p className='mt-0.5 flex items-center gap-1 text-xs' style={{ color: 'var(--ink-muted)' }}>
                          <HiOutlineClock size={13} /> Dispatch by {new Date(coop.dispatchDeadline).toLocaleDateString()}
                        </p>
                      </div>
                      <div className='flex gap-2'>
                        <button className='btn-primary !px-4 !py-2 text-xs' onClick={() => respondCoop(coop._id, i, 'accept')}><HiOutlineCheckCircle /> Accept</button>
                        <button className='btn-ghost !px-4 !py-2 text-xs' style={{ color: 'var(--danger)' }} onClick={() => respondCoop(coop._id, i, 'reject')}><HiOutlineXCircle /> Decline</button>
                      </div>
                    </div>
                  </div>
                )
              )))}
            </div>
          </section>
        )}

        {/* ---------- active orders ---------- */}
        <section className='mt-8'>
          <h2 className='t-title flex items-center gap-2'><HiOutlineClipboardDocumentList style={{ color: 'var(--vendor)' }} /> Active orders</h2>
          <div className='stagger mt-4 space-y-3'>
            {active.length === 0 && (
              <div className='grain card p-10 text-center card-3d'>
                <span className='text-4xl' aria-hidden='true'>🧺</span>
                <p className='mt-3 text-sm' style={{ color: 'var(--ink-muted)' }}>No active orders. New ones arrive here with a chime.</p>
              </div>
            )}
            {active.map((order, i) => (
              <article key={order._id} className='grain card p-4 card-3d stagger-item' style={{ animationDelay: `${i * 80}ms` }}>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='font-bold'>{order.customer?.fullName || 'Buyer'}</p>
                    <div className='mt-1 flex flex-wrap gap-1.5'>
                      {order.buyerType && order.buyerType !== 'consumer' && (
                        <span className='badge badge-brand capitalize'>{order.buyerType}</span>
                      )}
                      <span className='badge badge-muted'>
                        {order.fulfillmentType === 'pickup' ? <>Pickup at farm <HiOutlineBuildingStorefront className='ml-1 inline' /></> : <>Delivery <HiOutlineTruck className='ml-1 inline' /></>}
                      </span>
                      {order.source === 'negotiated' && <span className='badge badge-accent'>From negotiation</span>}
                      {order.source === 'coop' && <span className='badge badge-accent'>Cooperative share</span>}
                    </div>
                    <p className='mt-1.5 text-sm' style={{ color: 'var(--ink-soft)' }}>
                      {order.items.map(i => `${i.name} ×${i.quantity}${i.unit ? ` ${i.unit}` : ''}`).join(', ')}
                    </p>
                    {order.fulfillmentType === 'delivery' && order.deliveryAddress?.text && (
                      <p className='mt-0.5 text-xs' style={{ color: 'var(--ink-muted)' }}>📍 {order.deliveryAddress.text}</p>
                    )}
                  </div>
                  <div className='text-right'>
                    <span className={`badge ${STATUS_STYLES[order.status] || 'badge-muted'}`}>{order.status}</span>
                    <p className='mt-1 font-display text-lg font-black' style={{ fontFamily: 'var(--font-display)' }}>₹{order.totalAmount}</p>
                  </div>
                </div>

                <div className='mt-3 flex flex-wrap gap-2 border-t pt-3' style={{ borderColor: 'var(--border)' }}>
                  {order.status === 'pending' && (
                    <>
                      <button className='btn-primary !px-4 !py-2 text-xs' disabled={busyId === order._id} onClick={() => advance(order, 'confirmed')}>Accept</button>
                      <button className='btn-ghost !px-4 !py-2 text-xs' style={{ color: 'var(--danger)' }} disabled={busyId === order._id} onClick={() => reject(order)}>Reject</button>
                    </>
                  )}
                  {STATUS_FLOW.indexOf(order.status) >= 0 && STATUS_FLOW.indexOf(order.status) < STATUS_FLOW.length - 1 && (
                    <button className='btn-primary !px-4 !py-2 text-xs' disabled={busyId === order._id}
                      onClick={() => advance(order, STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1])}>
                      Mark {STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1]}
                    </button>
                  )}
                  {order.fulfillmentType === 'pickup' && order.status === 'confirmed' && (
                    <div className='flex items-center gap-2'>
                      <input type='datetime-local' className='px-3 py-1.5 text-xs' value={pickupWhen[order._id] || ''}
                        onChange={e => setPickupWhen(w => ({ ...w, [order._id]: e.target.value }))} aria-label='Pickup time' />
                      <button className='btn-ghost !px-3.5 !py-1.5 text-xs' onClick={() => showToast(`Pickup scheduled${pickupWhen[order._id] ? ' for ' + new Date(pickupWhen[order._id]).toLocaleString() : ''}`)}>Schedule pickup</button>
                    </div>
                  )}
                  {order.negotiationId && (
                    <button className='link-brand text-xs' onClick={() => navigate('/farmers/inbox', { state: { threadId: order.negotiationId } })}>View negotiation</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ---------- history ---------- */}
        {past.length > 0 && (
          <section className='mt-8'>
            <h2 className='t-title'>Completed & closed</h2>
            <div className='mt-4 space-y-2'>
              {past.slice(0, 12).map((order, i) => (
                <div key={order._id} className='grain card flex flex-wrap items-center justify-between gap-2 p-3 card-3d stagger-item' style={{ animationDelay: `${i * 80}ms` }}>
                  <p className='text-sm'>
                    <span className='font-bold'>{order.items.map(i => i.name).join(', ')}</span>
                    <span className='ml-2' style={{ color: 'var(--ink-muted)' }}>₹{order.totalAmount}</span>
                  </p>
                  <span className={`badge ${STATUS_STYLES[order.status]}`}>{order.status}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default FarmerOrdersPage

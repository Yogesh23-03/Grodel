import React, { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { ClipLoader } from 'react-spinners'
import {
  HiOutlineCalendarDays, HiOutlineMapPin, HiOutlineUser, HiOutlineArrowLeft,
  HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineClock
} from 'react-icons/hi2'
import { serverUrl } from '../App'
import MarketNav from '../components/MarketNav.jsx'

/*
 * MyBulkOrdersPage — one page, two audiences.
 * A customer sees requests they placed; an owner sees the requests addressed to
 * their shop, with the accept/reject controls.
 */

const STATUSES = ['pending', 'accepted', 'rejected', 'preparing', 'delivered']

const statusStyle = status => {
  switch (status) {
    case 'accepted':
    case 'delivered': return { background: 'var(--success-soft)', color: 'var(--success)' }
    case 'rejected': return { background: 'var(--danger-soft)', color: 'var(--danger)' }
    case 'preparing': return { background: 'var(--accent-2-soft)', color: 'var(--accent-2)' }
    default: return { background: 'var(--warning-soft)', color: 'var(--warning)' }
  }
}

function MyBulkOrdersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userData } = useSelector(state => state.user)
  const isOwner = userData?.role === 'owner'

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [draftNotes, setDraftNotes] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await axios.get(`${serverUrl}/api/bulk-orders/my`, { withCredentials: true })
      setOrders(result.data?.bulkOrders || [])
    } catch (caught) {
      setError(caught?.response?.data?.message || t('bulk.loadError', 'Could not load your bulk orders'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const updateStatus = async (bulkOrderId, status) => {
    setBusyId(bulkOrderId)
    try {
      const result = await axios.patch(`${serverUrl}/api/bulk-orders/${bulkOrderId}`, {
        status,
        ownerNote: draftNotes[bulkOrderId] ?? undefined
      }, { withCredentials: true })
      const updated = result.data?.bulkOrder
      setOrders(previous => previous.map(order => (
        order._id === bulkOrderId ? { ...order, ...updated } : order
      )))
    } catch (caught) {
      setError(caught?.response?.data?.message || t('bulk.updateError', 'Could not update that request'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />
      <main className='mx-auto w-full max-w-[900px] px-4 pb-20 pt-6 sm:px-6'>
        <header className='flex items-center gap-3'>
          <button onClick={() => navigate('/')} className='btn-ghost !h-10 !w-10 !p-0' aria-label={t('common.back', 'Back')}>
            <HiOutlineArrowLeft size={18} />
          </button>
          <div>
            <p className='t-eyebrow' style={{ color: 'var(--accent-2)' }}>{t('bulk.eyebrow', 'Bulk & catering')}</p>
            <h1 className='t-title mt-0.5'>
              {isOwner ? t('bulk.ownerTitle', 'Incoming bulk orders') : t('bulk.myTitle', 'My bulk orders')}
            </h1>
          </div>
        </header>

        {loading && (
          <div className='grain card card-3d mt-6 flex flex-col items-center gap-3 p-12'>
            <div className='loading-dots'><span /><span /><span /></div>
            <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>{t('common.loading', 'Loading…')}</p>
          </div>
        )}

        {!loading && error && (
          <p className='mt-6 text-sm' style={{ color: 'var(--danger)' }}>{error}</p>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className='grain card card-3d mt-6 p-12 text-center'>
            <span className='text-4xl' aria-hidden='true'>📦</span>
            <p className='mt-3' style={{ color: 'var(--ink-muted)' }}>
              {isOwner
                ? t('bulk.noIncoming', 'No bulk requests yet.')
                : t('bulk.noPlaced', 'You have not placed a bulk order yet.')}
            </p>
          </div>
        )}

        <div className='stagger mt-6 space-y-4'>
          {orders.map(order => {
            const customer = order.placedBy
            return (
              <article key={order._id} className='grain card card-3d p-5'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <h2 className='t-title !text-base'>
                      {isOwner
                        ? (customer?.fullName || t('bulk.aCustomer', 'A customer'))
                        : (order.shopName || t('bulk.aShop', 'A shop'))}
                    </h2>
                    <p className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs' style={{ color: 'var(--ink-muted)' }}>
                      {isOwner && customer?.mobile && (
                        <span className='flex items-center gap-1'><HiOutlineUser /> {customer.mobile}</span>
                      )}
                      {order.deliveryDate && (
                        <span className='flex items-center gap-1'>
                          <HiOutlineCalendarDays /> {new Date(order.deliveryDate).toLocaleDateString()}
                        </span>
                      )}
                      {order.isForEvent && order.eventName && <span>🎉 {order.eventName}</span>}
                    </p>
                  </div>
                  <span className='badge' style={statusStyle(order.status)}>
                    {t(`bulk.statuses.${order.status}`, order.status)}
                  </span>
                </div>

                <ul className='mt-4 space-y-1.5'>
                  {(order.items || []).map((line, index) => (
                    <li key={`${line.name}-${index}`} className='flex items-center justify-between gap-3 text-sm stagger-item' style={{ animationDelay: `${index * 80}ms` }}>
                      <span style={{ color: 'var(--ink-soft)' }}>
                        {line.name} <span style={{ color: 'var(--ink-faint)' }}>× {line.quantity} {line.unit}</span>
                      </span>
                      <span style={{ color: 'var(--ink-muted)' }}>₹{line.totalPrice}</span>
                    </li>
                  ))}
                </ul>

                <div className='mt-4 flex flex-wrap items-center justify-between gap-2 pt-3' style={{ borderTop: '1px solid var(--border)' }}>
                  <span className='t-eyebrow'>{t('bulk.total', 'Total')}</span>
                  <span className='font-display text-xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-2)' }}>
                    ₹{order.totalAmount}
                  </span>
                </div>

                {!order.minimumOrderMet && (
                  <p className='mt-2 text-xs' style={{ color: 'var(--warning)' }}>
                    {t('bulk.belowMinimum', { minimum: 500, defaultValue: 'Below the ₹500 minimum order' })}
                  </p>
                )}

                {order.deliveryAddress && (
                  <p className='mt-3 flex items-start gap-1.5 text-xs' style={{ color: 'var(--ink-muted)' }}>
                    <HiOutlineMapPin className='mt-0.5 shrink-0' /> {order.deliveryAddress}
                  </p>
                )}

                {order.note && (
                  <p className='mt-2 text-xs' style={{ color: 'var(--ink-soft)' }}>
                    <span className='font-bold'>{t('bulk.customerNote', 'Customer note')}: </span>{order.note}
                  </p>
                )}

                {order.ownerNote && (
                  <p className='mt-2 text-xs' style={{ color: 'var(--ink-soft)' }}>
                    <span className='font-bold'>{t('bulk.ownerNote', 'Reply from the restaurant')}: </span>{order.ownerNote}
                  </p>
                )}

                {/* ---------- owner-only controls ---------- */}
                {isOwner && (
                  <div className='mt-5 space-y-3 pt-4' style={{ borderTop: '1px solid var(--border)' }}>
                    <textarea rows={2} className='w-full px-3 py-2 text-sm'
                      placeholder={t('bulk.replyPlaceholder', 'Reply to the customer (optional)')}
                      value={draftNotes[order._id] ?? order.ownerNote ?? ''}
                      onChange={event => setDraftNotes(previous => ({ ...previous, [order._id]: event.target.value }))} />

                    <div className='flex flex-wrap items-center gap-2'>
                      <button type='button' className='btn-primary'
                        disabled={busyId === order._id || order.status === 'accepted'}
                        onClick={() => updateStatus(order._id, 'accepted')}>
                        {busyId === order._id
                          ? <ClipLoader size={14} color='currentColor' />
                          : <HiOutlineCheckCircle />}
                        <span className='ml-2'>{t('bulk.accept', 'Accept')}</span>
                      </button>

                      <button type='button' className='btn-ghost'
                        disabled={busyId === order._id || order.status === 'rejected'}
                        onClick={() => updateStatus(order._id, 'rejected')}>
                        <HiOutlineXCircle /> <span className='ml-2'>{t('bulk.reject', 'Reject')}</span>
                      </button>

                      <label className='ml-auto flex items-center gap-2'>
                        <span className='t-eyebrow'>{t('bulk.updateStatus', 'Status')}</span>
                        <select className='px-2 py-1.5 text-sm' value={order.status}
                          disabled={busyId === order._id}
                          onChange={event => updateStatus(order._id, event.target.value)}>
                          {STATUSES.map(status => (
                            <option key={status} value={status}>{t(`bulk.statuses.${status}`, status)}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                )}

                {!isOwner && order.status === 'pending' && (
                  <p className='mt-4 flex items-center gap-1.5 text-xs' style={{ color: 'var(--ink-muted)' }}>
                    <HiOutlineClock /> {t('bulk.awaitingOwner', 'Waiting for the restaurant to confirm.')}
                  </p>
                )}
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}

export default MyBulkOrdersPage

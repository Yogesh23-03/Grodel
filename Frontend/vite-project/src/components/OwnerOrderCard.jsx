import axios from 'axios'
import React from 'react'
import { MdPhone } from 'react-icons/md'
import { serverUrl } from '../App'
import { useDispatch } from 'react-redux'
import { updateOrderStatus } from '../redux/userSlice'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const STATUS_STYLES = {
  pending: { background: 'var(--warning-soft)', color: 'var(--warning)' },
  preparing: { background: 'var(--accent-soft)', color: 'var(--accent-text)' },
  'out of delivery': { background: 'var(--accent-2-soft)', color: 'var(--accent-2)' },
  delivered: { background: 'var(--success-soft)', color: 'var(--success)' },
  cancelled: { background: 'var(--danger-soft)', color: 'var(--danger)' }
}

/* One kitchen's order in the owner's live dock. Flow:
   pending → preparing → out of delivery (delivered is set by OTP verify). */
function OwnerOrderCard({ data }) {
  const [availableBoys, setAvailableBoys] = useState([])
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const shopOrder = data?.shopOrders
  const shopId = shopOrder?.shop?._id || shopOrder?.shop

  const handleUpdateStatus = async (orderId, shopId, status) => {
    if (!status || !shopId) return
    try {
      const result = await axios.post(`${serverUrl}/api/order/update-status/${orderId}/${shopId}`, { status }, { withCredentials: true })
      dispatch(updateOrderStatus({ orderId, shopId, status }))
      setAvailableBoys(result.data.availableBoys || [])
    } catch (error) {
      setError(error.response?.data?.message || 'Could not update the order')
    }
  }

  const handleCancelOrder = async () => {
    const confirmCancel = window.confirm(t('owner.cancelConfirm', 'Cancel this order? This cannot be undone.'))
    if (!confirmCancel) return

    setCancelling(true)
    try {
      if (!shopOrder?._id || !shopId) return
      await axios.post(`${serverUrl}/api/order/cancel-order/${data._id}/${shopOrder._id}`, {}, { withCredentials: true })
      dispatch(updateOrderStatus({ orderId: data._id, shopId, status: 'cancelled' }))
      setAvailableBoys([])
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to cancel order')
    } finally {
      setCancelling(false)
    }
  }

  const tone = STATUS_STYLES[shopOrder?.status] || STATUS_STYLES.pending
  const locked = shopOrder?.status === 'delivered' || shopOrder?.status === 'cancelled'

  return (
    <article className='grain card card-3d p-5'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='notranslate font-bold'>{data.user?.fullName || data.user?.name || 'Customer'}</p>
          <p className='mt-0.5 flex items-center gap-1.5 text-sm' style={{ color: 'var(--ink-muted)' }}>
            <MdPhone size={14} /> {data.user?.mobile}
          </p>
        </div>
        <span className='rounded-full px-3.5 py-1.5 text-xs font-black capitalize' style={tone}>
          {shopOrder?.status?.replace('_', ' ')}
        </span>
      </div>

      <p className='mt-3 text-sm' style={{ color: 'var(--ink-soft)' }}>{data?.deliveryAddress?.text}</p>
      <p className='mt-1 text-xs' style={{ color: 'var(--ink-muted)' }}>
        {data.paymentMethod === 'online'
          ? (data.payment ? t('owner.paidOnline', 'Paid online') : t('owner.pendingPayment', 'Online payment pending'))
          : `${t('owner.payCod', 'Cash on delivery')} · ₹${shopOrder?.subtotal || 0}`}
      </p>

      <div className='mt-3 flex gap-2 overflow-x-auto pb-2'>
        {shopOrder?.shopOrderItems?.map((item, index) => (
          <div key={index} className='w-32 shrink-0 overflow-hidden rounded-xl stagger-item' style={{ border: '1px solid var(--border)' }}>
            <img src={item.item?.image} alt='' className='h-20 w-full object-cover' />
            <div className='p-2'>
              <p className='truncate text-xs font-bold'>{item.name}</p>
              <p className='text-[11px]' style={{ color: 'var(--ink-muted)' }}>{item.quantity} × ₹{item.price}</p>
            </div>
          </div>
        ))}
      </div>

      {!locked && (
        <div className='mt-4 flex flex-wrap items-center gap-2' style={{ borderTop: '1px solid var(--border)', paddingTop: '0.9rem' }}>
          {shopOrder?.status === 'pending' && (
            <button className='btn-primary !px-4 !py-2 text-xs' onClick={() => handleUpdateStatus(data._id, shopId, 'preparing')}>
              {t('owner.startCooking', 'Start cooking')}
            </button>
          )}
          {shopOrder?.status === 'preparing' && (
            <button className='btn-primary !px-4 !py-2 text-xs' onClick={() => handleUpdateStatus(data._id, shopId, 'out of delivery')}>
              {t('owner.outForDelivery', 'Out for delivery')}
            </button>
          )}
          {(shopOrder?.status === 'pending' || shopOrder?.status === 'preparing') && (
            <button className='btn-ghost !px-4 !py-2 text-xs' onClick={handleCancelOrder} disabled={cancelling} style={{ color: 'var(--danger)' }}>
              {cancelling ? t('common.loading', 'Working…') : t('owner.cancelOrder', 'Cancel order')}
            </button>
          )}
          <span className='ml-auto font-display text-lg font-black' style={{ fontFamily: 'var(--font-display)' }}>₹{shopOrder?.subtotal}</span>
        </div>
      )}

      {shopOrder?.status === 'out of delivery' && (
        <div className='mt-3 rounded-2xl p-3 text-sm' style={{ background: 'var(--accent-2-soft)', color: 'var(--ink-soft)' }}>
          {shopOrder?.assignedDeliveryBoy
            ? <p>🛵 {shopOrder.assignedDeliveryBoy.fullName} · {shopOrder.assignedDeliveryBoy.mobile}</p>
            : availableBoys?.length > 0
              ? availableBoys.map((b, index) => <p key={index}>🛵 {b.fullName} · {b.mobile}</p>)
              : <p className='animate-breathe'>{t('owner.waitingRider', 'Waiting for a rider to accept…')}</p>}
        </div>
      )}

      {error && <p className='mt-3 text-sm font-semibold' style={{ color: 'var(--danger)' }}>{error}</p>}
    </article>
  )
}

export default OwnerOrderCard

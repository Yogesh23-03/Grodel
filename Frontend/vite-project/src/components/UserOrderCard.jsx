import axios from 'axios'
import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { serverUrl } from '../App'
import { updateRealtimeOrderStatus } from '../redux/userSlice'
import { HiOutlineReceiptPercent, HiOutlineFire } from 'react-icons/hi2'
import RecipeCard from './RecipeCard.jsx'

function UserOrderCard({ data }) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const [selectedRating, setSelectedRating] = useState({}) // itemId:rating
  const [cancellingId, setCancellingId] = useState("")
  const [recipeItem, setRecipeItem] = useState(null)

  const formatDate = (datestring) => {
    const date = new Date(datestring)
    return date.toLocaleString('en-GB', {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
  }

  const statusTone = (status) => {
    if (status === 'delivered') return 'badge-success'
    if (status === 'cancelled') return 'badge-danger'
    if (status === 'out of delivery') return 'badge-brand'
    return 'badge-warning'
  }

  /* The API can hand `shopOrders` back as a single object, so normalise once and
     read every status from that list. */
  const shopOrderList = Array.isArray(data?.shopOrders)
    ? data.shopOrders
    : data?.shopOrders ? [data.shopOrders] : []

  /* Tracking is only meaningful while a rider is actually carrying the food:
     a cancelled or fully delivered order has nothing left to follow. */
  const isCancelled = shopOrderList.some(shopOrder => shopOrder?.status === 'cancelled') || data?.status === 'cancelled'
  const isDelivered = (shopOrderList.length > 0 && shopOrderList.every(shopOrder => shopOrder?.status === 'delivered')) || data?.status === 'delivered'
  const isOutForDelivery = shopOrderList.some(shopOrder => shopOrder?.status === 'out of delivery')
  const canTrack = !isCancelled && !isDelivered && isOutForDelivery

  const handleRating = async (itemId, rating) => {
    const isAlreadySelected = selectedRating[itemId] === rating
    const newRating = isAlreadySelected ? 0 : rating // toggle off if same star clicked

    try {
      await axios.post(`${serverUrl}/api/item/rating`, { itemId, rating: newRating }, { withCredentials: true })
      setSelectedRating(prev => ({ ...prev, [itemId]: newRating }))
    } catch (error) {
      console.log(error)
    }
  }

  const handleCancelOrder = async (shopOrder) => {
    const confirmCancel = window.confirm("Are you sure you want to cancel this order?");
    if (!confirmCancel) return;

    setCancellingId(shopOrder._id);
    try {
      await axios.post(`${serverUrl}/api/order/cancel-order/${data._id}/${shopOrder._id}`, {}, { withCredentials: true });
      dispatch(updateRealtimeOrderStatus({
        orderId: data._id,
        shopId: shopOrder.shop._id,
        status: "cancelled"
      }));
    } catch (error) {
      alert(error.response?.data?.message || "Failed to cancel order");
    } finally {
      setCancellingId("");
    }
  }

  return (
    <article className='grain card card-3d card-hover card-3d p-4 space-y-4'>
      <div className='flex flex-wrap justify-between items-start gap-3 border-b pb-3' style={{ borderColor: 'var(--border)' }}>
        <div>
          <p className='font-bold'>
            <span className='t-eyebrow mr-1.5'>Order</span>#{data._id.slice(-6)}
          </p>
          <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>
            {formatDate(data.createdAt)}
          </p>
          {data.autoOrderSource && (
            <p className='badge badge-accent mt-1.5'>
              <HiOutlineReceiptPercent size={12} /> Auto-ordered ({data.autoOrderSource === 'default' ? 'default' : 'your selection'})
            </p>
          )}
        </div>
        <div className='text-right'>
          {data.paymentMethod == "cod"
            ? <p className='text-sm font-semibold' style={{ color: 'var(--ink-muted)' }}>{data.paymentMethod?.toUpperCase()}</p>
            : <p className='text-sm font-semibold' style={{ color: 'var(--ink-muted)' }}>Payment: {data.payment ? "paid" : "pending"}</p>}
          <span className={`badge ${statusTone(data.shopOrders?.[0]?.status)} mt-1`}>{data.shopOrders?.[0]?.status}</span>
        </div>
      </div>

      {shopOrderList.map((shopOrder, index) => (
        <div className='rounded-2xl p-3 space-y-3' style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }} key={index}>
          <p className='font-bold'>{shopOrder.shop.name}</p>

          <div className='flex space-x-3 overflow-x-auto pb-2'>
            {shopOrder.shopOrderItems.map((item, index) => (
              <div key={index} className='w-40 flex-shrink-0 rounded-2xl p-2 stagger-item' style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <img src={item.item.image} alt="" className='h-24 w-full rounded-xl object-cover' />
                <p className='mt-1 text-sm font-bold'>{item.name}</p>
                <p className='text-xs' style={{ color: 'var(--ink-muted)' }}>Qty: {item.quantity} × ₹{item.price}</p>

                {shopOrder.status == "delivered" && (
                  <div className='mt-2 flex space-x-1'>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        className='text-lg transition-transform active:scale-90'
                        style={{ color: selectedRating[item.item._id] >= star ? 'var(--warning)' : 'var(--ink-faint)' }}
                        onClick={() => handleRating(item.item._id, star)}
                        aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      >★</button>
                    ))}
                  </div>
                )}

                {/* A delivered dish is a recipe waiting to happen */}
                {shopOrder.status == "delivered" && (
                  <button
                    onClick={() => setRecipeItem(item.name)}
                    className='mt-2 flex items-center gap-1 text-[11px] font-bold transition-transform active:scale-95'
                    style={{ color: 'var(--vendor)' }}
                  >
                    <HiOutlineFire size={12} /> {t('recipe.cookItYourself')} →
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className='flex justify-between items-center border-t pt-2' style={{ borderColor: 'var(--border)' }}>
            <p className='font-semibold'>Subtotal: ₹{shopOrder.subtotal}</p>
            <div className='flex items-center gap-2'>
              <span className={`badge ${statusTone(shopOrder.status)}`}>{shopOrder.status}</span>
              {shopOrder.status !== "delivered" && shopOrder.status !== "cancelled" && (
                <button
                  className='rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95'
                  style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
                  onClick={() => handleCancelOrder(shopOrder)}
                  disabled={cancellingId === shopOrder._id}
                >
                  {cancellingId === shopOrder._id ? "Cancelling…" : "Cancel order"}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className='flex flex-wrap justify-between items-center gap-3 border-t pt-3' style={{ borderColor: 'var(--border)' }}>
        <p className='font-display text-lg font-black' style={{ fontFamily: 'var(--font-display)' }}>₹{data.totalAmount}</p>
        <div className='flex items-center gap-2'>
          {canTrack && (
            <button className='btn-primary !px-4 !py-2 text-xs' onClick={() => navigate(`/track-order/${data._id}`)}>
              {t('orders.trackOrder', 'Track order')}
            </button>
          )}
          {isCancelled && (
            <span className='badge badge-danger px-4 py-1.5'>{t('orders.cancelled', 'Cancelled')}</span>
          )}
        </div>
      </div>

      <RecipeCard itemName={recipeItem} isOpen={!!recipeItem} onClose={() => setRecipeItem(null)} />
    </article>
  )
}
export default UserOrderCard

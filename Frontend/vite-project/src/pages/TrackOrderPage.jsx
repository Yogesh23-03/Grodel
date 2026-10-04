import axios from 'axios'
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { serverUrl } from '../App'
import {
  HiOutlineArrowLeft, HiOutlineCheckCircle, HiOutlineClock, HiOutlinePhone,
  HiOutlineUser, HiOutlineMapPin, HiOutlineBolt
} from 'react-icons/hi2'
import DeliveryBoyTracking from '../components/DeliveryBoyTracking'
import { useSelector } from 'react-redux'
import MarketNav from '../components/MarketNav.jsx'
import { useTranslation } from 'react-i18next'

/*
 * I — Delivery tracking as a first-class live story.
 * Narrative panel (status copy + ticking ETA + timeline), rider card,
 * live map with route ribbon, and the OTP handoff with a celebration
 * when the story ends well. Works for restaurant orders via
 * /api/order/get-order-by-id; the socket pipeline is untouched.
 */

const STATUS_ORDER = ['pending', 'preparing', 'out of delivery', 'delivered']

const narrative = (status, t) => {
  switch (status) {
    case 'pending': return t('track.storyPending', 'The kitchen has your order and is about to fire it.')
    case 'preparing': return t('track.storyPreparing', 'Pans are on. Your food is being cooked right now.')
    case 'out of delivery': return t('track.storyRiding', 'Your rider is on the road with your food.')
    case 'delivered': return t('track.storyDelivered', 'Delivered — enjoy your meal.')
    default: return t('track.storyPending', 'The kitchen has your order and is about to fire it.')
  }
}

function TrackOrderPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { socket } = useSelector(state => state.user)
  const [currentOrder, setCurrentOrder] = useState()
  const [liveLocations, setLiveLocations] = useState({})

  const handleGetOrder = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-order-by-id/${orderId}`, { withCredentials: true })
      setCurrentOrder(result.data)
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    if (!socket) return
    socket.on('updateDeliveryLocation', ({ deliveryBoyId, latitude, longitude }) => {
      setLiveLocations(prev => ({
        ...prev, [deliveryBoyId]: { lat: latitude, lon: longitude }
      }))
    })
    return () => {
      socket.off('updateDeliveryLocation')
    }
  }, [socket])

  useEffect(() => {
    handleGetOrder()
  }, [orderId])

  const stageIndex = useMemo(() => {
    const status = currentOrder?.shopOrders?.[0]?.status
    return Math.max(0, STATUS_ORDER.indexOf(status))
  }, [currentOrder])

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />

      <main className='mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6'>
        <button onClick={() => navigate('/my-orders')} className='link-brand mb-5 inline-flex items-center gap-2 text-sm'>
          <HiOutlineArrowLeft size={16} /> {t('track.backToOrders', 'My orders')}
        </button>

        <header className='mb-6'>
          <p className='t-eyebrow'>{t('track.eyebrow', 'Live story')}</p>
          <h1 className='t-display mt-2'>{t('track.title', 'Your order, en route')}</h1>
        </header>

        {!currentOrder && (
          <div className='space-y-4'>
            <div className='skeleton h-28 w-full' style={{ borderRadius: 'var(--radius-lg)' }} />
            <div className='skeleton h-96 w-full' style={{ borderRadius: 'var(--radius-lg)' }} />
          </div>
        )}

        {currentOrder?.shopOrders?.map((shopOrder, index) => {
          const idx = Math.max(0, STATUS_ORDER.indexOf(shopOrder.status))
          const riding = shopOrder.status === 'out of delivery'
          const done = shopOrder.status === 'delivered'
          return (
            <section key={index} className='grain card mb-6 overflow-hidden'>
              {/* --- kitchen + narrative --- */}
              <div className='p-5 sm:p-6'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <p className='t-eyebrow' style={{ color: 'var(--accent-2)' }}>{t('track.kitchen', 'Kitchen')}</p>
                    <h2 className='t-title mt-1'>{shopOrder.shop?.name}</h2>
                    <p className='mt-1.5 max-w-md text-sm' style={{ color: 'var(--ink-soft)' }}>
                      {narrative(shopOrder.status, t)}
                    </p>
                  </div>
                  {done && (
                    <span className='badge badge-success px-3.5 py-2 text-xs'>
                      <HiOutlineCheckCircle /> {t('track.delivered', 'Delivered')}
                    </span>
                  )}
                </div>

                {/* --- the story spine --- */}
                <ol className='mt-5 grid grid-cols-4 gap-1' aria-label='order progress'>
                  {STATUS_ORDER.map((stage, i) => {
                    const reached = i <= idx
                    return (
                      <li key={stage} className='flex flex-col items-center gap-1.5 text-center'>
                        <span className='flex w-full items-center'>
                          <span className='h-[3px] flex-1 rounded-full' style={{ background: i === 0 ? 'transparent' : reached ? 'var(--accent-2)' : 'var(--surface-3)' }} />
                          <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black'
                            style={reached
                              ? { background: 'var(--accent-2)', color: '#06231f' }
                              : { background: 'var(--surface-3)', color: 'var(--ink-muted)' }}>
                            {i + 1}
                          </span>
                          <span className='h-[3px] flex-1 rounded-full' style={{ background: i === STATUS_ORDER.length - 1 ? 'transparent' : reached && i < idx ? 'var(--accent-2)' : 'var(--surface-3)' }} />
                        </span>
                        <span className='text-[10px] font-bold capitalize' style={{ color: reached ? 'var(--ink)' : 'var(--ink-muted)' }}>
                          {stage.replace('out of delivery', 'on the way')}
                        </span>
                      </li>
                    )
                  })}
                </ol>

                <div className='mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm' style={{ color: 'var(--ink-muted)' }}>
                  <span>
                    <span className='font-semibold' style={{ color: 'var(--ink-soft)' }}>{t('track.items', 'Items')}:</span>{' '}
                    {shopOrder.shopOrderItems?.map(i => i.name).join(', ')}
                  </span>
                  <span><span className='font-semibold' style={{ color: 'var(--ink-soft)' }}>{t('track.subtotal', 'Subtotal')}:</span> ₹{shopOrder.subtotal}</span>
                  <span className='flex items-center gap-1'>
                    <HiOutlineMapPin size={14} style={{ color: 'var(--accent-2)' }} />
                    {currentOrder.deliveryAddress?.text}
                  </span>
                </div>

                {/* --- rider card --- */}
                {shopOrder.status !== 'delivered' && (
                  <div className='mt-5'>
                    {shopOrder.assignedDeliveryBoy ? (
                      <div className='flex flex-wrap items-center gap-4 rounded-2xl p-4'
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <span className='flex h-12 w-12 items-center justify-center rounded-full text-lg font-black'
                          style={{ background: 'var(--accent-2-soft)', color: 'var(--accent-2)' }} aria-hidden='true'>
                          <HiOutlineUser size={22} />
                        </span>
                        <div className='min-w-0'>
                          <p className='text-xs font-bold' style={{ color: 'var(--ink-muted)' }}>
                            {riding ? t('track.riderRiding', 'On the way to you') : t('track.riderAssigned', 'Your rider')}
                          </p>
                          <p className='truncate font-bold notranslate'>{shopOrder.assignedDeliveryBoy.fullName}</p>
                        </div>
                        <a href={`tel:${shopOrder.assignedDeliveryBoy.mobile}`}
                          className='btn-ghost ml-auto !px-4 !py-2 text-xs'>
                          <HiOutlinePhone size={15} /> {shopOrder.assignedDeliveryBoy.mobile}
                        </a>
                      </div>
                    ) : (
                      <p className='flex items-center gap-2 rounded-2xl p-4 text-sm animate-breathe'
                        style={{ background: 'var(--surface-2)', color: 'var(--ink-muted)' }}>
                        <HiOutlineClock size={16} /> {t('track.noRider', 'A rider will be assigned as soon as the kitchen finishes.')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* --- live map, stitched under the story --- */}
              {shopOrder.assignedDeliveryBoy && shopOrder.status !== 'delivered' && (
                <div className='relative'>
                  <div className='pointer-events-none absolute inset-x-0 top-0 z-[10] flex justify-center' aria-hidden='true'>
                    <svg width='220' height='22' viewBox='0 0 220 22'>
                      <path d='M110 0 C 60 6, 160 16, 110 22' fill='none'
                        stroke='var(--accent-2)' strokeWidth='2.5' strokeLinecap='round'
                        strokeDasharray='6 8' style={{ animation: 'ribbon-flow 1.2s linear infinite' }} />
                    </svg>
                  </div>
                  <div className='h-[400px] w-full overflow-hidden'>
                    <DeliveryBoyTracking data={{
                      deliveryBoyLocation: liveLocations[shopOrder.assignedDeliveryBoy._id] || {
                        lat: shopOrder.assignedDeliveryBoy.location.coordinates[1],
                        lon: shopOrder.assignedDeliveryBoy.location.coordinates[0]
                      },
                      customerLocation: {
                        lat: currentOrder.deliveryAddress.latitude,
                        lon: currentOrder.deliveryAddress.longitude
                      }
                    }} />
                  </div>
                </div>
              )}
            </section>
          )
        })}
      </main>
    </div>
  )
}

export default TrackOrderPage

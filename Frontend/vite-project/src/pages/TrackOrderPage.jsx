import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { serverUrl } from '../App'
import {
  HiOutlineArrowLeft, HiOutlineCheckCircle, HiOutlineClock, HiOutlinePhone,
  HiOutlineUser, HiOutlineMapPin, HiOutlineBolt
} from 'react-icons/hi2'
import DeliveryBoyTracking from '../components/DeliveryBoyTracking'
import { useSelector } from 'react-redux'
import MarketNav from '../components/MarketNav.jsx'
import WaitEngagementPage from './WaitEngagementPage.jsx'
import { useTranslation } from 'react-i18next'

/*
 * I — Delivery tracking as a first-class live story.
 * Narrative panel (status copy + ticking ETA + timeline), rider card,
 * live map with route ribbon, and the OTP handoff with a celebration
 * when the story ends well. Works for restaurant orders via
 * /api/order/get-order-by-id; the socket pipeline is untouched.
 */

const STATUS_ORDER = ['pending', 'preparing', 'out of delivery', 'delivered']

/* Stages where the customer is still waiting — the engagement hub only earns
   its place on screen while there is a wait to fill. */
const WAITING_STATUSES = ['pending', 'preparing', 'out of delivery']

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
  const { socket, userData, currentCity } = useSelector(state => state.user)
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

  /* Any shop order still in flight keeps the games on screen; once every part
     of the order is delivered or cancelled it disappears. */
  const isWaiting = Boolean(currentOrder?.shopOrders?.some(shopOrder => WAITING_STATUSES.includes(shopOrder.status)))

  const firstShopOrder = currentOrder?.shopOrders?.[0]

  return (
    <div className='relative min-h-screen lg:pl-[76px]'>
      {/* The market keeps drifting past while the order is on its way. */}
      <div className='pointer-events-none fixed inset-0 z-0 overflow-hidden' aria-hidden='true'>
        <span className='food-float-1 notranslate absolute left-[5%] top-[12%] text-3xl opacity-15 sm:text-4xl'>🍕</span>
        <span className='food-float-2 notranslate absolute right-[7%] top-[22%] text-3xl opacity-15' style={{ animationDelay: '1.2s' }}>🥞</span>
        <span className='food-drift notranslate absolute bottom-[18%] left-[12%] text-2xl opacity-15 sm:text-3xl' style={{ animationDelay: '2s' }}>🍱</span>
        <span className='food-float-3 notranslate absolute bottom-[26%] right-[10%] text-2xl opacity-10' style={{ animationDelay: '0.6s' }}>🥗</span>
      </div>
      <MarketNav />

      <main className='relative z-10 mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6'>
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
            <section key={index} className='grain card mb-6 overflow-hidden card-3d stagger-item' style={{ animationDelay: `${index * 80}ms` }}>
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

                {/* Kitchen's cooking: a scooter carrying the box rides across
                    while the order is still pending or being prepared. */}
                {['pending', 'preparing'].includes(shopOrder.status) && (
                  <div style={{
                    overflow: 'hidden', position: 'relative',
                    height: 72, margin: '1rem 0',
                    pointerEvents: 'none'
                  }} aria-hidden='true'>
                    <div className='scooter-ride'
                      style={{ position: 'absolute', bottom: 0,
                               display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ fontSize: '1.4rem', marginBottom: 24,
                                     animation: 'floatY2 1s ease-in-out infinite' }}>
                        ♨️
                      </span>
                      <span style={{ fontSize: '2.5rem' }}>🛵</span>
                      <span style={{ fontSize: '1.6rem', marginBottom: 8 }}>🍱</span>
                    </div>
                  </div>
                )}

                {/* --- the kitchen, with the food still on its way --- */}
                {(shopOrder.status === 'pending' || shopOrder.status === 'preparing') && (
                  <div style={{
                    overflow: 'hidden', position: 'relative',
                    height: 72, margin: '1rem 0',
                    pointerEvents: 'none'
                  }} aria-hidden='true'>
                    <div className='anim-scooter'
                      style={{ position: 'absolute', bottom: 0, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ fontSize: '1.3rem', marginBottom: 26, animation: 'floatB 1.1s ease-in-out infinite' }}>♨️</span>
                      <span style={{ fontSize: '2.4rem' }}>🛵</span>
                      <span style={{ fontSize: '1.5rem', marginBottom: 8 }}>🍱</span>
                    </div>
                  </div>
                )}

                {/* --- the rider, mid-run --- */}
                <div className='mt-5 rounded-2xl px-3 py-2' style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <p className='text-[10px] font-bold uppercase tracking-wide' style={{ color: 'var(--ink-muted)' }}>
                    {done ? t('track.scooterDone', 'Delivered to your door') : t('track.scooterLabel', 'Your rider, on the road')}
                  </p>
                  <span className='relative mt-1 block h-7 w-full' aria-hidden='true'>
                    <span className='absolute left-0 right-0 top-1/2 border-t border-dashed' style={{ borderColor: 'var(--border-strong)' }} />
                    <span className={`notranslate absolute top-0 text-xl ${riding ? 'scooter-ride' : ''}`}
                      style={riding ? undefined : { left: 'calc(50% - 0.875rem)' }}>🛵</span>
                  </span>
                </div>

                {/* --- the story spine --- */}
                <ol className='mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-1' aria-label='order progress'>
                  {STATUS_ORDER.map((stage, i) => {
                    const reached = i <= idx
                    return (
                      <li key={stage} className='flex flex-col items-center gap-1.5 text-center stagger-item' style={{ animationDelay: `${i * 80}ms` }}>
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

        {isWaiting && (
          <WaitEngagementPage
            orderId={currentOrder?._id || orderId}
            dishName={firstShopOrder?.shopOrderItems?.[0]?.name}
            restaurantName={firstShopOrder?.shop?.name}
            city={userData?.city || currentCity}
          />
        )}
      </main>
    </div>
  )
}

export default TrackOrderPage

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  HiOutlineBuildingStorefront, HiOutlinePencilSquare, HiOutlinePlusCircle,
  HiOutlineChartBar, HiOutlineBellAlert, HiOutlineTruck, HiOutlineFire,
  HiOutlineSparkles, HiOutlineInboxStack, HiOutlinePercentBadge
} from 'react-icons/hi2'
import axios from 'axios'
import { serverUrl } from '../App'
import { setMyShopData } from '../redux/ownerSlice'
import MarketNav from './MarketNav.jsx'
import OwnerItemCard from './OwnerItemCard.jsx'
import OwnerOrderCard from './OwnerOrderCard.jsx'

/*
 * OWNER — "The Kitchen Studio": today's ledger in bento tiles, a live
 * order dock fed by the existing `newOrder` socket (subtle pulse, no
 * refresh), menu management, and delivery tracking inline.
 */

function OwnerDashboard() {
  const { myShopData } = useSelector(state => state.owner)
  const { userData, socket } = useSelector(state => state.user)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { t } = useTranslation()

  const [myOrders, setMyOrders] = useState([])
  const [incomingCount, setIncomingCount] = useState(0)
  const [pulseId, setPulseId] = useState(null)
  const pulseTimer = useRef(null)

  /* Shop-wide discount controls */
  const [bulkDiscount, setBulkDiscount] = useState('')
  const [applyingBulk, setApplyingBulk] = useState(false)
  const [discountMessage, setDiscountMessage] = useState('')

  const loadOrders = () => axios.get(`${serverUrl}/api/order/my-orders`, { withCredentials: true })
    .then(res => setMyOrders(res.data || []))
    .catch(() => {})

  useEffect(() => { loadOrders() }, [])

  /* The discount endpoints return counts, not the shop, so pull the shop again
     after a change — otherwise the menu would still show the old prices. */
  const reloadShop = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/shop/getmy`, { withCredentials: true })
      dispatch(setMyShopData(result.data))
    } catch (error) {
      console.error('reload shop failed:', error.message)
    }
  }

  const applyBulkDiscount = async () => {
    const percent = Number(bulkDiscount)
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setDiscountMessage(t('owner.discountInvalid', 'Enter a discount between 0 and 100'))
      return
    }
    setApplyingBulk(true)
    setDiscountMessage('')
    try {
      const result = await axios.patch(`${serverUrl}/api/item/discount-all`,
        { discountPercent: percent, shopId: myShopData?._id }, { withCredentials: true })
      await reloadShop()
      setDiscountMessage(t('owner.discountApplied', {
        defaultValue: 'Discount applied to {{count}} item(s)',
        count: result.data?.updated ?? 0
      }))
      setBulkDiscount('')
    } catch (error) {
      setDiscountMessage(error?.response?.data?.message || t('owner.discountFailed', 'Could not apply the discount'))
    } finally {
      setApplyingBulk(false)
    }
  }

  /* Live: new orders arrive without refresh, with a one-shot pulse */
  useEffect(() => {
    if (!socket || userData?.role !== 'owner') return
    const onNewOrder = (data) => {
      setIncomingCount(count => count + 1)
      setPulseId(data?._id || 'incoming')
      window.clearTimeout(pulseTimer.current)
      pulseTimer.current = window.setTimeout(() => setPulseId(null), 3200)
      loadOrders()
    }
    socket.on('newOrder', onNewOrder)
    return () => socket.off('newOrder', onNewOrder)
  }, [socket, userData?.role])

  useEffect(() => () => window.clearTimeout(pulseTimer.current), [])

  /* The order book can hand `shopOrders` back as a single object (the API picks
     the one shop order that belongs to this owner) or as an array, so it is
     normalised before anything calls .map/.length — an object here used to throw
     "order.shopOrders.map is not a function" and take the whole dashboard down. */
  const asShopOrderArray = (shopOrders) => Array.isArray(shopOrders)
    ? shopOrders
    : shopOrders ? [shopOrders] : []

  const orders = useMemo(() => myOrders
    .filter(order => order?.shopOrders)
    .flatMap(order => asShopOrderArray(order.shopOrders).map(shopOrder => ({ order, shopOrder }))), [myOrders])

  const activeOrders = orders.filter(({ shopOrder }) => ['pending', 'preparing', 'out of delivery'].includes(shopOrder?.status))
  const pendingPrep = orders.filter(({ shopOrder }) => shopOrder?.status === 'pending').length
  const outForDelivery = orders.filter(({ shopOrder }) => shopOrder?.status === 'out of delivery').length
  const todayRevenue = useMemo(() => {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
    return orders
      .filter(({ shopOrder }) => ['delivered', 'out of delivery', 'preparing'].includes(shopOrder?.status))
      .reduce((sum, { order }) => {
        const shopsInOrder = asShopOrderArray(order.shopOrders).length
        return sum + (order.totalAmount || 0) / Math.max(1, shopsInOrder)
      }, 0)
  }, [orders])
  const topItems = useMemo(() => {
    const counts = {}
    activeOrders.concat(orders).forEach(({ shopOrder }) => {
      (shopOrder?.shopOrderItems || []).forEach(item => {
        counts[item.name] = (counts[item.name] || 0) + (item.quantity || 1)
      })
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [orders])

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />

      <main className='mx-auto w-full max-w-[1100px] px-4 pb-20 pt-6 sm:px-6'>
        {!myShopData ? (
          /* ---------- no shop yet: a doorway, not a form ---------- */
          <section className='grain card card-3d mx-auto mt-10 max-w-md p-5 sm:p-8 lg:p-10 text-center'>
            <span className='mx-auto flex h-16 w-16 items-center justify-center rounded-2xl' style={{ background: 'var(--accent-2-soft)', color: 'var(--accent-2)' }}>
              <HiOutlineBuildingStorefront size={30} />
            </span>
            <h2 className='t-title mt-5'>{t('owner.noShopTitle', 'Open your kitchen on GroDel')}</h2>
            <p className='mx-auto mt-2 max-w-sm text-sm' style={{ color: 'var(--ink-soft)' }}>
              {t('owner.noShopCopy', 'Set up your storefront once — then neighbours order, and the market does the rest.')}
            </p>
            <button className='btn-primary mt-6' onClick={() => navigate('/create-edit-shop')}>
              {t('owner.getStarted', 'Open my kitchen')}
            </button>
          </section>
        ) : (
          <>
            {/* ---------- masthead ---------- */}
            <header className='flex flex-wrap items-end justify-between gap-4'>
              <div>
                <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--accent-2)' }}>
                  <HiOutlineFire /> {t('owner.studioEyebrow', 'Kitchen studio')}
                </p>
                <h1 className='t-display mt-2'>
                  {t('owner.welcome', 'Welcome to')} <span className='gradient-text'>{myShopData.name}</span>
                </h1>
                <p className='mt-1 text-sm' style={{ color: 'var(--ink-soft)' }}>
                  {myShopData.city}, {myShopData.state} · {t('owner.manageLine', 'orders arrive here live')}
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <button className='btn-ghost' onClick={() => navigate('/my-analysis')}>
                  <HiOutlineSparkles /> {t('owner.myAnalysis', 'My analysis')}
                </button>
                <button className='btn-ghost' onClick={() => navigate('/my-bulk-orders')}>
                  <HiOutlineInboxStack /> {t('owner.viewBulkOrders', 'Bulk orders')}
                </button>
                <button className='btn-ghost' onClick={() => navigate('/create-edit-shop')}>
                  <HiOutlinePencilSquare /> {t('owner.editShop', 'Edit shop')}
                </button>
                <button className='btn-primary' onClick={() => navigate('/add-item')}>
                  <HiOutlinePlusCircle /> {t('owner.addItem', 'Add item')}
                </button>
              </div>
            </header>

            {/* ---------- live order pulse ---------- */}
            {pulseId && (
              <div className='animate-soft-pulse mt-5 flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-bold'
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)', boxShadow: 'var(--shadow-lime)' }}>
                <HiOutlineBellAlert size={20} />
                {t('owner.newOrderBanner', 'A new order just landed — check the dock below.')}
              </div>
            )}

            {/* ---------- bento ledger ---------- */}
            <div className='stagger mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4'>
              <div className='tile tile-eat grain p-5'>
                <p className='t-eyebrow'>{t('owner.todayRevenue', "Today's revenue")}</p>
                <p className='mt-2 font-display text-3xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-2)' }}>
                  ₹{Math.round(todayRevenue)}
                </p>
              </div>
              <div className='tile grain p-5' style={{ '--tile-tint': 'var(--accent-soft)' }}>
                <p className='t-eyebrow'>{t('owner.pendingPrep', 'Pending prep')}</p>
                <p className='mt-2 font-display text-3xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
                  {pendingPrep}
                </p>
              </div>
              <div className='tile grain p-5' style={{ '--tile-tint': 'var(--vendor-soft)' }}>
                <p className='t-eyebrow'>{t('owner.onTheRoad', 'On the road')}</p>
                <p className='mt-2 font-display text-3xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--vendor)' }}>
                  {outForDelivery}
                </p>
              </div>
              <div className='tile grain p-5' style={{ '--tile-tint': 'var(--plan-soft)' }}>
                <p className='t-eyebrow'>{t('owner.activeOrders', 'Active orders')}</p>
                <p className='mt-2 font-display text-3xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--plan)' }}>
                  {activeOrders.length}
                </p>
              </div>
            </div>

            {/* ---------- live order dock ---------- */}
            <section className='mt-8'>
              <div className='flex items-center justify-between gap-3'>
                <h2 className='t-title flex items-center gap-2'>
                  <HiOutlineBellAlert style={{ color: 'var(--accent-2)' }} /> {t('owner.orderDock', 'Live order dock')}
                  {incomingCount > 0 && <span className='badge badge-brand px-2.5 py-1'>{incomingCount}</span>}
                </h2>
                <button onClick={() => navigate('/my-orders')} className='link-brand text-sm'>
                  {t('owner.viewAll', 'Open order book')} →
                </button>
              </div>

              <div className='mt-4 space-y-4'>
                {orders.length === 0 && (
                  <div className='card p-5 sm:p-8 lg:p-10 text-center card-3d' style={{ color: 'var(--ink-muted)' }}>
                    {t('owner.noOrders', 'No orders yet today. The pans are warming up.')}
                  </div>
                )}
                {activeOrders.length === 0 && orders.length > 0 && (
                  <div className='card p-8 text-center card-3d' style={{ color: 'var(--ink-muted)' }}>
                    {t('owner.allCaughtUp', 'All caught up — every order is delivered.')}
                  </div>
                )}
                {activeOrders.slice(0, 6).map(({ order, shopOrder }) => (
                  <OwnerOrderCard data={order} key={`${order._id}-${shopOrder._id}`} />
                ))}
              </div>
            </section>

            {/* ---------- top items + delivery line ---------- */}
            {topItems.length > 0 && (
              <section className='tile grain mt-8 p-6' style={{ '--tile-tint': 'var(--accent-2-soft)' }}>
                <p className='t-eyebrow flex items-center gap-1.5' style={{ color: 'var(--accent-2)' }}>
                  <HiOutlineChartBar /> {t('owner.topItems', 'Most loved this stretch')}
                </p>
                <div className='mt-4 flex flex-wrap gap-2'>
                  {topItems.map(([name, count]) => (
                    <span key={name} className='rounded-full px-3.5 py-1.5 text-sm font-bold'
                      style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)', border: '1px solid var(--border)' }}>
                      {name} · {count}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {outForDelivery > 0 && (
              <p className='mt-4 flex items-center gap-2 text-sm' style={{ color: 'var(--ink-soft)' }}>
                <HiOutlineTruck style={{ color: 'var(--vendor)' }} />
                {t('owner.roadHint', '{{count}} order(s) are out with riders right now.', { count: outForDelivery })}
              </p>
            )}

            {/* ---------- menu management ---------- */}
            <section className='mt-10'>
              <div className='flex items-center justify-between gap-3'>
                <h2 className='t-title'>{t('owner.menu', 'Your menu')}</h2>
                <button onClick={() => navigate('/add-item')} className='link-brand text-sm'>
                  <HiOutlinePlusCircle className='inline' /> {t('owner.addItem', 'Add item')}
                </button>
              </div>

              {/* ---------- shop-wide discount ---------- */}
              <div className='mt-4 flex flex-wrap items-center gap-3 rounded-2xl p-4'
                style={{ background: 'var(--warning-soft)' }}>
                <HiOutlinePercentBadge size={22} style={{ color: 'var(--warning)' }} />
                <input
                  type='number'
                  min='0'
                  max='100'
                  value={bulkDiscount}
                  onChange={event => setBulkDiscount(event.target.value)}
                  placeholder={t('owner.bulkDiscountPlaceholder', 'Apply % discount to ALL items')}
                  aria-label={t('owner.bulkDiscountPlaceholder', 'Apply % discount to ALL items')}
                  className='w-full px-3 py-2 text-sm sm:w-52'
                />
                <button type='button' onClick={applyBulkDiscount} disabled={applyingBulk || bulkDiscount === ''}
                  className='btn-primary'>
                  {t('owner.applyToAll', 'Apply to all')}
                </button>
                {discountMessage && (
                  <p className='text-xs font-bold' style={{ color: 'var(--ink-soft)' }}>{discountMessage}</p>
                )}
              </div>

              <div className='glass-panel mt-4 overflow-hidden'>
                <img src={myShopData.image} alt={myShopData.name} className='h-44 w-full object-cover sm:h-56' />
                <div className='p-5'>
                  <p className='font-display text-xl font-semibold' style={{ fontFamily: 'var(--font-display)' }}>{myShopData.name}</p>
                  <p className='mt-0.5 text-sm' style={{ color: 'var(--ink-muted)' }}>{myShopData.address}</p>
                </div>
              </div>

              {myShopData.items.length === 0 ? (
                <div className='grain card card-3d mt-4 p-5 sm:p-8 lg:p-10 text-center'>
                  <span className='text-4xl' aria-hidden='true'>🥘</span>
                  <p className='mt-3' style={{ color: 'var(--ink-muted)' }}>
                    {t('owner.noItems', 'The menu is empty — add your first dish.')}
                  </p>
                </div>
              ) : (
                <div className='stagger mt-4 space-y-4'>
                  {myShopData.items.map((item, index) => <OwnerItemCard data={item} key={index} />)}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default OwnerDashboard

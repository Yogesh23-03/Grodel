import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { HiOutlineArrowLeft, HiOutlineDocumentText } from 'react-icons/hi2'
import UserOrderCard from '../components/UserOrderCard'
import OwnerOrderCard from '../components/OwnerOrderCard'
import MarketNav from '../components/MarketNav.jsx'
import { addMyOrder, setMyOrders, updateRealtimeOrderStatus } from '../redux/userSlice'
import { serverUrl } from '../App'
import useScrollReveal from '../hooks/useScrollReveal.js'

function MyOrders() {
  const { userData, myOrders, socket } = useSelector(state => state.user)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const headingRef = useScrollReveal()

  useEffect(() => {
    const fetchOrders = async () => {
      if (!userData?._id) return
      try {
        const result = await axios.get(`${serverUrl}/api/order/my-orders`, { withCredentials: true })
        dispatch(setMyOrders(result.data || []))
      } catch (error) {
        console.log(error)
      }
    }
    fetchOrders()
  }, [dispatch, userData?._id])

  useEffect(() => {
    socket?.on('newOrder', (data) => {
      const ownerId = data.shopOrders?.owner?._id || data.shopOrders?.owner
      if (ownerId == userData?._id) {
        dispatch(addMyOrder(data))
      }
    })

    // MyOrders.jsx - backend sends {orderId, shopId, status} — no userId
    socket?.on('update-status', ({ orderId, shopId, status }) => {
      dispatch(updateRealtimeOrderStatus({ orderId, shopId, status }))
    })

    return () => {
      socket?.off('newOrder')
      socket?.off('update-status')
    }
  }, [socket, dispatch, userData?._id])

  /* `shopOrders` can arrive as a single object instead of an array, so test for
     content rather than truthiness before handing the order to a card. */
  const visibleOrders = (myOrders || []).filter(order => {
    if (!order?.shopOrders) return false
    return Array.isArray(order.shopOrders)
      ? order.shopOrders.length > 0
      : Boolean(order.shopOrders)
  })

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />

      <main className='mx-auto w-full max-w-[800px] px-4 pb-20 pt-6 sm:px-6'>
        <header ref={headingRef} className='flex items-center gap-3'>
          <button onClick={() => navigate("/")} className='btn-ghost !h-10 !w-10 !p-0' aria-label={t('common.back', 'Back')}>
            <HiOutlineArrowLeft size={18} />
          </button>
          <div>
            <p className='t-eyebrow'>{t('orders.eyebrow', 'Your table history')}</p>
            <h1 className='t-title mt-0.5'>{t('orders.myOrders', 'My orders')}</h1>
          </div>
        </header>

        <div className='stagger mt-6 space-y-6'>
          {visibleOrders.map((order, index) => (
            userData.role === "user"
              ? <UserOrderCard data={order} key={index} />
              : userData.role === "owner"
                ? <OwnerOrderCard data={order} key={index} />
                : null
          ))}
          {visibleOrders.length === 0 && (
            <div className='grain card card-3d p-12 text-center'>
              <span className='mode-eat mx-auto flex h-20 w-20 items-center justify-center rounded-full'>
                <HiOutlineDocumentText className='text-3xl' />
              </span>
              <p className='mt-4 font-bold'>{t('orders.empty', 'No orders yet.')}</p>
              <p className='mt-1 text-sm' style={{ color: 'var(--ink-muted)' }}>
                {t('orders.emptyHint', 'Your first meal is one tap away.')}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default MyOrders

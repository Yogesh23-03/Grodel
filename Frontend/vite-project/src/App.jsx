import React, { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { io } from 'socket.io-client'
import { useLanguage } from './context/LanguageContext.jsx'
import { useTranslation } from 'react-i18next'


import SignUp from './pages/SignUp.jsx'
import SignIn from './pages/SignIn.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Home from './pages/Home.jsx'
import LandingPage from './pages/LandingPage.jsx'
import CreateEditShop from './pages/CreateEditShop.jsx'
import AddItem from './pages/AddItem.jsx'
import EditItem from './pages/EditItem.jsx'
import CartPage from './pages/CartPage.jsx'
import CheckOut from './pages/CheckOut.jsx'
import OrderPlaced from './pages/OrderPlaced.jsx'
import MyOrders from './pages/MyOrders.jsx'
import TrackOrderPage from './pages/TrackOrderPage.jsx'
import Shop from './pages/Shop.jsx'
import DonateFoodPage from './pages/DonateFoodPage.jsx'
import MyDonationsPage from './pages/MyDonationsPage.jsx'
import TrustsPage from './pages/TrustsPage.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import GroupOrderPage from './pages/GroupOrderPage.jsx'
import JoinGroupOrderPage from './pages/JoinGroupOrderPage.jsx'
import StartGroupOrderPage from './pages/StartGroupOrderPage.jsx'
import MyGroupOrdersPage from './pages/MyGroupOrdersPage.jsx'
import VendorPortalPage from './pages/VendorPortalPage.jsx'
import VendorRegisterPage from './pages/VendorRegisterPage.jsx'
import AddProducePage from './pages/AddProducePage.jsx'
import VendorDashboardPage from './pages/VendorDashboardPage.jsx'
import NearbyVendorsPage from './pages/NearbyVendorsPage.jsx'
import VendorShopPage from './pages/VendorShopPage.jsx'
import HelperRegisterPage from './pages/HelperRegisterPage.jsx'
import MealSchedulePage from './pages/MealSchedulePage.jsx'
import FarmerDashboardPage from './pages/FarmerDashboardPage.jsx'
import FarmerOrdersPage from './pages/FarmerOrdersPage.jsx'
import FarmerEarningsPage from './pages/FarmerEarningsPage.jsx'
import FarmerAssistantPage from './pages/FarmerAssistantPage.jsx'
import InboxPage from './pages/InboxPage.jsx'
import BuyerOnboardPage from './pages/BuyerOnboardPage.jsx'
import BuyerMatchesPage from './pages/BuyerMatchesPage.jsx'
import BuyerPurchasesPage from './pages/BuyerPurchasesPage.jsx'
import BulkOrderPage from './pages/BulkOrderPage.jsx'
import MyBulkOrdersPage from './pages/MyBulkOrdersPage.jsx'
import BusinessAnalysisPage from './pages/BusinessAnalysisPage.jsx'

import Chatbot from './components/Chatbot.jsx'

import GetCurrentUser from './hooks/GetCurrentUser.jsx'
import useGetCity from './hooks/GetCity.jsx'
import GetMyshop from './hooks/GetMyShop.jsx'
import GetShopByCity from './hooks/GetShopByCity.jsx'
import GetItemsByCity from './hooks/GetItemByCity.jsx'
import GetMyOrders from './hooks/GetMyOrders.jsx'
import useUpdateLocation from './hooks/UseUpdateLocation.jsx'

import { setSocket } from './redux/userSlice'

// Local dev talks to the Express API on :8000 by default; a deployment just
// sets VITE_SERVER_URL (e.g. https://api.example.com) — no code change needed.
// VITE_API_URL is still honoured so existing deploys keep working.
export const serverUrl = import.meta.env.VITE_SERVER_URL
  || import.meta.env.VITE_API_URL
  || "http://localhost:8000"

/*
 * RoleGuard — role-specific routes used to repeat the same ternary in every
 * element. Centralising it means a new role-restricted page cannot forget the
 * check, and a wrong role always lands somewhere sensible instead of a blank
 * screen.
 */
const RoleGuard = ({ allowed, children }) => {
  const role = useSelector(state => state.user.userData?.role)
  if (!allowed.includes(role)) return <Navigate to='/home' replace />
  return children
}

// Scrolls to top and replays the enter animation on every navigation
const AnimatedRoutes = ({ userData }) => {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])
  // IMPORTANT: this wrapper must never carry a transform (even `translateY(0)`
  // via fill-mode) — a transformed element becomes the containing block for
  // `position: fixed` descendants, which was dragging the nav rail, dock and
  // header cluster out of the viewport with long pages. Fade only.
  return (
    <div key={location.pathname} className='animate-page-fade'>
      <Routes location={location}>
        <Route path="/signup" element={<div className='page-enter page-enter-route'>{!userData ? <SignUp /> : <Navigate to="/home" />}</div>} />
        <Route path="/signin" element={<div className='page-enter page-enter-route'>{!userData ? <SignIn /> : <Navigate to="/home" />}</div>} />
        <Route path="/forgot-password" element={<div className='page-enter page-enter-route'>{!userData ? <ForgotPassword /> : <Navigate to="/home" />}</div>} />
        <Route path="/" element={userData ? <Navigate to='/home' replace /> : <LandingPage />} />
        <Route path="/home" element={userData ? <div className='page-enter page-enter-route'><Home /></div> : <Navigate to="/signin" />} />
        <Route path="/create-edit-shop" element={<div className='page-enter page-enter-route'>{userData ? <CreateEditShop /> : <Navigate to="/signin" />}</div>} />
        <Route path="/add-item" element={<div className='page-enter page-enter-route'>{userData ? <AddItem /> : <Navigate to="/signin" />}</div>} />
        <Route path="/edit-item/:itemId" element={<div className='page-enter page-enter-route'>{userData ? <EditItem /> : <Navigate to="/signin" />}</div>} />
        <Route path="/cart" element={<div className='page-enter page-enter-route'>{userData ? <CartPage /> : <Navigate to="/signin" />}</div>} />
        <Route path="/checkout" element={<div className='page-enter page-enter-route'>{userData ? <CheckOut /> : <Navigate to="/signin" />}</div>} />
        <Route path="/order-placed" element={<div className='page-enter page-enter-route'>{userData ? <OrderPlaced /> : <Navigate to="/signin" />}</div>} />
        <Route path="/my-orders" element={<div className='page-enter page-enter-route'>{userData ? <MyOrders /> : <Navigate to="/signin" />}</div>} />
        <Route path="/donate-food" element={<div className='page-enter page-enter-route'>{<RoleGuard allowed={["user", "owner", "supplier", "deliveryBoy"]}><DonateFoodPage /></RoleGuard>}</div>} />
        <Route path="/my-donations" element={<div className='page-enter page-enter-route'>{userData ? <MyDonationsPage /> : <Navigate to="/signin" />}</div>} />
        <Route path="/trusts" element={<div className='page-enter page-enter-route'>{<RoleGuard allowed={["trustMember", "owner", "admin"]}><TrustsPage /></RoleGuard>}</div>} />
        <Route path="/admin" element={<div className='page-enter page-enter-route'>{<RoleGuard allowed={["admin"]}><AdminDashboard /></RoleGuard>}</div>} />
        <Route path="/track-order/:orderId" element={<div className='page-enter page-enter-route'>{userData ? <TrackOrderPage /> : <Navigate to="/signin" />}</div>} />
        <Route path="/shop/:shopId" element={<div className='page-enter page-enter-route'>{userData ? <Shop /> : <Navigate to="/signin" />}</div>} />
        <Route path="/start-group-order" element={<div className='page-enter page-enter-route'>{<RoleGuard allowed={['user']}><StartGroupOrderPage /></RoleGuard>}</div>} />
        <Route path="/group/:shareableLink" element={<div className='page-enter page-enter-route'>{<GroupOrderPage />}</div>} />
        <Route path="/join/:shareableLink" element={<div className='page-enter page-enter-route'>{<JoinGroupOrderPage />}</div>} />
        <Route path="/my-group-orders" element={<div className='page-enter page-enter-route'>{<RoleGuard allowed={['user']}><MyGroupOrdersPage /></RoleGuard>}</div>} />

        {/* ----- bulk ordering & business analysis ----- */}
        <Route path="/bulk-order/:shopId" element={<div className='page-enter page-enter-route'>{userData ? <BulkOrderPage /> : <Navigate to="/signin" />}</div>} />
        <Route path="/my-bulk-orders" element={<div className='page-enter page-enter-route'>{userData ? <MyBulkOrdersPage /> : <Navigate to="/signin" />}</div>} />
        <Route path="/my-analysis" element={<div className='page-enter page-enter-route'>{<RoleGuard allowed={['owner', 'vendor', 'deliveryBoy']}><BusinessAnalysisPage /></RoleGuard>}</div>} />
        <Route path="/vendor-portal" element={<div className='page-enter page-enter-route'>{<VendorPortalPage />}</div>} />
        <Route path="/vendor/register" element={<div className='page-enter page-enter-route'>{<VendorRegisterPage />}</div>} />
        <Route path="/vendor/add-produce" element={<div className='page-enter page-enter-route'>{<RoleGuard allowed={['vendor']}><AddProducePage /></RoleGuard>}</div>} />
        <Route path="/vendor/dashboard" element={<div className='page-enter page-enter-route'>{<RoleGuard allowed={['vendor']}><VendorDashboardPage /></RoleGuard>}</div>} />
        <Route path="/vendors/nearby" element={<div className='page-enter page-enter-route'>{<NearbyVendorsPage />}</div>} />
        <Route path="/vendor/:vendorId" element={<div className='page-enter page-enter-route'>{<VendorShopPage />}</div>} />
        <Route path="/helper/register-vendor" element={<div className='page-enter page-enter-route'>{<HelperRegisterPage />}</div>} />
        <Route path="/farmer/register" element={<div className='page-enter page-enter-route'>{<VendorRegisterPage />}</div>} />
        <Route path="/farmer/dashboard" element={<div className='page-enter page-enter-route'>{<RoleGuard allowed={['vendor']}><FarmerDashboardPage /></RoleGuard>}</div>} />
        <Route path="/farmer/orders" element={<div className='page-enter page-enter-route'>{<RoleGuard allowed={['vendor']}><FarmerOrdersPage /></RoleGuard>}</div>} />
        <Route path="/farmer/earnings" element={<div className='page-enter page-enter-route'>{<RoleGuard allowed={['vendor']}><FarmerEarningsPage /></RoleGuard>}</div>} />
        <Route path="/farmer/assistant" element={<div className='page-enter page-enter-route'>{<RoleGuard allowed={['vendor']}><FarmerAssistantPage /></RoleGuard>}</div>} />
        <Route path="/farmers/inbox" element={<div className='page-enter page-enter-route'>{userData?.role === 'vendor' || userData?.buyerProfile?.onboardingComplete ? <InboxPage /> : <Navigate to="/home" />}</div>} />
        <Route path="/buyer/onboard" element={<div className='page-enter page-enter-route'>{userData ? <BuyerOnboardPage /> : <Navigate to="/signin" />}</div>} />
        <Route path="/buyer/matches" element={<div className='page-enter page-enter-route'>{userData ? <BuyerMatchesPage /> : <Navigate to="/signin" />}</div>} />
        <Route path="/buyer/purchases" element={<div className='page-enter page-enter-route'>{userData ? <BuyerPurchasesPage /> : <Navigate to="/signin" />}</div>} />
        <Route path="/meal-schedule" element={<div className='page-enter page-enter-route'>{<RoleGuard allowed={['user']}><MealSchedulePage /></RoleGuard>}</div>} />
      </Routes>
    </div>
  )
}

const App = () => {
  const dispatch = useDispatch()
  const location = useLocation()
  const { language, translationResetKey } = useLanguage()
  const { t } = useTranslation()
  const { userData, socket } = useSelector((state) => state.user) // ✅ from Redux state
  const authLoading = userData === undefined

  GetCurrentUser()
  GetMyshop()
  useGetCity()
  GetShopByCity()
  GetItemsByCity()
  GetMyOrders()
  useUpdateLocation()

  useEffect(() => {
    if (language && language !== 'en') {
      const select = document.querySelector('.goog-te-combo')
      if (select && select.value !== language) {
        select.value = language
        select.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
  }, [location.pathname, language])


  useEffect(() => {
    if (!userData?._id) return;

    const socketInstance = io(serverUrl, { withCredentials: true });
    dispatch(setSocket(socketInstance));

    socketInstance.on('connect', () => {
      console.log('socket connected', socketInstance.id);
      if (userData?._id) {
        socketInstance.emit('identity', { userId: userData._id });
      }
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [dispatch, userData?._id]);

  useEffect(() => {
    if (userData?._id && socket?.connected) {
      socket.emit('identity', { userId: userData._id });
      console.log('identity emitted for', userData._id);
    }
  }, [userData?._id, socket]);

  if (authLoading) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center gap-5'>
        <div className='notranslate flex h-16 w-16 items-center justify-center rounded-3xl shadow-2xl' style={{ background: 'var(--accent)', color: 'var(--accent-ink)', boxShadow: 'var(--shadow-lime)' }}>
          <span className='text-3xl' style={{ fontFamily: 'var(--font-display)' }}>G</span>
        </div>
        <div className='loading-dots'><span /><span /><span /></div>
        <p className='t-eyebrow'>{t('home.openingMarket', { defaultValue: 'Opening the market…' })}</p>
      </div>
    )
  }

  return (
    <>
      <AnimatedRoutes userData={userData} />
      {userData?.role === 'user' && <Chatbot />}
    </>
  )
}

export default App

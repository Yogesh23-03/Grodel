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

import GetCurrentUser from './hooks/GetCurrentUser.jsx'
import useGetCity from './hooks/GetCity.jsx'
import GetMyshop from './hooks/GetMyShop.jsx'
import GetShopByCity from './hooks/GetShopByCity.jsx'
import GetItemsByCity from './hooks/GetItemByCity.jsx'
import GetMyOrders from './hooks/GetMyOrders.jsx'
import useUpdateLocation from './hooks/UseUpdateLocation.jsx'

import { setSocket } from './redux/userSlice'

// Local dev talks to the Express API on :8000 by default; a deployment just
// sets VITE_API_URL (e.g. https://api.example.com) — no code change needed.
export const serverUrl = import.meta.env.VITE_API_URL || "http://localhost:8000"

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
        <Route path="/signup" element={!userData ? <SignUp /> : <Navigate to="/" />} />
        <Route path="/signin" element={!userData ? <SignIn /> : <Navigate to="/" />} />
        <Route path="/forgot-password" element={!userData ? <ForgotPassword /> : <Navigate to="/" />} />
        <Route path="/" element={userData ? <Home /> : <Navigate to="/signin" />} />
        <Route path="/create-edit-shop" element={userData ? <CreateEditShop /> : <Navigate to="/signin" />} />
        <Route path="/add-item" element={userData ? <AddItem /> : <Navigate to="/signin" />} />
        <Route path="/edit-item/:itemId" element={userData ? <EditItem /> : <Navigate to="/signin" />} />
        <Route path="/cart" element={userData ? <CartPage /> : <Navigate to="/signin" />} />
        <Route path="/checkout" element={userData ? <CheckOut /> : <Navigate to="/signin" />} />
        <Route path="/order-placed" element={userData ? <OrderPlaced /> : <Navigate to="/signin" />} />
        <Route path="/my-orders" element={userData ? <MyOrders /> : <Navigate to="/signin" />} />
        <Route path="/donate-food" element={userData && ["user", "owner", "supplier", "deliveryBoy"].includes(userData.role) ? <DonateFoodPage /> : <Navigate to="/" />} />
        <Route path="/my-donations" element={userData ? <MyDonationsPage /> : <Navigate to="/signin" />} />
        <Route path="/trusts" element={["trustMember", "owner", "admin"].includes(userData?.role) ? <TrustsPage /> : <Navigate to="/" />} />
        <Route path="/admin" element={userData?.role === "admin" ? <AdminDashboard /> : <Navigate to="/" />} />
        <Route path="/track-order/:orderId" element={userData ? <TrackOrderPage /> : <Navigate to="/signin" />} />
        <Route path="/shop/:shopId" element={userData ? <Shop /> : <Navigate to="/signin" />} />
        <Route path="/start-group-order" element={userData?.role === 'user' ? <StartGroupOrderPage /> : <Navigate to="/" />} />
        <Route path="/group/:shareableLink" element={<GroupOrderPage />} />
        <Route path="/join/:shareableLink" element={<JoinGroupOrderPage />} />
        <Route path="/my-group-orders" element={userData?.role === 'user' ? <MyGroupOrdersPage /> : <Navigate to="/" />} />
        <Route path="/vendor-portal" element={<VendorPortalPage />} />
        <Route path="/vendor/register" element={<VendorRegisterPage />} />
        <Route path="/vendor/add-produce" element={userData?.role === 'vendor' ? <AddProducePage /> : <Navigate to="/" />} />
        <Route path="/vendor/dashboard" element={userData?.role === 'vendor' ? <VendorDashboardPage /> : <Navigate to="/" />} />
        <Route path="/vendors/nearby" element={<NearbyVendorsPage />} />
        <Route path="/vendor/:vendorId" element={<VendorShopPage />} />
        <Route path="/helper/register-vendor" element={<HelperRegisterPage />} />
        <Route path="/farmer/register" element={<VendorRegisterPage />} />
        <Route path="/farmer/dashboard" element={userData?.role === 'vendor' ? <FarmerDashboardPage /> : <Navigate to="/" />} />
        <Route path="/farmer/orders" element={userData?.role === 'vendor' ? <FarmerOrdersPage /> : <Navigate to="/" />} />
        <Route path="/farmer/earnings" element={userData?.role === 'vendor' ? <FarmerEarningsPage /> : <Navigate to="/" />} />
        <Route path="/farmer/assistant" element={userData?.role === 'vendor' ? <FarmerAssistantPage /> : <Navigate to="/" />} />
        <Route path="/farmers/inbox" element={userData?.role === 'vendor' || userData?.buyerProfile?.onboardingComplete ? <InboxPage /> : <Navigate to="/" />} />
        <Route path="/buyer/onboard" element={userData ? <BuyerOnboardPage /> : <Navigate to="/signin" />} />
        <Route path="/buyer/matches" element={userData ? <BuyerMatchesPage /> : <Navigate to="/signin" />} />
        <Route path="/buyer/purchases" element={userData ? <BuyerPurchasesPage /> : <Navigate to="/signin" />} />
        <Route path="/meal-schedule" element={userData?.role === 'user' ? <MealSchedulePage /> : <Navigate to="/" />} />
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

  return <AnimatedRoutes userData={userData} />
}

export default App

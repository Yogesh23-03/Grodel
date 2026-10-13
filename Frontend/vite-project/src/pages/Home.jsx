import React from 'react'
import { useSelector } from 'react-redux'
import DeliveryBoy from "../components/DeliveryBoyDashBoard.jsx";
import OwnerDashboard from "../components/OwnerDashBoard.jsx";
import UserDashboard from "../components/UserDashBoard.jsx";
import MarketNav from "../components/MarketNav.jsx";
import { useNavigate } from "react-router-dom";
import DonationManagement from "../components/DonationManagement.jsx";
import VendorDashboardPage from './VendorDashboardPage.jsx'

function Home() {
    const {userData}=useSelector(state=>state.user)
    const navigate=useNavigate()
  return (
    <div className='relative w-full min-h-[100vh] flex flex-col items-center lg:pl-[76px]'>
      <div className='relative z-10 flex w-full flex-col items-center'>
      {userData.role=="user" && <UserDashboard/>}
      {userData.role=="owner" && <OwnerDashboard/>}
      {userData.role=="deliveryBoy" && <DeliveryBoy/>}
      {userData.role=="vendor" && <VendorDashboardPage/>}
      {userData.role=="trustMember" && <>
        <MarketNav/>
        <div className='w-full flex flex-col items-center gap-5 px-4'>
          <div className='grain card p-6 w-full max-w-[760px] card-3d'>
            <p className='t-eyebrow' style={{ color: 'var(--rescue)' }}>Rescue desk</p>
            <h1 className='t-title mt-1'>Trust console</h1>
            <p className='mt-1 mb-5 text-sm' style={{ color: 'var(--ink-soft)' }}>
              Register your trust, accept donations, pay delivery charges and assign riders.
            </p>
            <button className='btn-primary btn-3d w-full sm:w-auto' style={{ background: 'var(--rescue)', color: '#08130c', boxShadow: 'none' }} onClick={()=>navigate("/trusts")}>Trust details</button>
          </div>
          <DonationManagement/>
        </div>
      </>}
      {userData.role=="admin" && <>
        <MarketNav/>
        <div className='grain card mt-6 p-6 w-full max-w-[560px] text-center card-3d'>
          <p className='t-eyebrow' style={{ color: 'var(--plan)' }}>Control room</p>
          <h1 className='t-title mt-1'>Admin</h1>
          <p className='mt-1 mb-5 text-sm' style={{ color: 'var(--ink-soft)' }}>
            Manage users, trusts, donations and delivery operations.
          </p>
          <button className='btn-primary btn-3d w-full sm:w-auto' onClick={()=>navigate("/admin")}>Open admin page</button>
        </div>
      </>}
      {userData.role=="supplier" && <>
        <MarketNav/>
        <div className='grain card mt-6 p-6 sm:p-8 w-full max-w-[560px] text-center card-3d'>
          <p className='t-eyebrow' style={{ color: 'var(--rescue)' }}>Rescue</p>
          <h1 className='t-title mt-1'>Welcome, <span className='notranslate'>{userData.fullName?.split(' ')[0]}</span></h1>
          <p className='mt-2 mb-6 text-sm' style={{ color: 'var(--ink-soft)' }}>
            Share surplus food or supplies with verified trusts near you.
          </p>
          <button className='btn-primary btn-3d w-full sm:w-auto' style={{ background: 'var(--rescue)', color: '#08130c', boxShadow: 'none' }} onClick={()=>navigate("/donate-food")}>Donate food</button>
        </div>
      </>}
      </div>
    </div>
  )
}

export default Home

import axios from 'axios';
import React, { useState } from 'react'
import { IoIosArrowRoundBack } from "react-icons/io";
import { useNavigate } from 'react-router-dom';
import { serverUrl } from '../App';
import { ClipLoader } from 'react-spinners';
function ForgotPassword() {
  const [step, setStep] = useState(1)
  const [email,setEmail]=useState("")
  const [otp,setOtp]=useState("")
  const [newPassword,setNewPassword]=useState("")
  const [confirmPassword,setConfirmPassword]=useState("")
  const [err,setErr]=useState("")
  const navigate=useNavigate()
const [loading,setLoading]=useState(false)
  const handleSendOtp=async () => {
    setLoading(true)
    try {
      const result=await axios.post(`${serverUrl}/api/auth/sendotp`,{email},{withCredentials:true})
      console.log(result)
      setErr("")
      setStep(2)
      setLoading(false)
    } catch (error) {
      setErr(error?.response?.data?.message)
       setLoading(false)
    }
  }
  const handleVerifyOtp=async () => {
      setLoading(true)
    try {
      const result=await axios.post(`${serverUrl}/api/auth/verifyotp`,{email,otp},{withCredentials:true})
      console.log(result)
      setErr("")
      setStep(3)
        setLoading(false)
    } catch (error) {
        setErr(error?.response?.data?.message)
          setLoading(false)
    }
  }
  const handleResetPassword=async () => {
    if(newPassword!=confirmPassword){
      return null
    }
    setLoading(true)
    try {
      const result=await axios.post(`${serverUrl}/api/auth/resetpassword`,{email,password:newPassword},{withCredentials:true})
      setErr("")
      console.log(result)
        setLoading(false)
      navigate("/signin")
    } catch (error) {
     setErr(error?.response?.data?.message)
       setLoading(false)
    }
  }
  return (
    <div className='flex w-full items-center justify-center min-h-screen p-4 bg-[#fff9f6]'>
      <div className='glass-card rounded-xl w-full max-w-md p-8 card-3d'>
        <div className='flex items-center gap-4 mb-4'>
          <IoIosArrowRoundBack size={30} className='text-[color:var(--accent-text)] cursor-pointer' onClick={()=>navigate("/signin")}/>
          <h1 className='text-2xl font-bold text-center text-[color:var(--accent-text)]'>Forgot Password</h1>
        </div>
        {step == 1
          &&
          <div>
 <div className='mb-6'>
                    <label htmlFor="email" className='block text-gray-700 font-medium mb-1'>Email</label>
                    <input type="email" className='glass-input w-full' placeholder='Enter your Email' onChange={(e)=>setEmail(e.target.value)} value={email} required/>
                </div>
                <button className={`w-full font-semibold py-2 rounded-lg transition duration-200 bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] cursor-pointer`} onClick={handleSendOtp} disabled={loading}>
                {loading?<ClipLoader size={20} color='white'/>:"Send Otp"}
            </button>
                 {err && <p className='text-red-600 text-center my-[10px]'>*{err}</p>}
          </div>}

         {step == 2
          &&
          <div>
 <div className='mb-6'>
                    <label htmlFor="email" className='block text-gray-700 font-medium mb-1'>OTP</label>
                    <input type="email" className='glass-input w-full' placeholder='Enter OTP' onChange={(e)=>setOtp(e.target.value)} value={otp} required/>
                </div>
                <button className={`w-full font-semibold py-2 rounded-lg transition duration-200 bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] cursor-pointer`} onClick={handleVerifyOtp} disabled={loading}>
                {loading?<ClipLoader size={20} color='white'/>:"Verify"}
            </button>
                {err && <p className='text-red-600 text-center my-[10px]'>*{err}</p>}
          </div>}
          {step == 3
          &&
          <div>
 <div className='mb-6'>
                    <label htmlFor="newPassword" className='block text-gray-700 font-medium mb-1'>New Password</label>
                    <input type="email" className='glass-input w-full' placeholder='Enter New Password' onChange={(e)=>setNewPassword(e.target.value)} value={newPassword}/>
                </div>
                <div className='mb-6'>
                    <label htmlFor="ConfirmPassword" className='block text-gray-700 font-medium mb-1'>Confirm Password</label>
                    <input type="email" className='glass-input w-full' placeholder='Confirm Password' onChange={(e)=>setConfirmPassword(e.target.value)} value={confirmPassword} required/>
                </div>
                <button className={`w-full font-semibold py-2 rounded-lg transition duration-200 bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] cursor-pointer`} onClick={handleResetPassword} disabled={loading}>
                {loading?<ClipLoader size={20} color='white'/>:"Reset Password"}
            </button>
                {err && <p className='text-red-600 text-center my-[10px]'>*{err}</p>}
          </div>}
      </div>
    </div>
  )
}

export default ForgotPassword

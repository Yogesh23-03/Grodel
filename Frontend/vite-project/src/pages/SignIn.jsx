import React from 'react'
import { useState } from 'react';
import { FaRegEye } from "react-icons/fa";
import { FaRegEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { useNavigate } from 'react-router-dom';
import axios from "axios"
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { ClipLoader } from 'react-spinners';
import { serverUrl } from '../App';
import { useDispatch } from 'react-redux';
import { setUserData } from '../redux/userSlice';
function SignIn() {
    const bgColor = "var(--bg)";
    const borderColor = "var(--border-strong)";
    const [showPassword, setShowPassword] = useState(false)
    const navigate=useNavigate()
    const [email,setEmail]=useState("")
    const [password,setPassword]=useState("")
    const [err,setErr]=useState("")
    const [loading,setLoading]=useState(false)
    const dispatch=useDispatch()
     const handleSignIn=async () => {
        setLoading(true)
        try {
            const result=await axios.post(`${serverUrl}/api/auth/signin`,{
                email,password
            },{withCredentials:true})
            dispatch(setUserData(result.data))
            setErr("")
            setLoading(false)
        } catch (error) {
           setErr(error?.response?.data?.message)
           setLoading(false)
        }
     }
     
 const handleGoogleAuth=async () => {
        
        const provider=new GoogleAuthProvider()
        const result=await signInWithPopup(auth,provider)
        console.log(result)
  try {
    const {data}=await axios.post(`${serverUrl}/api/auth/googleauth`,{
        email:result.user.email,
    },{withCredentials:true})
    dispatch(setUserData(data))
  } catch (error) {

    console.log(error)
  }
     }


    return (
        <div className='relative min-h-screen w-full overflow-hidden flex items-center justify-center p-4' style={{ backgroundColor: bgColor }}>
            <div className='absolute left-[8%] top-[12%] h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl [animation:soft-pulse_7s_ease-in-out_infinite]' />
            <div className='absolute bottom-[8%] right-[8%] h-72 w-72 rounded-full bg-orange-400/10 blur-3xl [animation:soft-pulse_9s_ease-in-out_infinite]' />
            <div className='glass-panel relative w-full max-w-md rounded-[2rem] p-8 md:p-10' style={{
                border: `1px solid ${borderColor}`
            }}>
                <div className='mb-8'><span className='rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300'>Welcome back</span></div>
                <h1 className='gradient-text mb-2 text-4xl font-black tracking-[-0.06em]'>GroDel</h1>
                <p className='text-gray-600 mb-8'>Sign in to discover local food and order together.
                </p>

              
                {/* email */}

                <div className='mb-4'>
                    <label htmlFor="email" className='block text-gray-700 font-medium mb-1'>Email</label>
                    <input type="email" className='glass-input w-full' placeholder='Enter your Email' style={{ border: `1px solid ${borderColor}` }} onChange={(e)=>setEmail(e.target.value)} value={email} required/>
                </div>
                {/* password*/}

                <div className='mb-4'>
                    <label htmlFor="password" className='block text-gray-700 font-medium mb-1'>Password</label>
                    <div className='relative'>
                        <input type={`${showPassword ? "text" : "password"}`} className='glass-input w-full pr-10' placeholder='Enter your password' style={{ border: `1px solid ${borderColor}` }} onChange={(e)=>setPassword(e.target.value)} value={password} required/>

                        <button className='absolute right-3 cursor-pointer top-[14px] text-gray-500' onClick={() => setShowPassword(prev => !prev)}>{!showPassword ? <FaRegEye /> : <FaRegEyeSlash />}</button>
                    </div>
                </div>
                <div className='text-right mb-4 cursor-pointer text-[#ff4d2d] font-medium' onClick={()=>navigate("/forgot-password")}>
                  Forgot Password
                </div>
              

            <button className='btn-glow w-full py-3 cursor-pointer' onClick={handleSignIn} disabled={loading}>
                {loading?<ClipLoader size={20} color='white'/>:"Sign In"}
            </button>
      {err && <p className='text-red-500 text-center my-[10px]'>*{err}</p>}

            <button className='w-full mt-4 flex items-center justify-center gap-2 border rounded-full px-4 py-3 cursor-pointer border-gray-400 hover:bg-gray-100' onClick={handleGoogleAuth}>
<FcGoogle size={20}/>
<span>Sign In with Google</span>
            </button>
            <p className='text-center mt-6 cursor-pointer' onClick={()=>navigate("/signup")}>Want to create a new account ?  <span className='text-[#ff4d2d]'>Sign Up</span></p>
            </div>
        </div>
    )
}

export default SignIn

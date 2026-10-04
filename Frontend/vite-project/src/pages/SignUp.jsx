import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa'
import { FaHandHoldingHeart, FaMotorcycle } from 'react-icons/fa6'
import { FcGoogle } from 'react-icons/fc'
import { FiCheck, FiUser } from 'react-icons/fi'
import { GiFarmer } from 'react-icons/gi'
import { MdStorefront } from 'react-icons/md'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { ClipLoader } from 'react-spinners'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { auth } from '../firebase'
import { serverUrl } from '../App'
import { useLanguage } from '../context/LanguageContext.jsx'
import { setUserData } from '../redux/userSlice'

function SignUp() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState('user')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { language } = useLanguage()
  const { t } = useTranslation()
  const roles = [
    { key: 'user', Icon: FiUser },
    { key: 'owner', Icon: MdStorefront },
    { key: 'vendor', Icon: GiFarmer },
    { key: 'deliveryBoy', Icon: FaMotorcycle },
    { key: 'trustMember', Icon: FaHandHoldingHeart }
  ]

  const completeSignUp = (user) => {
    dispatch(setUserData(user))
    if (role === 'vendor') navigate('/vendor/dashboard')
  }

  const handleSignUp = async () => {
    setLoading(true)
    setErr('')
    try {
      const result = await axios.post(`${serverUrl}/api/auth/signup`, { fullName, email, password, mobile, role, preferredLanguage: language }, { withCredentials: true })
      completeSignUp(result.data)
    } catch (error) {
      setErr(error?.response?.data?.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    if (!mobile) return setErr('mobile no is required')
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider())
      const { data } = await axios.post(`${serverUrl}/api/auth/googleauth`, { fullName: result.user.displayName, email: result.user.email, role, mobile, preferredLanguage: language }, { withCredentials: true })
      completeSignUp(data)
    } catch (error) {
      setErr(error?.response?.data?.message || error.message)
    }
  }

  return <div className='relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#070b14] p-4 py-10'>
    <div className='absolute left-[6%] top-[18%] h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl [animation:soft-pulse_7s_ease-in-out_infinite]' />
    <div className='absolute bottom-[5%] right-[6%] h-72 w-72 rounded-full bg-orange-400/10 blur-3xl [animation:soft-pulse_9s_ease-in-out_infinite]' />
    <div className='glass-panel relative w-full max-w-lg rounded-[2rem] p-8 md:p-10'>
      <div className='mb-8'><span className='rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300'>Join GroDel</span></div>
      <h1 className='gradient-text mb-2 text-4xl font-black tracking-[-0.06em]'>Food feels better together.</h1>
      <p className='mb-8 text-gray-600'>Create your account and start discovering.</p>
      <div className='mb-4'><label htmlFor='fullName' className='mb-1 block font-medium text-gray-700'>Full Name</label><input id='fullName' type='text' className='w-full rounded-lg border border-cyan-200/20 px-3 py-2 focus:outline-none' placeholder='Enter your Full Name' onChange={(event) => setFullName(event.target.value)} value={fullName} required /></div>
      <div className='mb-4'><label htmlFor='email' className='mb-1 block font-medium text-gray-700'>Email</label><input id='email' type='email' className='w-full rounded-lg border border-cyan-200/20 px-3 py-2 focus:outline-none' placeholder='Enter your Email' onChange={(event) => setEmail(event.target.value)} value={email} required /></div>
      <div className='mb-4'><label htmlFor='mobile' className='mb-1 block font-medium text-gray-700'>Mobile</label><input id='mobile' type='tel' className='w-full rounded-lg border border-cyan-200/20 px-3 py-2 focus:outline-none' placeholder='Enter your Mobile Number' onChange={(event) => setMobile(event.target.value)} value={mobile} required /></div>
      <div className='mb-4'><label htmlFor='password' className='mb-1 block font-medium text-gray-700'>Password</label><div className='relative'><input id='password' type={showPassword ? 'text' : 'password'} className='w-full rounded-lg border border-cyan-200/20 px-3 py-2 pr-10 focus:outline-none' placeholder='Enter your password' onChange={(event) => setPassword(event.target.value)} value={password} required /><button type='button' className='absolute right-3 top-[14px] cursor-pointer text-gray-500' onClick={() => setShowPassword((value) => !value)}>{showPassword ? <FaRegEyeSlash /> : <FaRegEye />}</button></div></div>
      <div className='mb-5'><label className='mb-2 block font-medium text-gray-700'>{t('auth.role')}</label><div className='flex w-full flex-col gap-3'>{roles.map(({ key, Icon }) => { const selected = role === key; return <button key={key} type='button' onClick={() => setRole(key)} className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all ${selected ? 'border-[#ff4d2d] bg-[#ff4d2d]/10 text-white' : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'}`}><div className={`rounded-lg p-2 ${selected ? 'bg-[#ff4d2d]/20' : 'bg-white/5'}`}>{React.createElement(Icon, { size: 20, className: selected ? 'text-[#ff4d2d]' : 'text-gray-400' })}</div><div><p className='text-sm font-semibold leading-tight'>{t(`auth.roles.${key}.label`)}</p><p className='mt-0.5 text-xs text-gray-500'>{t(`auth.roles.${key}.desc`)}</p></div>{selected && <FiCheck size={16} className='ml-auto text-[#ff4d2d]' />}</button> })}</div></div>
      <button className='w-full cursor-pointer rounded-full bg-[#ff4d2d] py-3 font-bold text-white' onClick={handleSignUp} disabled={loading}>{loading ? <ClipLoader size={20} color='white' /> : 'Sign Up'}</button>
      {err && <p className='my-[10px] text-center text-red-500'>*{err}</p>}
      <button className='mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-gray-400 px-4 py-3 hover:bg-gray-100' onClick={handleGoogleAuth}><FcGoogle size={20} /><span>Sign up with Google</span></button>
      <p className='mt-6 cursor-pointer text-center' onClick={() => navigate('/signin')}>Already have an account? <span className='text-[#ff4d2d]'>Sign In</span></p>
    </div>
  </div>
}

export default SignUp

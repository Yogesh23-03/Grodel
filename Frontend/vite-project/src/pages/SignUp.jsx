import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa'
import { FaHandHoldingHeart, FaMotorcycle } from 'react-icons/fa6'
import { FcGoogle } from 'react-icons/fc'
import { FiCheck, FiUser } from 'react-icons/fi'
import { GiFarmer } from 'react-icons/gi'
import { MdStorefront } from 'react-icons/md'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import GlowSpinner from '../components/ui/GlowSpinner.jsx'
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
  const [adminSlots, setAdminSlots] = useState(null)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { language } = useLanguage()
  const { t } = useTranslation()

  /*
   * Admin is a capped role. The public endpoint says how many seats are left;
   * while the answer is unknown, or once the seats are full, Admin is not
   * offered at all. The signup route refuses the overflow server-side too, so
   * this is about not showing a doomed option rather than about security.
   */
  useEffect(() => {
    let active = true
    axios.get(`${serverUrl}/api/admin/slots-public`)
      .then((res) => { if (active) setAdminSlots(res.data) })
      .catch(() => { if (active) setAdminSlots(null) })
    return () => { active = false }
  }, [])

  const roles = [
    { key: 'user', Icon: FiUser },
    { key: 'owner', Icon: MdStorefront },
    { key: 'vendor', Icon: GiFarmer },
    { key: 'deliveryBoy', Icon: FaMotorcycle },
    { key: 'trustMember', Icon: FaHandHoldingHeart },
    ...(adminSlots && !adminSlots.full ? [{ key: 'admin', emoji: '🛠️' }] : [])
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

  return <div className='g-page relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4 py-10'>
    <div className='absolute left-[6%] top-[18%] h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl [animation:soft-pulse_7s_ease-in-out_infinite]' />
    <div className='absolute bottom-[5%] right-[6%] h-72 w-72 rounded-full bg-orange-400/10 blur-3xl [animation:soft-pulse_9s_ease-in-out_infinite]' />
    <div className='glass-panel relative w-full max-w-lg rounded-[2rem] p-8 md:p-10'>
      <div className='mb-8'><span className='rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300'>Join GroDel</span></div>
      <h1 className='gradient-text mb-2 text-4xl font-black tracking-[-0.06em]'>Food feels better together.</h1>
      <p className='mb-8 text-gray-600'>Create your account and start discovering.</p>
      <div className='mb-4'><label htmlFor='fullName' className='mb-1 block font-medium text-gray-700'>Full Name</label><input id='fullName' type='text' className='glass-input w-full' placeholder='Enter your Full Name' onChange={(event) => setFullName(event.target.value)} value={fullName} required /></div>
      <div className='mb-4'><label htmlFor='email' className='mb-1 block font-medium text-gray-700'>Email</label><input id='email' type='email' className='glass-input w-full' placeholder='Enter your Email' onChange={(event) => setEmail(event.target.value)} value={email} required /></div>
      <div className='mb-4'><label htmlFor='mobile' className='mb-1 block font-medium text-gray-700'>Mobile</label><input id='mobile' type='tel' className='glass-input w-full' placeholder='Enter your Mobile Number' onChange={(event) => setMobile(event.target.value)} value={mobile} required /></div>
      <div className='mb-4'><label htmlFor='password' className='mb-1 block font-medium text-gray-700'>Password</label><div className='relative'><input id='password' type={showPassword ? 'text' : 'password'} className='glass-input w-full pr-10' placeholder='Enter your password' onChange={(event) => setPassword(event.target.value)} value={password} required /><button type='button' className='absolute right-3 top-[14px] cursor-pointer text-gray-500' onClick={() => setShowPassword((value) => !value)}>{showPassword ? <FaRegEyeSlash /> : <FaRegEye />}</button></div></div>
      <div className='mb-5'><label className='mb-2 block font-medium' style={{ color: 'var(--text-secondary)' }}>{t('auth.role')}</label><div className='flex w-full flex-col gap-3'>{roles.map(({ key, Icon, emoji }) => { const selected = role === key; return <button key={key} type='button' onClick={() => setRole(key)} className='g-card-solid flex w-full items-center gap-4 px-4 py-3 text-left' style={selected ? { background: 'var(--brand-soft)', border: '1px solid var(--brand)' } : undefined}><div className='rounded-lg p-2' style={{ background: selected ? 'var(--accent-soft)' : 'var(--glass-bg)' }}>{Icon ? React.createElement(Icon, { size: 20, color: selected ? 'var(--accent-text)' : 'var(--text-muted)' }) : <span style={{ fontSize: 20, lineHeight: 1 }}>{emoji}</span>}</div><div><p className='text-sm font-semibold leading-tight' style={{ color: 'var(--text-primary)' }}>{t(`auth.roles.${key}.label`, { defaultValue: key === 'admin' ? 'Admin' : key })}</p><p className='mt-0.5 text-xs' style={{ color: 'var(--text-muted)' }}>{t(`auth.roles.${key}.desc`, { defaultValue: key === 'admin' ? 'Run the platform and manage every user' : '' })}</p></div>{selected && <FiCheck className='ml-auto' size={16} style={{ color: 'var(--accent-text)' }} />}</button> })}</div>{adminSlots && <p className='mt-2 text-xs' style={{ color: 'var(--text-muted)' }}>{t('auth.adminSeats', { defaultValue: 'Admin seats' })}: {adminSlots.current}/{adminSlots.max}{adminSlots.full ? ' — full' : ''}</p>}</div>
      <button className='btn-glow w-full cursor-pointer py-3' onClick={handleSignUp} disabled={loading}>{loading ? <GlowSpinner size={20} color='white' /> : 'Sign Up'}</button>
      {err && <p className='my-[10px] text-center text-red-500'>*{err}</p>}
      <button className='mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-gray-400 px-4 py-3 hover:bg-gray-100' onClick={handleGoogleAuth}><FcGoogle size={20} /><span>Sign up with Google</span></button>
      <p className='mt-6 cursor-pointer text-center' onClick={() => navigate('/signin')}>Already have an account? <span className='text-[color:var(--accent-text)]'>Sign In</span></p>
    </div>
  </div>
}

export default SignUp

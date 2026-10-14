import React from 'react'
import { useState } from 'react';
import { FaRegEye } from "react-icons/fa";
import { FaRegEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { HiOutlineArrowRight } from "react-icons/hi2";
import { useNavigate } from 'react-router-dom';
import axios from "axios"
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { serverUrl } from '../App';
import { useDispatch } from 'react-redux';
import { setUserData } from '../redux/userSlice';
import TiltCard from '../components/ui/TiltCard.jsx';
import GlowingButton from '../components/ui/GlowingButton.jsx';

/*
 * SignIn — reference implementation of the "Neon Midnight Bistro" theme.
 *
 * Everything visible comes from the design system, not from local styles:
 *   TiltCard        floating glass panel with the universal 3D pointer tilt
 *   GlowingButton   every button, including the pulsing primary CTA
 *   g-input         dark inset well that glows cyan on focus
 *   g-rise          staggered entrance (slide up 20px + fade)
 *   float-card      continuous 4px drift, staggered per element
 *
 * The ambient room behind this page is painted once by <AuroraBg /> in
 * App.jsx, so a new page inherits it for free.
 */
function SignIn() {
    const [showPassword, setShowPassword] = useState(false)
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [err, setErr] = useState("")
    const [loading, setLoading] = useState(false)
    const dispatch = useDispatch()

    const handleSignIn = async () => {
        setLoading(true)
        try {
            const result = await axios.post(`${serverUrl}/api/auth/signin`, {
                email, password
            }, { withCredentials: true })
            dispatch(setUserData(result.data))
            setErr("")
            setLoading(false)
        } catch (error) {
            setErr(error?.response?.data?.message)
            setLoading(false)
        }
    }

    const handleGoogleAuth = async () => {
        const provider = new GoogleAuthProvider()
        const result = await signInWithPopup(auth, provider)
        try {
            const { data } = await axios.post(`${serverUrl}/api/auth/googleauth`, {
                email: result.user.email,
            }, { withCredentials: true })
            dispatch(setUserData(data))
        } catch (error) {
            console.log(error)
        }
    }

    /* Label + input share one group so the cyan focus ring, the label and
       the error state all move together. */
    const field = 'g-form-group g-rise'

    return (
        <div className='g-page relative flex items-center justify-center overflow-hidden p-4'>
            {/* Two accent glows pinned behind the panel. AuroraBg already
                paints the global room; these are page-local highlights. */}
            <div className='aurora-orb aurora-orb-2 orb-drift-2 absolute left-[6%] top-[10%] h-72 w-72' />
            <div className='aurora-orb aurora-orb-1 orb-drift-1 absolute bottom-[6%] right-[6%] h-80 w-80' />
            <div className='aurora-orb aurora-orb-3 orb-drift-3 absolute right-[22%] top-[6%] h-56 w-56' />

            <TiltCard
                glow='cyan'
                float
                className='relative z-10 w-full max-w-md p-8 md:p-10'
                style={{ borderRadius: 'var(--r-2xl)' }}
            >
                <div className='g-rise mb-6' style={{ animationDelay: '0ms' }}>
                    <span className='g-badge g-badge-info'>Welcome back</span>
                </div>

                <h1 className='grad-text g-rise g-display !text-[2.5rem]' style={{ animationDelay: '40ms' }}>GroDel</h1>
                <p className='g-body g-rise mt-2 mb-8' style={{ animationDelay: '80ms' }}>
                    Sign in to discover local food and order together.
                </p>

                {/* email */}
                <div className={`${field} mb-5`} style={{ animationDelay: '140ms' }}>
                    <label htmlFor="email" className='g-label'>Email</label>
                    <input
                        id="email"
                        type="email"
                        className='g-input'
                        placeholder='Enter your Email'
                        autoComplete='email'
                        onChange={(e) => setEmail(e.target.value)}
                        value={email}
                        required
                    />
                </div>

                {/* password */}
                <div className={`${field} mb-2`} style={{ animationDelay: '180ms' }}>
                    <label htmlFor="password" className='g-label'>Password</label>
                    <div className='relative'>
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            className='g-input pr-11'
                            placeholder='Enter your password'
                            autoComplete='current-password'
                            onChange={(e) => setPassword(e.target.value)}
                            value={password}
                            required
                        />
                        <button
                            type='button'
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className='absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors'
                            style={{ color: 'var(--ink-muted)' }}
                            onClick={() => setShowPassword(prev => !prev)}
                        >
                            {!showPassword ? <FaRegEye /> : <FaRegEyeSlash />}
                        </button>
                    </div>
                </div>

                <div
                    className='g-rise mb-5 cursor-pointer text-right text-sm font-semibold transition-colors hover:underline'
                    style={{ animationDelay: '220ms', color: 'var(--accent-2)' }}
                    onClick={() => navigate("/forgot-password")}
                >
                    Forgot Password
                </div>

                <div className='g-rise' style={{ animationDelay: '260ms' }}>
                    {/* The one pulsing button on the page: this is the action
                        the whole screen exists to drive. */}
                    <GlowingButton
                        pulse
                        size='lg'
                        fullWidth
                        loading={loading}
                        onClick={handleSignIn}
                        icon={<HiOutlineArrowRight />}
                    >
                        Sign In
                    </GlowingButton>
                </div>

                {err && (
                    <p
                        role='alert'
                        className='g-rise mt-3 text-center text-sm font-semibold'
                        style={{ color: 'var(--danger)' }}
                    >
                        *{err}
                    </p>
                )}

                <button
                    type='button'
                    className='g-btn-ghost g-rise mt-4 w-full py-3'
                    style={{ animationDelay: '320ms' }}
                    onClick={handleGoogleAuth}
                >
                    <FcGoogle size={20} />
                    <span>Sign In with Google</span>
                </button>

                <p
                    className='g-rise mt-6 cursor-pointer text-center text-sm'
                    style={{ animationDelay: '380ms', color: 'var(--ink-muted)' }}
                    onClick={() => navigate("/signup")}
                >
                    Want to create a new account ?{' '}
                    <span style={{ color: 'var(--accent-2)' }} className='font-semibold'>Sign Up</span>
                </p>
            </TiltCard>
        </div>
    )
}

export default SignIn

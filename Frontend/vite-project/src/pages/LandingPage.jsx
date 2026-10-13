import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import useScrollReveal from '../hooks/useScrollReveal'
import { serverUrl } from '../App'

/*
 * LANDING PAGE — the way in for visitors who are not signed in.
 *
 * Dark glass on var(--bg-base), eight sections, sticky nav, CSS-only motion.
 * No image files anywhere: every illustration is an emoji or a gradient.
 *
 * The Admin role card is live rather than decorative — it asks the public
 * /api/admin/slots-public endpoint how many admin seats are left and hides its
 * button once they are gone, which is the same limit the signup route enforces.
 */

const FLOATERS = [
  { emoji: '🍕', cls: 'anim-float-a', style: { left: '4%', top: '14%', fontSize: '3.5rem', opacity: 0.22, animationDelay: '0s' } },
  { emoji: '🍛', cls: 'anim-float-b', style: { right: '6%', top: '9%', fontSize: '3rem', opacity: 0.18, animationDelay: '1.2s' } },
  { emoji: '🍔', cls: 'anim-float-c', style: { left: '2%', top: '44%', fontSize: '3rem', opacity: 0.2, animationDelay: '2.1s' } },
  { emoji: '🥭', cls: 'anim-float-a', style: { right: '4%', top: '40%', fontSize: '2.5rem', opacity: 0.17, animationDelay: '1.7s' } },
  { emoji: '🌶️', cls: 'anim-float-b', style: { left: '9%', bottom: '22%', fontSize: '2.2rem', opacity: 0.2, animationDelay: '0.6s' } },
  { emoji: '🍱', cls: 'anim-float-c', style: { right: '9%', bottom: '26%', fontSize: '2.2rem', opacity: 0.17, animationDelay: '3.1s' } },
  { emoji: '👨‍🍳', cls: 'anim-float-a', style: { left: '44%', top: '7%', fontSize: '2rem', opacity: 0.14, animationDelay: '2.7s' } },
  { emoji: '🥕', cls: 'anim-float-b', style: { left: '18%', bottom: '16%', fontSize: '2rem', opacity: 0.17, animationDelay: '1.1s' } },
  { emoji: '🍮', cls: 'anim-float-c', style: { right: '22%', top: '55%', fontSize: '1.8rem', opacity: 0.14, animationDelay: '0.9s' } },
  { emoji: '🥗', cls: 'anim-float-a', style: { left: '72%', bottom: '12%', fontSize: '2rem', opacity: 0.17, animationDelay: '3.6s' } }
]

/* Every card below names something that actually ships in this repo. */
const ROLES = [
  {
    emoji: '🛒', role: 'Customer', tagline: 'Hungry? We have got you.', color: 'var(--accent-text)',
    features: ['Browse kitchens by city', 'Start or join a group order', 'Voice search for food', 'AI food chatbot', 'Play games while you wait', 'Donate surplus food']
  },
  {
    emoji: '🏪', role: 'Restaurant owner', tagline: 'Your kitchen, our platform.', color: '#f59e0b',
    features: ['List your shop and menu', 'AI writes menu descriptions', 'Run discounts and bulk orders', 'Live order dashboard', 'AI business analysis', 'Track every delivery']
  },
  {
    emoji: '🌾', role: 'Farmer / vendor', tagline: 'Your farm, their table.', color: '#10b981',
    features: ['One photo becomes a listing', 'AI identifies your produce', 'Update prices by voice', 'Fresh Today badge', 'Direct market to buyers', 'Matched with bulk buyers']
  },
  {
    emoji: '🚴', role: 'Delivery partner', tagline: 'Ride, earn, repeat.', color: '#3b82f6',
    features: ['Accept delivery assignments', 'Share live GPS location', 'OTP-verified handover', 'Track daily earnings', 'Deliver food donations', 'AI earnings analysis']
  },
  {
    emoji: '🤝', role: 'Trust / NGO', tagline: 'Receive what others give.', color: '#8b5cf6',
    features: ['Receive food donations', 'Manage incoming donations', 'Track delivery status', 'Build community impact', 'Partner with restaurants', 'View donation history']
  }
]

const ADMIN_ROLE = {
  emoji: '🛠️', role: 'Admin', tagline: 'Keep GroDel running.', color: '#64748b',
  features: ['Manage every user', 'Assign donations to trusts', 'Verify vendors and helpers', 'Read platform analytics', 'Screen fraud signals', 'Control admin seats']
}

const VALUE_CARDS = [
  { emoji: '🍽️', title: 'Order food', desc: 'Browse kitchens in your city, fill a cart, pay online or on delivery.' },
  { emoji: '🌾', title: 'Buy local produce', desc: 'Fresh vegetables and fruit straight from nearby farmers and vendors.' },
  { emoji: '🤝', title: 'Donate surplus', desc: 'Give surplus food to a nearby trust in a few taps, and follow it to the door.' },
  { emoji: '👥', title: 'Order together', desc: 'Open a shared table, everyone adds their own items and pays their own share.' }
]

const HOW_STEPS = [
  { num: '01', icon: '📍', title: 'Pick your city', desc: 'Detected automatically, or chosen by hand' },
  { num: '02', icon: '🔍', title: 'Browse & discover', desc: 'Restaurants, local vendors, or the donation table' },
  { num: '03', icon: '🛒', title: 'Order or donate', desc: 'Add to cart, open a group order, or give food away' },
  { num: '04', icon: '🚀', title: 'Track live', desc: 'GPS tracking right up to the handover' }
]

const AI_FEATURES = [
  { emoji: '🤖', title: 'AI food chatbot', desc: 'Ask for anything and get a personal recommendation back.' },
  { emoji: '📸', title: 'Photo to listing', desc: 'A vendor photographs produce once and AI writes the listing.' },
  { emoji: '🎤', title: 'Voice search', desc: 'Say the dish instead of typing it — in your own language.' },
  { emoji: '📊', title: 'Business insights', desc: 'AI reads your sales and tells you what to change.' }
]

const GAMES = [
  { emoji: '🎯', name: 'Food trivia' },
  { emoji: '🔤', name: 'Food wordle' },
  { emoji: '🎡', name: 'Spin & win' },
  { emoji: '🍽️', name: 'Guess the dish' },
  { emoji: '👨‍🍳', name: 'Recipe challenge' }
]

const STATS = [
  { value: 1000, label: 'Restaurant items', emoji: '🍽️' },
  { value: 500, label: 'Local vendors', emoji: '🌾' },
  { value: 200, label: 'Food donations', emoji: '🤝' },
  { value: 5, label: 'Games to play', emoji: '🎮' }
]

function LandingPage() {
  const navigate = useNavigate()
  const userData = useSelector((state) => state.user.userData)

  const [scrolled, setScrolled] = useState(false)
  const [counts, setCounts] = useState(STATS.map(() => 0))
  const [listening, setListening] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [adminSlots, setAdminSlots] = useState(null)

  const statsRef = useRef(null)
  const statsTriggered = useRef(false)
  const recogniserRef = useRef(null)

  const heroRef = useScrollReveal(0)
  const whatRef = useScrollReveal(0)
  const howRef = useScrollReveal(0)
  const rolesRef = useScrollReveal(0)
  const aiRef = useScrollReveal(0)
  const gamesRef = useScrollReveal(0)
  const ctaRef = useScrollReveal(0)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Public, unauthenticated — tells us whether to offer an Admin signup at all. */
  useEffect(() => {
    let active = true
    axios.get(`${serverUrl}/api/admin/slots-public`)
      .then((res) => { if (active) setAdminSlots(res.data) })
      .catch(() => { if (active) setAdminSlots(null) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const el = statsRef.current
    if (!el || statsTriggered.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || statsTriggered.current) return
      statsTriggered.current = true
      STATS.forEach((stat, index) => {
        let current = 0
        const step = stat.value / 60
        const timer = setInterval(() => {
          current += step
          if (current >= stat.value) { current = stat.value; clearInterval(timer) }
          setCounts((prev) => {
            const next = [...prev]
            next[index] = Math.floor(current)
            return next
          })
        }, 24)
      })
    }, { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  /* A visitor is not signed in, so "find this dish" is really "get an account
     and we will look for it" — the term rides along in the URL either way. */
  const goToSearch = (term) => {
    const cleaned = String(term || '').trim()
    if (!cleaned) return
    const query = `?search=${encodeURIComponent(cleaned)}`
    navigate(userData ? `/home${query}` : `/signin${query}`)
  }

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      window.alert('Voice search is not supported in this browser')
      return
    }
    try {
      const recognition = new SpeechRecognition()
      recognition.lang = 'en-IN'
      recognition.continuous = false
      recognition.interimResults = false
      recognition.onstart = () => setListening(true)
      recognition.onend = () => setListening(false)
      recognition.onerror = () => setListening(false)
      recognition.onresult = (event) => {
        const spoken = event.results[0][0].transcript
        setSearchTerm(spoken)
        goToSearch(spoken)
      }
      recognition.start()
      recogniserRef.current = recognition
    } catch (err) {
      console.error('VOICE SEARCH:', err?.message || err)
      setListening(false)
      window.alert('Could not hear you. Please try again.')
    }
  }

  const joinRole = () => navigate('/signup')

  const surface = (isSurface) => ({ background: isSurface ? 'var(--bg-surface)' : 'var(--bg-base)' })

  return (
    <div className='g-page' style={{ overflowX: 'hidden' }}>
      {/* ── Floating food, fixed over the whole viewport ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }} aria-hidden='true'>
        {FLOATERS.map((floater, index) => (
          <span key={index} className={floater.cls} style={{ position: 'absolute', ...floater.style }}>
            {floater.emoji}
          </span>
        ))}
        <div className='glow-orb glow-orb-brand' style={{ width: 700, height: 700, top: '20%', left: '50%', transform: 'translateX(-50%)' }} />
      </div>

      {/* ── Sticky nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        height: 64, padding: '0 1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
        background: scrolled ? 'rgba(7,17,28,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--glass-border)' : 'none'
      }}>
        <span
          className='grad-text'
          style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.03em', cursor: 'pointer' }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          GroDel
        </span>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button className='g-btn-ghost' style={{ padding: '0.45rem 1.1rem', fontSize: '0.85rem' }} onClick={() => navigate('/signin')}>
            Sign in
          </button>
          <button className='g-btn' style={{ padding: '0.45rem 1.1rem', fontSize: '0.85rem' }} onClick={() => navigate('/signup')}>
            Sign up
          </button>
        </div>
      </nav>

      {/* ════════ 1 · HERO ════════ */}
      <section style={{
        ...surface(false),
        position: 'relative', zIndex: 1,
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '88px 1.25rem 4rem'
      }}>
        <div
          ref={heroRef}
          className='g-card'
          style={{
            maxWidth: 560, width: '100%', textAlign: 'center',
            padding: 'clamp(2rem, 5vw, 3.5rem)',
            border: '1px solid var(--brand-glow)',
            boxShadow: '0 0 60px rgba(124,58,237,0.10), inset 0 0 60px rgba(124,58,237,0.04)'
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🍽️</div>
          <h1 className='grad-text' style={{ fontSize: 'clamp(2.2rem, 6vw, 3.5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '0.5rem' }}>
            GroDel
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 500 }}>
            Food. Community. Heart.
          </p>
          <p style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.75rem' }}>
            Order from local kitchens, buy fresh produce from farmers, and send surplus food to
            someone who needs it — all in one place.
          </p>

          {/* Search + voice */}
          <form
            onSubmit={(event) => { event.preventDefault(); goToSearch(searchTerm) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1.5px solid var(--glass-border)',
              borderRadius: '999px', padding: '0.35rem 0.35rem 0.35rem 1rem',
              marginBottom: '1.5rem'
            }}
          >
            <span aria-hidden='true'>🔍</span>
            <input
              className='notranslate'
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.9rem' }}
              placeholder={listening ? 'Listening…' : 'Search a dish, e.g. biryani'}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label='Search food'
            />
            <button
              type='button'
              onClick={startVoiceSearch}
              className={`g-btn-icon${listening ? ' anim-pulse-glow' : ''}`}
              title='Search by voice'
              aria-label='Search by voice'
              style={listening ? { color: 'var(--accent-text)', borderColor: 'var(--brand-glow)' } : undefined}
            >
              🎤
            </button>
          </form>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className='g-btn' style={{ fontSize: '0.95rem', padding: '0.75rem 2rem' }} onClick={() => navigate('/signup')}>
              Get started free
            </button>
            <button className='g-btn-ghost' style={{ fontSize: '0.95rem', padding: '0.75rem 2rem' }} onClick={() => navigate('/signin')}>
              Sign in
            </button>
          </div>
          <p style={{ marginTop: '1.25rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>No credit card required</p>
        </div>

        <div style={{ position: 'absolute', bottom: '1.75rem', left: '50%', transform: 'translateX(-50%)', fontSize: '1.5rem', animation: 'floatB 2s ease-in-out infinite', color: 'var(--brand)' }} aria-hidden='true'>
          ⌄
        </div>
      </section>

      {/* ════════ 2 · WHAT IS GRODEL ════════ */}
      <section className='g-section' style={{ ...surface(true), position: 'relative', zIndex: 1 }}>
        <div className='g-container'>
          <h2 ref={whatRef} style={{ textAlign: 'center', fontWeight: 800, fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', marginBottom: '0.75rem' }}>
            Everything food, <span className='grad-text'>in one place</span>
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
            GroDel brings together kitchens, local farmers, community kitchens and food banks
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {VALUE_CARDS.map((item, index) => (
              <div key={item.title} className='g-card stagger-item' style={{ padding: '1.75rem 1.5rem', textAlign: 'center', animationDelay: `${index * 100}ms` }}>
                <div style={{ fontSize: '2.4rem', marginBottom: '0.75rem' }}>{item.emoji}</div>
                <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '1.05rem', color: 'var(--text-primary)' }}>{item.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ 3 · HOW IT WORKS ════════ */}
      <section className='g-section' style={{ ...surface(false), position: 'relative', zIndex: 1 }}>
        <div className='g-container' style={{ maxWidth: 900 }}>
          <h2 ref={howRef} style={{ textAlign: 'center', fontWeight: 800, fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', marginBottom: '3rem' }}>
            How <span className='grad-text'>GroDel</span> works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
            {HOW_STEPS.map((step, index) => (
              <div key={step.num} className='stagger-item' style={{ textAlign: 'center', animationDelay: `${index * 120}ms` }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', margin: '0 auto 1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, var(--accent-soft), rgba(255,140,66,0.2))',
                  border: '1.5px solid var(--brand-glow)', fontSize: '1.7rem'
                }}>
                  {step.icon}
                </div>
                <div className='g-eyebrow' style={{ marginBottom: '0.35rem' }}>STEP {step.num}</div>
                <h3 style={{ fontWeight: 700, marginBottom: '0.4rem', fontSize: '1rem', color: 'var(--text-primary)' }}>{step.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ 4 · ROLES ════════ */}
      <section className='g-section' style={{ ...surface(true), position: 'relative', zIndex: 1 }}>
        <div className='g-container'>
          <h2 ref={rolesRef} style={{ textAlign: 'center', fontWeight: 800, fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', marginBottom: '0.75rem' }}>
            Who are <span className='grad-text'>you?</span>
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
            GroDel is built for every person in the food community
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {ROLES.map((role, index) => (
              <div key={role.role} className='g-card stagger-item' style={{ padding: '1.75rem', animationDelay: `${index * 80}ms`, borderTop: `3px solid ${role.color}` }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>{role.emoji}</div>
                <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{role.role}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem' }}>{role.tagline}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem' }}>
                  {role.features.map((feature) => (
                    <li key={feature} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', padding: '0.25rem 0', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <span style={{ color: role.color, flexShrink: 0 }}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  className='g-btn'
                  style={{ width: '100%', justifyContent: 'center', background: `linear-gradient(135deg, ${role.color}, ${role.color}cc)`, boxShadow: `0 4px 20px ${role.color}40` }}
                  onClick={joinRole}
                >
                  Join as {role.role}
                </button>
              </div>
            ))}

            {/* Admin seats are capped — the button disappears once they are gone. */}
            <div className='g-card stagger-item' style={{ padding: '1.75rem', animationDelay: `${ROLES.length * 80}ms`, borderTop: `3px solid ${ADMIN_ROLE.color}` }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>{ADMIN_ROLE.emoji}</div>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{ADMIN_ROLE.role}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem' }}>{ADMIN_ROLE.tagline}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem' }}>
                {ADMIN_ROLE.features.map((feature) => (
                  <li key={feature} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', padding: '0.25rem 0', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ color: ADMIN_ROLE.color, flexShrink: 0 }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              {!adminSlots?.full && (
                <button
                  className='g-btn'
                  style={{ width: '100%', justifyContent: 'center', background: `linear-gradient(135deg, ${ADMIN_ROLE.color}, ${ADMIN_ROLE.color}cc)`, boxShadow: `0 4px 20px ${ADMIN_ROLE.color}40` }}
                  onClick={joinRole}
                >
                  Join as Admin
                </button>
              )}
              {adminSlots && (
                <p className='g-muted' style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                  {adminSlots.current}/{adminSlots.max} admin seats taken
                  {adminSlots.full ? ' — the founder manages the rest' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ════════ 5 · AI ════════ */}
      <section className='g-section' style={{ ...surface(false), position: 'relative', zIndex: 1 }}>
        <div className='g-container' style={{ maxWidth: 900 }}>
          <h2 ref={aiRef} style={{ textAlign: 'center', fontWeight: 800, fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', marginBottom: '0.75rem' }}>
            <span className='grad-text'>AI-powered</span> for everyone
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '0.9rem' }}>
            Assistants that do the boring part of ordering, listing and selling
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            {AI_FEATURES.map((feature, index) => (
              <div key={feature.title} className='g-card stagger-item' style={{ padding: '1.5rem', animationDelay: `${index * 100}ms` }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{feature.emoji}</div>
                <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>{feature.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ 6 · GAMES ════════ */}
      <section className='g-section' style={{ ...surface(true), position: 'relative', zIndex: 1, padding: 'clamp(2.5rem, 6vw, 5rem) 1rem' }}>
        <div className='g-container' style={{ maxWidth: 900 }}>
          <h2 ref={gamesRef} style={{ textAlign: 'center', fontWeight: 800, fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', marginBottom: '0.5rem' }}>
            Stay entertained <span className='grad-text'>while you wait</span>
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.75rem' }}>
            Earn coins playing games and redeem them as discounts
          </p>
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {GAMES.map((game, index) => (
              <div key={game.name} className='g-card stagger-item' style={{ minWidth: 130, padding: '1.25rem 1rem', textAlign: 'center', flexShrink: 0, animationDelay: `${index * 80}ms` }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{game.emoji}</div>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>{game.name}</p>
                <span className='g-badge g-badge-brand'>Earn coins!</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ 7 · STATS ════════ */}
      <section ref={statsRef} className='g-section' style={{ ...surface(false), position: 'relative', zIndex: 1, padding: 'clamp(2.5rem, 6vw, 4rem) 1rem' }}>
        <div className='g-container' style={{ maxWidth: 800, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.5rem', textAlign: 'center' }}>
          {STATS.map((stat, index) => (
            <div key={stat.label}>
              <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>{stat.emoji}</div>
              <div className='grad-text' style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900 }}>
                {counts[index]}+
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════ 8 · CTA ════════ */}
      <section className='g-section' style={{ ...surface(true), position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div ref={ctaRef} className='g-card' style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(2rem, 5vw, 3.5rem)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', marginBottom: '0.75rem' }}>
            Ready to join <span className='grad-text'>GroDel</span>?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
            Join the customers, kitchen owners, farmers and delivery partners already on the platform.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className='g-btn' style={{ fontSize: '0.95rem', padding: '0.75rem 2rem' }} onClick={() => navigate('/signup')}>
              Sign up free
            </button>
            <button className='g-btn-ghost' style={{ fontSize: '0.95rem', padding: '0.75rem 2rem' }} onClick={() => navigate('/signin')}>
              Sign in
            </button>
          </div>
        </div>
      </section>

      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--glass-border)', padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        <span className='grad-text' style={{ fontWeight: 800, fontSize: '1rem' }}>GroDel</span>
        <p style={{ marginTop: '0.4rem' }}>© {new Date().getFullYear()} GroDel. Built with ❤️ for local communities.</p>
      </footer>
    </div>
  )
}

export default LandingPage

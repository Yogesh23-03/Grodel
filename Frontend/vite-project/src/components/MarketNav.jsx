import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  HiOutlineHome, HiOutlineBuildingStorefront, HiOutlineHeart, HiOutlineCalendarDays,
  HiOutlineMagnifyingGlass, HiOutlineShoppingBag, HiOutlineSun, HiOutlineMoon,
  HiOutlineLanguage, HiOutlinePlusCircle, HiOutlineSquares2X2, HiOutlineTruck,
  HiOutlineDocumentText, HiOutlineUserGroup, HiOutlineGift, HiOutlineBuildingLibrary,
  HiOutlineShieldCheck, HiOutlineArrowRightOnRectangle, HiOutlineXMark,
  HiOutlineBell, HiOutlineInbox
} from 'react-icons/hi2'
import { dm } from '../api/dm'
import axios from 'axios'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { serverUrl } from '../App'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { setSearchItems, setUserData } from '../redux/userSlice'

const languageNames = {
  en: 'English', hi: 'हिंदी', kn: 'ಕನ್ನಡ', ta: 'தமிழ்', te: 'తెలుగు', ml: 'മലയാളം',
  bn: 'বাংলা', mr: 'मराठी', gu: 'ગુજરાતી', pa: 'ਪੰਜਾਬੀ', or: 'ଓଡ଼ିଆ',
  es: 'Español', fr: 'Français', de: 'Deutsch', ar: 'العربية'
}

/* The four product modes. Each carries its own accent pair from the token
   system, so the chrome itself teaches the marketplace's geography. */
const MODES = [
  { key: 'eat', path: '/', match: p => p === '/', Icon: HiOutlineHome, color: 'var(--accent-2)', soft: 'var(--accent-2-soft)' },
  { key: 'market', path: '/vendors/nearby', match: p => p.startsWith('/vendor') || p.startsWith('/farmer') || p.startsWith('/buyer'), Icon: HiOutlineBuildingStorefront, color: 'var(--vendor)', soft: 'var(--vendor-soft)', labelKey: 'nav.farmersMode', labelDefault: 'Farmers' },
  { key: 'rescue', path: '/donate-food', match: p => p.startsWith('/donate') || p.startsWith('/my-donations') || p.startsWith('/trusts'), Icon: HiOutlineHeart, color: 'var(--rescue)', soft: 'var(--rescue-soft)' },
  { key: 'plan', path: '/meal-schedule', match: p => p.startsWith('/meal-schedule'), Icon: HiOutlineCalendarDays, color: 'var(--plan)', soft: 'var(--plan-soft)' }
]

function MarketNav() {
  const { userData, currentCity, cartItems, socket } = useSelector(state => state.user)
  const { t } = useTranslation()
  const { language, setLanguage, isTranslating, supportedLanguages } = useLanguage()
  const { isDark, toggleTheme } = useTheme()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const [sheet, setSheet] = useState('') // '' | 'search' | 'you' | 'bell'
  const [query, setQuery] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const searchInputRef = useRef(null)

  const isCustomer = userData?.role === 'user'
  const canRescue = ['user', 'owner', 'supplier', 'deliveryBoy', 'trustMember', 'admin'].includes(userData?.role)
  // Direct Market Access: farmers (vendor role) and onboarded buyers get the DM chrome.
  const isDmUser = userData?.role === 'vendor' || userData?.buyerProfile?.onboardingComplete

  const modeItems = MODES.filter(mode => {
    if (mode.key === 'eat') return true // every signed-in role has a home feed
    if (mode.key === 'market') return isCustomer || userData?.role === 'vendor' || userData?.role === 'helper'
    if (mode.key === 'rescue') return canRescue
    return isCustomer
  })

  const workItems = [
    isCustomer && { key: 'myOrders', path: '/my-orders', Icon: HiOutlineDocumentText },
    isDmUser && { key: 'dmInbox', path: '/farmers/inbox', Icon: HiOutlineInbox, label: 'Farmer inbox' },
    isCustomer && { key: 'groupOrders', path: '/my-group-orders', Icon: HiOutlineUserGroup },
    isCustomer && { key: 'myDonations', path: '/my-donations', Icon: HiOutlineGift },
    userData?.role === 'owner' && { key: 'addFoodItem', path: '/add-item', Icon: HiOutlinePlusCircle },
    userData?.role === 'vendor' && { key: 'myShop', path: '/vendor/dashboard', Icon: HiOutlineSquares2X2 },
    userData?.role === 'vendor' && { key: 'addProduct', path: '/vendor/add-produce', Icon: HiOutlinePlusCircle },
    userData?.role === 'deliveryBoy' && { key: 'deliveries', path: '/', Icon: HiOutlineTruck },
    ['trustMember', 'admin'].includes(userData?.role) && { key: 'trusts', path: '/trusts', Icon: HiOutlineBuildingLibrary },
    userData?.role === 'admin' && { key: 'admin', path: '/admin', Icon: HiOutlineShieldCheck }
  ].filter(Boolean)

  const isActive = mode => mode.match(location.pathname)

  /* --- search: same redux pipeline the old nav used --- */
  const runSearch = useCallback(async (value) => {
    try {
      const params = new URLSearchParams({ query: value, city: currentCity || '' })
      const result = await axios.get(`${serverUrl}/api/item/searchitems?${params.toString()}`, { withCredentials: true })
      if (value.trim()) dispatch(setSearchItems(result.data))
    } catch (error) { console.log(error) }
  }, [currentCity, dispatch])

  useEffect(() => {
    if (query) runSearch(query)
    else dispatch(setSearchItems(null))
  }, [dispatch, runSearch, query])

  useEffect(() => {
    if (sheet === 'search') {
      const id = window.setTimeout(() => searchInputRef.current?.focus(), 60)
      return () => window.clearTimeout(id)
    }
  }, [sheet])

  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') setSheet('') }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  /* --- notification bell: unread count + realtime pushes --- */
  useEffect(() => {
    if (!isDmUser) return
    dm.get('/notifications')
      .then(res => {
        setNotifications(res.data?.notifications || [])
        setUnreadCount(res.data?.unreadCount || 0)
      })
      .catch(() => {})
  }, [isDmUser])

  useEffect(() => {
    if (!socket) return
    const handler = () => setUnreadCount(count => count + 1)
    socket.on('notification', handler)
    return () => socket.off('notification', handler)
  }, [socket])

  const submitSearch = event => {
    event.preventDefault()
    setSheet('')
    navigate('/')
  }

  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/signout`, { withCredentials: true })
      dispatch(setUserData(null))
      setSheet('')
    } catch (error) { console.log(error) }
  }

  const modeLabel = mode => (mode.labelKey ? t(mode.labelKey, mode.labelDefault) : t(`nav.${mode.key}Mode`))

  const ModeButton = ({ mode, withLabel }) => {
    const active = isActive(mode)
    return (
      <button
        onClick={() => navigate(mode.path)}
        aria-label={modeLabel(mode)}
        aria-current={active ? 'page' : undefined}
        title={modeLabel(mode)}
        className='flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-all active:scale-95'
        style={active
          ? { background: mode.soft, color: mode.color, width: withLabel ? '3.9rem' : '3rem', padding: withLabel ? '0.45rem 0' : '0.55rem 0' }
          : { color: 'var(--ink-muted)', width: withLabel ? '3.9rem' : '3rem', padding: withLabel ? '0.45rem 0' : '0.55rem 0' }}
      >
        <mode.Icon size={withLabel ? 22 : 23} strokeWidth={active ? 2.2 : 1.7} />
        {withLabel && <span className='text-[10px] font-bold tracking-wide'>{modeLabel(mode)}</span>}
      </button>
    )
  }

  const dockItems = [
    ...modeItems,
    isCustomer && { key: 'cart', node: (
      <button onClick={() => navigate('/cart')} aria-label={t('cart.myCart')} className='relative flex flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-2.5 transition-all active:scale-95' style={{ color: 'var(--ink-muted)' }}>
        <HiOutlineShoppingBag size={22} strokeWidth={1.7} />
        {cartItems.length > 0 && (
          <span className='absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black' style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
            {cartItems.length}
          </span>
        )}
        <span className='text-[10px] font-bold tracking-wide'>{t('cart.basket')}</span>
      </button>
    ) }
  ].filter(Boolean)

  return (
    <>
      {/* ============ Desktop rail ============ */}
      <nav className='rail' aria-label='GroDel navigation'>
        <button onClick={() => navigate('/')} className='notranslate mb-2 flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg transition-transform hover:scale-105 active:scale-95' style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }} aria-label='GroDel home' translate='no'>
          <span className='font-display text-xl font-black' style={{ fontFamily: 'var(--font-display)' }}>G</span>
        </button>

        <div className='flex flex-col gap-1.5'>
          {modeItems.map(mode => <ModeButton key={mode.key} mode={mode} />)}
        </div>

        {workItems.length > 0 && (
          <>
            <div className='my-2 h-px w-8' style={{ background: 'var(--border)' }} />
            <div className='flex flex-col gap-1.5'>
              {workItems.map(item => (
                <button key={item.key} onClick={() => navigate(item.path)} title={item.label || t(`nav.${item.key}`)} aria-label={item.label || t(`nav.${item.key}`)}
                  className='flex h-12 w-12 items-center justify-center rounded-2xl transition-all hover:bg-[var(--surface-2)] active:scale-95'
                  style={{ color: 'var(--ink-muted)' }}>
                  <item.Icon size={21} strokeWidth={1.7} />
                </button>
              ))}
            </div>
          </>
        )}

        <div className='mt-auto flex flex-col items-center gap-1.5'>
          {isDmUser && (
            <button onClick={() => setSheet('bell')} aria-label='Notifications' title='Notifications'
              className='relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all hover:bg-[var(--surface-2)] active:scale-95'
              style={{ color: unreadCount > 0 ? 'var(--accent-2)' : 'var(--ink-muted)' }}>
              <HiOutlineBell size={21} strokeWidth={1.7} />
              {unreadCount > 0 && (
                <span className='absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black' style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}
          {isCustomer && (
            <button onClick={() => setSheet('search')} aria-label={t('nav.searchPlaceholder')} title={t('nav.searchPlaceholder')}
              className='flex h-12 w-12 items-center justify-center rounded-2xl transition-all hover:bg-[var(--surface-2)] active:scale-95'
              style={{ color: 'var(--ink-muted)' }}>
              <HiOutlineMagnifyingGlass size={21} strokeWidth={1.7} />
            </button>
          )}
          {isCustomer && (
            <button onClick={() => navigate('/cart')} aria-label={t('cart.myCart')} title={t('cart.myCart')}
              className='relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all hover:bg-[var(--surface-2)] active:scale-95'
              style={{ color: 'var(--ink-muted)' }}>
              <HiOutlineShoppingBag size={21} strokeWidth={1.7} />
              {cartItems.length > 0 && (
                <span className='absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black' style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
                  {cartItems.length}
                </span>
              )}
            </button>
          )}
          <button onClick={toggleTheme} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} title={isDark ? 'Light mode' : 'Dark mode'}
            className='flex h-12 w-12 items-center justify-center rounded-2xl transition-all hover:bg-[var(--surface-2)] active:scale-95'
            style={{ color: 'var(--warning)' }}>
            {isDark ? <HiOutlineSun size={21} strokeWidth={1.8} /> : <HiOutlineMoon size={21} strokeWidth={1.8} />}
          </button>
          <button onClick={() => setLanguage(isTranslating ? language : (language === 'en' ? 'hi' : 'en'))} disabled={isTranslating}
            aria-label={t('nav.selectLanguage')} title={t('nav.selectLanguage')}
            className='notranslate flex h-12 w-12 items-center justify-center rounded-2xl text-[11px] font-black uppercase transition-all hover:bg-[var(--surface-2)] active:scale-95 disabled:opacity-60'
            style={{ color: 'var(--ink-muted)' }} translate='no'>
            {isTranslating ? '…' : language}
          </button>
          <button onClick={() => setSheet('you')} aria-label={t('nav.you')} title={t('nav.you')}
            className='mt-1 flex h-10 w-10 items-center justify-center rounded-full text-sm font-black shadow-lg transition-transform hover:scale-105 active:scale-95'
            style={{ background: 'var(--vendor)', color: '#1c1006' }} translate='no'>
            {userData?.fullName?.trim()?.charAt(0)?.toUpperCase() || '?'}
          </button>
        </div>
      </nav>

      {/* ============ Mobile dock ============ */}
      <nav className='dock' aria-label='GroDel navigation'>
        {dockItems.map(item => item.node
          ? <React.Fragment key={item.key}>{item.node}</React.Fragment>
          : <ModeButton key={item.key} mode={item} withLabel />)}
        {isDmUser && (
          <button onClick={() => setSheet('bell')} aria-label='Notifications'
            className='relative flex flex-col items-center justify-center gap-0.5 rounded-2xl px-2.5 py-2.5 transition-all active:scale-95'
            style={{ color: unreadCount > 0 ? 'var(--accent-2)' : 'var(--ink-muted)' }}>
            <HiOutlineBell size={22} strokeWidth={1.7} />
            {unreadCount > 0 && (
              <span className='absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black' style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            <span className='text-[10px] font-bold tracking-wide'>Alerts</span>
          </button>
        )}
        <button onClick={() => setSheet('you')} aria-label={t('nav.you')}
          className='flex flex-col items-center justify-center gap-0.5 rounded-2xl px-2.5 py-2.5 transition-all active:scale-95'>
          <span className='flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black'
            style={{ background: 'var(--vendor)', color: '#1c1006' }} translate='no'>
            {userData?.fullName?.trim()?.charAt(0)?.toUpperCase() || '?'}
          </span>
          <span className='text-[10px] font-bold tracking-wide' style={{ color: 'var(--ink-muted)' }}>{t('nav.you')}</span>
        </button>
      </nav>

      {/* ============ Search sheet ============ */}
      {sheet === 'search' && (
        <div className='fixed inset-0 z-[70]' role='dialog' aria-modal='true' aria-label={t('nav.searchTitle')}>
          <div className='absolute inset-0' style={{ background: 'var(--overlay)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} onClick={() => setSheet('')} />
          <div className='animate-modal-in grain relative mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-3xl border shadow-2xl' style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
            <form onSubmit={submitSearch} className='flex items-center gap-3 px-5 py-4' style={{ borderBottom: '1px solid var(--border)' }}>
              <HiOutlineMagnifyingGlass size={22} style={{ color: 'var(--accent-2)' }} />
              <input
                ref={searchInputRef}
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={t('nav.searchPlaceholder')}
                aria-label={t('nav.searchPlaceholder')}
                className='w-full bg-transparent text-base outline-none'
                style={{ color: 'var(--ink)' }}
              />
              {query && (
                <button type='button' onClick={() => setQuery('')} aria-label={t('common.close')} style={{ color: 'var(--ink-muted)' }}>
                  <HiOutlineXMark size={20} />
                </button>
              )}
              <button type='submit' className='btn-primary !px-4 !py-2 text-xs'>{t('nav.searchAction')}</button>
            </form>
            <p className='px-5 py-3 text-xs' style={{ color: 'var(--ink-muted)' }}>{t('nav.searchHint')}</p>
          </div>
        </div>
      )}

      {/* ============ Notification bell sheet ============ */}
      {sheet === 'bell' && (
        <div className='fixed inset-0 z-[70]' role='dialog' aria-modal='true' aria-label='Notifications'>
          <div className='absolute inset-0' style={{ background: 'var(--overlay)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} onClick={() => setSheet('')} />
          <div className='pointer-events-none absolute inset-0 flex items-end justify-center sm:items-center sm:p-6'>
            <div className='animate-modal-in pointer-events-auto relative w-full overflow-hidden rounded-t-3xl border shadow-2xl sm:w-96 sm:rounded-3xl'
              style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
              <div className='flex items-center justify-between px-5 pb-2 pt-4'>
                <p className='t-title'>Notifications</p>
                <div className='flex items-center gap-2'>
                  {unreadCount > 0 && (
                    <button onClick={() => dm.patch('/notifications/read').then(() => { setUnreadCount(0); setNotifications(list => list.map(n => ({ ...n, read: true }))) })}
                      className='rounded-full px-3 py-1.5 text-xs font-bold' style={{ background: 'var(--surface-2)', color: 'var(--accent-2)' }}>
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setSheet('')} aria-label='Close' style={{ color: 'var(--ink-muted)' }} className='sm:hidden'>
                    <HiOutlineXMark size={22} />
                  </button>
                </div>
              </div>
              <div className='max-h-[60vh] space-y-1 overflow-y-auto px-3 pb-4'>
                {notifications.length === 0 && (
                  <p className='px-4 py-10 text-center text-sm' style={{ color: 'var(--ink-muted)' }}>
                    Quiet for now. Offers, orders and price alerts land here.
                  </p>
                )}
                {notifications.map(n => (
                  <button key={n._id} onClick={() => { setSheet(''); if (n.link) navigate(n.link) }}
                    className='block w-full rounded-2xl px-3 py-2.5 text-left transition-all hover:bg-[var(--surface-2)]'
                    style={{ background: n.read ? 'transparent' : 'var(--accent-soft)' }}>
                    <p className='text-sm font-bold' style={{ color: 'var(--ink)' }}>{n.title}</p>
                    {n.body && <p className='mt-0.5 line-clamp-2 text-xs' style={{ color: 'var(--ink-muted)' }}>{n.body}</p>}
                    <p className='mt-0.5 text-[10px]' style={{ color: 'var(--ink-faint)' }}>{new Date(n.at).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ Profile / utility sheet ============ */}
      {sheet === 'you' && (
        <div className='fixed inset-0 z-[70]' role='dialog' aria-modal='true' aria-label={t('nav.you')}>
          <div className='absolute inset-0' style={{ background: 'var(--overlay)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} onClick={() => setSheet('')} />
          <div className='pointer-events-none absolute inset-0 flex items-end justify-center sm:items-center sm:p-6'>
          <div className='animate-modal-in grain pointer-events-auto relative w-full overflow-hidden rounded-t-3xl border shadow-2xl sm:w-96 sm:rounded-3xl'
            style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
            <div className='mx-auto mt-3 h-1 w-10 rounded-full sm:hidden' style={{ background: 'var(--border-strong)' }} />
            <div className='flex items-center justify-between px-5 pb-3 pt-4'>
              <div className='notranslate flex items-center gap-3' translate='no'>
                <span className='flex h-11 w-11 items-center justify-center rounded-full text-base font-black' style={{ background: 'var(--vendor)', color: '#1c1006' }}>
                  {userData?.fullName?.trim()?.charAt(0)?.toUpperCase() || '?'}
                </span>
                <div className='min-w-0'>
                  <p className='truncate font-bold' style={{ color: 'var(--ink)' }}>{userData?.fullName || t('common.loading')}</p>
                  <p className='text-xs capitalize' style={{ color: 'var(--ink-muted)' }}>{userData?.role || ''}</p>
                </div>
              </div>
              <button onClick={() => setSheet('')} aria-label={t('common.close')} style={{ color: 'var(--ink-muted)' }} className='sm:hidden'>
                <HiOutlineXMark size={22} />
              </button>
            </div>

            {workItems.length > 0 && (
              <div className='flex flex-wrap gap-2 px-5 pb-4'>
                {workItems.map(item => (
                  <button key={item.key} onClick={() => { setSheet(''); navigate(item.path) }}
                    className='flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95'
                    style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)', border: '1px solid var(--border)' }}>
                    <item.Icon size={14} /> {item.label || t(`nav.${item.key}`)}
                  </button>
                ))}
              </div>
            )}

            <div className='flex items-center justify-between px-5 py-3' style={{ borderTop: '1px solid var(--border)' }}>
              <span className='text-sm font-semibold' style={{ color: 'var(--ink-soft)' }}>{isDark ? 'Dark room' : 'Market day'}</span>
              <button onClick={toggleTheme} className='flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95'
                style={{ background: 'var(--surface-2)', color: 'var(--warning)' }} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
                {isDark ? <HiOutlineSun size={16} /> : <HiOutlineMoon size={16} />} {isDark ? 'Daylight' : 'Night'}
              </button>
            </div>

            <div className='px-5 pb-2 pt-3' style={{ borderTop: '1px solid var(--border)' }}>
              <p className='t-eyebrow mb-2'>{t('nav.language')}</p>
              <div className='grid max-h-36 grid-cols-2 gap-1.5 overflow-y-auto pr-1'>
                {supportedLanguages.map(lang => (
                  <button key={lang.code} onClick={() => setLanguage(lang.code)} translate='no'
                    className={`notranslate truncate rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all ${language === lang.code ? '' : 'hover:bg-[var(--surface-2)]'}`}
                    style={language === lang.code
                      ? { background: 'var(--accent)', color: 'var(--accent-ink)' }
                      : { background: 'var(--surface-2)', color: 'var(--ink-soft)' }}>
                    {languageNames[lang.code] || lang.native}
                  </button>
                ))}
              </div>
            </div>

            <div className='p-5' style={{ borderTop: '1px solid var(--border)' }}>
              {userData
                ? <button onClick={handleLogOut} className='flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold transition-all active:scale-95'
                    style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                    <HiOutlineArrowRightOnRectangle size={17} /> {t('nav.logOut')}
                  </button>
                : <button onClick={() => { setSheet(''); navigate('/signin') }} className='btn-primary w-full'>{t('auth.signIn') || 'Sign in'}</button>}
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MarketNav

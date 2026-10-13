import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FaHandHoldingHeart, FaLocationDot, FaPlus, FaStore } from 'react-icons/fa6'
import { FiShoppingCart } from 'react-icons/fi'
import { HiChevronDown, HiViewGrid } from 'react-icons/hi'
import { IoIosSearch } from 'react-icons/io'
import { MdLanguage } from 'react-icons/md'
import { RxCross2 } from 'react-icons/rx'
import { TbReceipt2 } from 'react-icons/tb'
import { HiMoon, HiSun, HiMicrophone, HiOutlineMicrophone } from 'react-icons/hi2'
import axios from 'axios'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { serverUrl } from '../App'
import { useLanguage } from '../context/LanguageContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'
import { setSearchItems, setUserData } from '../redux/userSlice'

const languageNames = { en: 'English', hi: 'हिंदी', kn: 'ಕನ್ನಡ', ta: 'தமிழ்', te: 'తెలుగు', ml: 'മലയാളം', bn: 'বাংলা', mr: 'मराठी', gu: 'ગુજરાતી', pa: 'ਪੰਜਾਬੀ', or: 'ଓଡ଼ିଆ', es: 'Español', fr: 'Français', de: 'Deutsch', ar: 'العربية' }

function Nav() {
  const { userData, currentCity, cartItems } = useSelector((state) => state.user)
  const { t } = useTranslation()
  const { language, setLanguage, isTranslating, supportedLanguages, currentLanguageObj } = useLanguage()
  const { isDark, toggleTheme } = useTheme()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showFeatures, setShowFeatures] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const dropdownRef = useRef(null)
  const langMenuRef = useRef(null)
  const profileMenuRef = useRef(null)
  const canDonate = ['user', 'owner', 'supplier', 'deliveryBoy'].includes(userData?.role)
  const selectedLanguageName = languageNames[language] || currentLanguageObj?.native || 'English'
  const { transcript, isListening, startListening, stopListening, resetTranscript } = useSpeechRecognition(language)

  const toggleVoiceSearch = () => {
    if (isListening) stopListening()
    else startListening()
  }

  useEffect(() => {
    const handler = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setShowFeatures(false)
      if (!langMenuRef.current?.contains(event.target)) setShowLangMenu(false)
      if (!profileMenuRef.current?.contains(event.target)) setShowInfo(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = useCallback(async (searchQuery) => {
    try {
      const params = new URLSearchParams({ query: searchQuery, city: currentCity || '' })
      const result = await axios.get(`${serverUrl}/api/item/searchitems?${params.toString()}`, { withCredentials: true })
      if (searchQuery.trim()) dispatch(setSearchItems(result.data))
    } catch (error) { console.log(error) }
  }, [currentCity, dispatch])

  useEffect(() => {
    if (query) handleSearch(query)
    else dispatch(setSearchItems(null))
  }, [dispatch, handleSearch, query])

  /* A finished voice transcript becomes the query — the effect above then
     fires the same /api/item/searchitems search a typed query would. */
  useEffect(() => {
    if (!transcript) return
    setQuery(transcript)
    resetTranscript()
  }, [transcript, resetTranscript])

  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/signout`, { withCredentials: true })
      dispatch(setUserData(null))
      setShowInfo(false)
    } catch (error) { console.log(error) }
  }

  const featureGroups = [
    [userData?.role === 'user' && { key: 'groupOrder', path: '/start-group-order', Icon: HiViewGrid }, userData?.role === 'user' && { key: 'mealSchedule', path: '/meal-schedule', Icon: HiViewGrid }, userData && { key: 'localVendors', path: '/vendors/nearby', Icon: FaStore }],
    [canDonate && { key: 'donateFood', path: '/donate-food', Icon: FaHandHoldingHeart }, userData && { key: 'myOrders', path: '/my-orders', Icon: TbReceipt2 }, userData?.role === 'owner' && { key: 'addFoodItem', path: '/add-item', Icon: FaPlus }, userData?.role === 'vendor' && { key: 'myShop', path: '/vendor/dashboard', Icon: FaStore }, userData?.role === 'vendor' && { key: 'addProduct', path: '/vendor/add-produce', Icon: FaPlus }],
    [userData && { key: 'myDonations', path: '/my-donations', Icon: FaHandHoldingHeart }, ['trustMember', 'admin'].includes(userData?.role) && { key: 'trusts', path: '/trusts', Icon: FaHandHoldingHeart }, userData?.role === 'admin' && { key: 'admin', path: '/admin', Icon: HiViewGrid }]
  ].map((group) => group.filter(Boolean)).filter((group) => group.length)

  const goTo = (path) => { navigate(path); setShowFeatures(false) }

  return <header className='sticky top-0 z-[9999] w-full shrink-0 border-b border-white/10 bg-[#07111c]/70 shadow-[0_25px_60px_-40px_rgba(0,0,0,0.75)] backdrop-blur-2xl'>
    <div className='relative mx-auto flex min-h-[80px] w-full max-w-[1440px] items-center justify-between gap-2 px-3 py-3 md:gap-4 md:px-6'>
      {showSearch && userData?.role === 'user' && <div className='absolute inset-x-4 top-full z-50 mt-2 rounded-3xl border border-white/10 bg-[#07111c]/95 p-4 shadow-2xl backdrop-blur-xl md:hidden'>
        <div className='flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-3'><FaLocationDot size={20} className='text-[#ff4d2d]' /><div className='truncate text-sm text-gray-200'>{currentCity || t('nav.currentCity')}</div></div>
        <div className='mt-3 flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-3'><IoIosSearch size={20} className='text-[#ff4d2d]' /><input type='text' placeholder={isListening ? t('nav.listening') : t('nav.searchPlaceholder')} className='w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-400' onChange={(event) => setQuery(event.target.value)} value={query} /><button onClick={toggleVoiceSearch} className={`flex-shrink-0 rounded-full p-1 transition-all ${isListening ? 'anim-pulse-glow bg-[#ff4d2d] text-white' : 'text-gray-400 hover:text-[#ff4d2d]'}`} aria-label={t('nav.voiceSearch')} title={t('nav.voiceSearch')}>{isListening ? <HiMicrophone size={18} /> : <HiOutlineMicrophone size={18} />}</button></div>
      </div>}

      <div className='flex min-w-0 shrink-0 items-center gap-3'><div onClick={() => navigate(userData ? '/home' : '/')} className='notranslate cursor-pointer rounded-2xl border border-cyan-300/20 bg-white/5 px-4 py-2 shadow-[0_0_35px_rgba(34,211,238,0.12)] backdrop-blur-xl transition-transform hover:scale-[1.02]' translate='no' title={userData ? t('nav.home', 'Home') : t('nav.about', 'About GroDel')}><h1 className='gradient-text text-xl font-black tracking-[-0.08em]'>GroDel</h1></div><span className='hidden text-sm font-medium text-gray-300 2xl:block'>{t('nav.freshFood')}</span></div>

      {userData?.role === 'user' && <div className='hidden min-w-[300px] flex-1 items-center justify-center lg:flex'><div className='grid w-full max-w-[620px] grid-cols-[minmax(96px,150px)_minmax(180px,1fr)] items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 shadow-lg backdrop-blur-sm'><div className='flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl bg-white/90 px-3 py-2 text-gray-900'><FaLocationDot size={20} className='shrink-0 text-[#ff4d2d]' /><div className='truncate text-sm font-medium'>{currentCity || t('nav.currentCity')}</div></div><div className='flex min-w-0 items-center gap-2 text-gray-100'><IoIosSearch size={20} className='shrink-0 text-[#ff4d2d]' /><input type='text' placeholder={isListening ? t('nav.listening') : t('nav.searchPlaceholder')} className='min-w-0 w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-400' onChange={(event) => setQuery(event.target.value)} value={query} /><button onClick={toggleVoiceSearch} className={`flex-shrink-0 rounded-full p-1 transition-all ${isListening ? 'anim-pulse-glow bg-[#ff4d2d] text-white' : 'text-gray-400 hover:text-[#ff4d2d]'}`} aria-label={t('nav.voiceSearch')} title={t('nav.voiceSearch')}>{isListening ? <HiMicrophone size={18} /> : <HiOutlineMicrophone size={18} />}</button></div></div></div>}

      <div className='flex shrink-0 items-center justify-end gap-2'>
        {userData?.role === 'user' && <button onClick={() => setShowSearch((value) => !value)} className='p-2 text-[#ff4d2d] md:hidden' aria-label={t('nav.searchPlaceholder')}>{showSearch ? <RxCross2 size={25} /> : <IoIosSearch size={25} />}</button>}
        <div className='relative' ref={dropdownRef}><button onClick={() => setShowFeatures((value) => !value)} className='flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-white/15' aria-label={t('nav.features')}><HiViewGrid size={16} /><span className='hidden md:inline'>{t('nav.features')}</span><HiChevronDown size={14} className={`transition-transform ${showFeatures ? 'rotate-180' : ''}`} /></button>
          {showFeatures && <div className='glass-dark absolute right-0 top-full z-[9999] mt-2 w-[220px] overflow-hidden rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl'>{featureGroups.map((group, index) => <React.Fragment key={index}>{index > 0 && <div className='mx-3 h-px bg-white/5' />}{group.map(({ key, path, Icon }) => <button key={key} onClick={() => goTo(path)} className='flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-300 transition-all hover:bg-white/5 hover:text-white'>{React.createElement(Icon, { size: 16, className: 'text-[#ff4d2d]' })}{t(`nav.${key}`)}</button>)}</React.Fragment>)}</div>}
        </div>
        <button onClick={toggleTheme} className='flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#ffb03d] shadow-sm backdrop-blur-md transition-all hover:bg-white/10 hover:shadow-[0_0_18px_rgba(255,176,61,0.35)] active:scale-95' aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} title={isDark ? 'Light mode' : 'Dark mode'}>{isDark ? <HiSun size={19} /> : <HiMoon size={19} className='text-[#94a3b8]' />}</button>
        <div className='notranslate relative' ref={langMenuRef} translate='no'><button onClick={() => setShowLangMenu((value) => !value)} disabled={isTranslating} className='notranslate flex min-w-[76px] items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur-md transition-all hover:bg-white/10 disabled:cursor-wait disabled:opacity-70' aria-label={t('nav.selectLanguage')} translate='no'><MdLanguage size={18} className='text-[#ff4d2d]' /><span className='hidden sm:inline'>{isTranslating ? t('common.loading') : selectedLanguageName}</span><span className='sm:hidden uppercase'>{isTranslating ? '…' : language}</span><HiChevronDown size={14} className={`text-gray-400 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} /></button>
          {showLangMenu && <div className='notranslate absolute right-0 top-full z-[99999] mt-2 flex max-h-[340px] w-[220px] flex-col gap-1 overflow-y-auto rounded-2xl border border-white/15 bg-[#0b1424]/95 p-2 shadow-2xl backdrop-blur-xl' translate='no'><div className='border-b border-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400'>{t('nav.selectLanguage')}</div>{supportedLanguages.map((lang) => <button key={lang.code} onClick={() => { setLanguage(lang.code); setShowLangMenu(false) }} className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${language === lang.code ? 'bg-[#ff4d2d] text-white shadow' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`} translate='no'><span>{languageNames[lang.code] || lang.native}</span><span className={`text-[10px] ${language === lang.code ? 'text-white/80' : 'text-gray-400'}`}>{lang.label}</span></button>)}</div>}
        </div>
        {userData?.role === 'user' && <button onClick={() => navigate('/cart')} className='relative p-2 text-[#ff4d2d]' aria-label={t('cart.myCart')}><FiShoppingCart size={25} />{cartItems.length > 0 && <span className='absolute right-0 top-0 min-w-4 rounded-full bg-[#ff4d2d] px-1 text-xs font-bold text-white'>{cartItems.length}</span>}</button>}
        <div className='notranslate relative' ref={profileMenuRef} translate='no'><button className='btn-glow notranslate flex h-10 w-10 items-center justify-center text-[18px] shadow-xl' onClick={() => setShowInfo((value) => !value)} aria-label={t('nav.openProfileMenu')} translate='no'>{userData?.fullName?.trim()?.charAt(0)?.toUpperCase() || ''}</button>
          {showInfo && userData && <div className='glass-card absolute right-0 top-full z-[9999] mt-2 flex max-h-[460px] w-[240px] flex-col gap-[10px] overflow-y-auto p-[18px] text-gray-800 shadow-2xl card-3d'><div className='notranslate border-b pb-2 text-[17px] font-bold text-gray-900' translate='no'>{userData.fullName}</div><div className='font-semibold cursor-pointer' style={{ color: '#ff4d2d' }} onClick={() => { navigate('/'); setShowInfo(false) }}>📖 About GroDel</div><div className='cursor-pointer font-semibold text-[#ff4d2d]' onClick={handleLogOut}>{t('nav.logOut')}</div><div className='notranslate border-t border-gray-100 pt-2' translate='no'><p className='mb-2 text-xs font-semibold text-gray-500'>{t('nav.language')}</p><div className='grid max-h-[160px] grid-cols-2 gap-1 overflow-y-auto pr-1'>{supportedLanguages.map((lang) => <button key={lang.code} onClick={() => { setLanguage(lang.code); setShowInfo(false) }} className={`truncate rounded-lg border px-2 py-1.5 text-left text-xs font-semibold transition-all ${language === lang.code ? 'border-[#ff4d2d] bg-[#ff4d2d] text-white' : 'border-gray-200 text-gray-600 hover:border-[#ff4d2d] hover:text-[#ff4d2d]'}`} translate='no'>{languageNames[lang.code] || lang.native}</button>)}</div></div></div>}
        </div>
      </div>
    </div>
  </header>
}

export default Nav

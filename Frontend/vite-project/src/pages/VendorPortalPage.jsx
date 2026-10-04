import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { serverUrl } from '../App'
import { FaCamera, FaMicrophone, FaWhatsapp, FaQrcode, FaStore, FaArrowLeft } from 'react-icons/fa6'
import { useLanguage } from '../context/LanguageContext.jsx'

function VendorPortalPage() {
  const { t } = useTranslation()
  const { language, setLanguage, supportedLanguages } = useLanguage()
  const navigate = useNavigate()
  const [whatsappNumber, setWhatsappNumber] = useState(null)
  const [stats, setStats] = useState({ vendors: 0, produce: 0, orders: 0 })

  useEffect(() => {
    axios.get(`${serverUrl}/api/vendor/whatsapp-info`, { withCredentials: true })
      .then((res) => setWhatsappNumber(res.data?.number))
      .catch(() => setWhatsappNumber(null))

    axios.get(`${serverUrl}/api/vendor/stats`, { withCredentials: true })
      .then((res) => {
        if (res.data?.stats) setStats(res.data.stats)
      })
      .catch(() => setStats({ vendors: 0, produce: 0, orders: 0 }))
  }, [])

  const waDigits = (whatsappNumber || '').replace(/\D/g, '')

  return (
    <div className='w-full min-h-screen bg-[#07111c]'>
      <header className='w-full flex items-center justify-between px-4 py-3 bg-[#07111c]/80 backdrop-blur border-b border-white/10 sticky top-0 z-50'>
        <div className='flex items-center gap-3'>
          <button className='flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-full text-sm' onClick={() => navigate('/')}>
            <FaArrowLeft />
            <span>{t('vendor.back')}</span>
          </button>
          <span className='font-black text-white text-xl tracking-[-0.06em]'>GroDel <span className='text-[#ff4d2d]'>Fresh</span></span>
        </div>
        <button className='bg-[#ff4d2d] text-white px-5 py-2.5 rounded-full font-semibold text-sm' onClick={() => navigate('/vendors/nearby')}>
          {t('vendor.browseButton')}
        </button>
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          aria-label={t('nav.selectLanguage')}
          className='rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none'
        >
          {supportedLanguages.map((lang) => (
            <option key={lang.code} value={lang.code} className='text-gray-900'>
              {lang.native}
            </option>
          ))}
        </select>
      </header>

      {/* Hero */}
      <section className='relative w-full px-4 py-14 max-w-6xl mx-auto overflow-hidden rounded-[2rem] border border-white/10'>
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_15%_80%,rgba(255,77,45,0.16),transparent_30%),linear-gradient(135deg,rgba(17,25,40,0.95),rgba(7,11,20,0.85))]' />
        <div className='relative max-w-3xl mx-auto text-center'>
          <FaStore className='text-[#ff4d2d] text-5xl mx-auto mb-4' />
          <h1 className='text-3xl sm:text-5xl font-black text-white'>{t('vendor.portalTitle')}</h1>
          <p className='text-gray-300 text-lg mt-3'>{t('vendor.portalSubtitle')}</p>
          <div className='flex gap-3 flex-wrap justify-center mt-6'>
            <button onClick={() => navigate('/vendor/register')} className='bg-[#ff4d2d] text-white px-7 py-3 rounded-full font-semibold hover:bg-orange-600'>
              {t('vendor.joinButton')}
            </button>
            <button onClick={() => navigate('/vendors/nearby')} className='border border-white/25 text-white px-7 py-3 rounded-full font-semibold hover:bg-white/10'>
              {t('vendor.browseButton')}
            </button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className='w-full max-w-6xl mx-auto px-4 py-12'>
        <h2 className='text-white text-2xl font-bold text-center mb-8'>{t('vendor.howItWorks')}</h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
          <div className='bg-white/5 border border-white/10 rounded-2xl p-6 text-center'>
            <FaCamera className='text-[#ff4d2d] text-4xl mx-auto mb-3' />
            <h3 className='text-white font-bold text-lg'>{t('vendor.photoListing')}</h3>
            <p className='text-gray-400 text-sm mt-2'>{t('vendor.howPhoto')}</p>
          </div>
          <div className='bg-white/5 border border-white/10 rounded-2xl p-6 text-center'>
            <FaMicrophone className='text-[#ff4d2d] text-4xl mx-auto mb-3' />
            <h3 className='text-white font-bold text-lg'>{t('vendor.voiceRegister')}</h3>
            <p className='text-gray-400 text-sm mt-2'>{t('vendor.howVoice')}</p>
          </div>
          <div className='bg-white/5 border border-white/10 rounded-2xl p-6 text-center'>
            <FaWhatsapp className='text-[#ff4d2d] text-4xl mx-auto mb-3' />
            <h3 className='text-white font-bold text-lg'>{t('vendor.whatsappMode')}</h3>
            <p className='text-gray-400 text-sm mt-2'>{t('vendor.howWhatsapp')}</p>
          </div>
        </div>
      </section>

      {/* WhatsApp card */}
      <section className='w-full max-w-4xl mx-auto px-4 py-12'>
        <div className='bg-white/5 border border-white/10 rounded-2xl p-8 text-center'>
          <FaQrcode className='text-[#ff4d2d] text-4xl mx-auto mb-3' />
          <h2 className='text-white text-xl font-bold'>{t('vendor.whatsappStart')}</h2>
          <p className='text-blue-300 text-sm mt-2'>
            {t('vendor.whatsappNumberLabel')}: <span className='font-semibold'>{whatsappNumber || '—'}</span>
          </p>
          <p className='text-gray-400 text-sm mt-1'>{t('vendor.whatsappInstructions')}</p>
          {waDigits ? (
            <a
              href={`https://wa.me/${waDigits}`}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-block bg-[#25d366]/90 text-[#07111c] px-6 py-3 rounded-full font-semibold mt-4'
            >
              <FaWhatsapp className='inline-block mr-1' /> {t('vendor.openOnWhatsapp')}
            </a>
          ) : null}
        </div>
      </section>

      {/* Stats bar */}
      <section className='w-full max-w-5xl mx-auto px-4 py-10'>
        <h2 className='text-white text-xl font-bold text-center mb-6'>{t('vendor.statsTitle')}</h2>
        <div className='grid grid-cols-3 gap-4'>
          <div className='bg-white/5 border border-white/10 rounded-2xl p-6 text-center'>
            <p className='text-[#ff4d2d] text-4xl font-black'>{stats.vendors}</p>
            <p className='text-gray-400 text-sm mt-1'>{t('vendor.totalVendors')}</p>
          </div>
          <div className='bg-white/5 border border-white/10 rounded-2xl p-6 text-center'>
            <p className='text-[#ff4d2d] text-4xl font-black'>{stats.produce}</p>
            <p className='text-gray-400 text-sm mt-1'>{t('vendor.totalProduce')}</p>
          </div>
          <div className='bg-white/5 border border-white/10 rounded-2xl p-6 text-center'>
            <p className='text-[#ff4d2d] text-4xl font-black'>{stats.orders}</p>
            <p className='text-gray-400 text-sm mt-1'>{t('vendor.totalOrdersFulfilled')}</p>
          </div>
        </div>
      </section>

      {/* ===== REST ===== */}
    </div>
  )
}

export default VendorPortalPage

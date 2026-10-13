import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { serverUrl } from '../App'
import { FaHandshake, FaArrowLeft, FaCheck } from 'react-icons/fa6'

function HelperRegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [form, setForm] = useState({ fullName: '', phoneNumber: '', district: '', state: '', organisation: '' })
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [registered, setRegistered] = useState(null)

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleRegister = async () => {
    if (!form.fullName || !form.phoneNumber) {
      setError(t('vendor.enterPhoneNumber'))
      return
    }
    setProcessing(true)
    setError('')
    try {
      const res = await axios.post(`${serverUrl}/api/vendor/register-helper`, form, { withCredentials: true })
      const email = `${form.phoneNumber.replace(/\D/g, '')}@helper.grodel.local`
      setRegistered({ email, password: form.phoneNumber.replace(/\D/g, ''), fullName: form.fullName })
    } catch (err) {
      setError(err.response?.data?.message || t('common.loading'))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className='w-full min-h-screen bg-[#fff9f6]'>
      <header className='glass-dark w-full flex items-center px-4 py-3 text-white'>
        <button className='flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full text-sm' onClick={() => navigate('/vendor/register')}>
          <FaArrowLeft />
          <span>{t('vendor.back')}</span>
        </button>
        <span className='ml-3 font-black text-white text-xl'>GroDel <span className='text-[#ff4d2d]'>Fresh</span></span>
      </header>

      <div className='max-w-xl mx-auto px-4 py-8'>
        <FaHandshake className='text-[#ff4d2d] text-4xl mx-auto' />
        <h1 className='text-2xl font-bold text-[#07111c] mt-3'>{t('vendor.helperRegistrationTitle')}</h1>
        <p className='text-gray-500 text-sm mt-1'>{t('vendor.helperRegistrationSubtitle')}</p>

        {registered ? (
          <div className='glass-card border border-gray-100 p-8 text-center mt-6 card-3d'>
            <FaCheck className='text-[#ff4d2d] text-5xl mx-auto' />
            <h2 className='text-xl font-bold text-green-600 mt-3'>{t('vendor.registrationSuccess')}</h2>
            <p className='text-gray-500 text-sm mt-2'>{t('vendor.loginHint')}</p>
            <div className='bg-gray-50 rounded-xl p-4 text-left mt-4'>
              <p className='text-sm font-semibold text-gray-600'>{t('vendor.loginEmail')}</p>
              <p className='font-mono break-all'>{registered.email}</p>
              <p className='text-sm font-semibold text-gray-600 mt-2'>{t('vendor.loginPassword')}</p>
              <p className='font-mono'>{registered.password}</p>
            </div>
            <button className='btn-glow px-7 py-3 mt-5' onClick={() => navigate('/signin')}>
              {t('vendor.goToLogin')}
            </button>
          </div>
        ) : (
          <div className='glass-card border border-gray-100 p-6 mt-6 flex flex-col gap-3 card-3d'>
            <input value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} placeholder={t('vendor.helperName')} className='glass-input w-full' />
            <input value={form.phoneNumber} onChange={(e) => updateField('phoneNumber', e.target.value)} placeholder={t('vendor.vendorPhone')} type='tel' className='glass-input w-full' />
            <input value={form.district} onChange={(e) => updateField('district', e.target.value)} placeholder={t('vendor.district')} className='glass-input w-full' />
            <input value={form.state} onChange={(e) => updateField('state', e.target.value)} placeholder={t('vendor.state')} className='glass-input w-full' />
            <input value={form.organisation} onChange={(e) => updateField('organisation', e.target.value)} placeholder={t('vendor.helperOrg')} className='glass-input w-full' />
            {error && <p className='text-red-500 text-sm'>{error}</p>}
            <button className='btn-glow w-full px-5 py-3' onClick={handleRegister} disabled={processing}>
              {processing ? t('vendor.processingVoice') : t('vendor.registerVendor')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default HelperRegisterPage
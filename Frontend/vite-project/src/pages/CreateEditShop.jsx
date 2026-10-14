import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FaUtensils } from "react-icons/fa"
import axios from 'axios'
import { serverUrl } from '../App'
import { setMyShopData } from '../redux/ownerSlice'
import GlowSpinner from '../components/ui/GlowSpinner.jsx'
import { HiOutlineArrowLeft, HiOutlineBuildingStorefront } from 'react-icons/hi2'
import MarketNav from '../components/MarketNav.jsx'

function CreateEditShop() {
  const navigate = useNavigate()
  const { myShopData } = useSelector(state => state.owner)
  const { currentCity, currentState, currentAddress } = useSelector(state => state.user)
  const [name, setName] = useState(myShopData?.name || "")
  const [address, setAddress] = useState(myShopData?.address || currentAddress)
  const [city, setCity] = useState(myShopData?.city || currentCity)
  const [state, setState] = useState(myShopData?.state || currentState)
  const [frontendImage, setFrontendImage] = useState(myShopData?.image || null)
  const [backendImage, setBackendImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const dispatch = useDispatch()

  const handleImage = (e) => {
    const file = e.target.files[0]
    setBackendImage(file)
    setFrontendImage(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("name", name)
      formData.append("city", city)
      formData.append("state", state)
      formData.append("address", address)
      if (backendImage) {
        formData.append("image", backendImage)
      }
      const result = await axios.post(`${serverUrl}/api/shop/create-edit`, formData, { withCredentials: true })
      dispatch(setMyShopData(result.data))
      setLoading(false)
      navigate("/")
    } catch (error) {
      console.log(error)
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen lg:pl-[76px]'>
      <MarketNav />
      <main className='mx-auto w-full max-w-lg px-4 pb-16 pt-6 sm:px-6'>
        <header className='flex items-center gap-3'>
          <button onClick={() => navigate("/")} className='btn-ghost !h-10 !w-10 !p-0' aria-label='Back'>
            <HiOutlineArrowLeft size={18} />
          </button>
          <div>
            <p className='t-eyebrow' style={{ color: 'var(--accent-2)' }}>Kitchen</p>
            <h1 className='t-title mt-0.5'>{myShopData ? 'Edit shop' : 'Open your shop'}</h1>
          </div>
        </header>

        <form className='grain card mt-6 space-y-5 p-5 sm:p-6 card-3d' onSubmit={handleSubmit}>
          <div className='flex items-center gap-4'>
            <span className='mode-eat flex h-14 w-14 items-center justify-center rounded-2xl'>
              <HiOutlineBuildingStorefront className='text-2xl' />
            </span>
            <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>
              {myShopData
                ? 'Keep your shopfront accurate — this is what customers see first.'
                : 'Name your kitchen, pin it to a neighbourhood, and the market will find you.'}
            </p>
          </div>

          <label className='block'>
            <span className='t-eyebrow mb-1.5 block'>Shop name</span>
            <input type="text" placeholder='Enter shop name' className='w-full px-3 py-2'
              onChange={(e) => setName(e.target.value)}
              value={name}
            />
          </label>

          <label className='block'>
            <span className='t-eyebrow mb-1.5 block'>Shop image</span>
            <input type="file" accept='image/*' className='w-full px-3 py-2' onChange={handleImage} />
            {frontendImage && (
              <img src={frontendImage} alt="" className='mt-3 h-48 w-full rounded-2xl object-cover' style={{ border: '1px solid var(--border)' }} />
            )}
          </label>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <label className='block'>
              <span className='t-eyebrow mb-1.5 block'>City</span>
              <input type="text" placeholder='City' className='w-full px-3 py-2' onChange={(e) => setCity(e.target.value)}
                value={city} />
            </label>
            <label className='block'>
              <span className='t-eyebrow mb-1.5 block'>State</span>
              <input type="text" placeholder='State' className='w-full px-3 py-2' onChange={(e) => setState(e.target.value)}
                value={state} />
            </label>
          </div>

          <label className='block'>
            <span className='t-eyebrow mb-1.5 block'>Address</span>
            <input type="text" placeholder='Enter shop address' className='w-full px-3 py-2' onChange={(e) => setAddress(e.target.value)}
              value={address} />
          </label>

          <button className='btn-primary w-full' disabled={loading}>
            {loading ? <GlowSpinner size={20} /> : (myShopData ? 'Save changes' : 'Open shop')}
          </button>
        </form>
      </main>
    </div>
  )
}

export default CreateEditShop

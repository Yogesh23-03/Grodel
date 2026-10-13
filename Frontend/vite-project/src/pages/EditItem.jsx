import React, { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { FaUtensils } from "react-icons/fa"
import axios from 'axios'
import { serverUrl } from '../App'
import { setMyShopData } from '../redux/ownerSlice'
import { ClipLoader } from 'react-spinners'
import { HiOutlineArrowLeft } from 'react-icons/hi2'
import MarketNav from '../components/MarketNav.jsx'
import AIDescriptionWriter from '../components/AIDescriptionWriter.jsx'

function EditItem() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { itemId } = useParams()
  const [currentItem, setCurrentItem] = useState(null)
  const [name, setName] = useState("")
  const [price, setPrice] = useState(0)
  const [frontendImage, setFrontendImage] = useState("")
  const [backendImage, setBackendImage] = useState(null)
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [foodType, setFoodType] = useState("")
  const [loading, setLoading] = useState(false)
  const categories = ["Snacks", "Main Course", "Desserts", "Pizza", "Burgers", "Sandwiches", "South Indian", "North Indian", "Chinese", "Fast Food", "Others"]

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
      formData.append("category", category)
      formData.append("foodType", foodType)
      formData.append("price", price)
      formData.append("description", description)
      if (backendImage) {
        formData.append("image", backendImage)
      }
      const result = await axios.post(`${serverUrl}/api/item/edititem/${itemId}`, formData, { withCredentials: true })
      dispatch(setMyShopData(result.data))
      setLoading(false)
      navigate("/")
    } catch (error) {
      console.log(error)
      setLoading(false)
    }
  }

  useEffect(() => {
    const handleGetItemById = async () => {
      try {
        const result = await axios.get(`${serverUrl}/api/item/getbyid/${itemId}`, { withCredentials: true })
        setCurrentItem(result.data)
      } catch (error) {
        console.log(error)
      }
    }
    handleGetItemById()
  }, [itemId])

  useEffect(() => {
    setName(currentItem?.name || "")
    setPrice(currentItem?.price || 0)
    setCategory(currentItem?.category || "")
    setDescription(currentItem?.description || "")
    setFoodType(currentItem?.foodType || "")
    setFrontendImage(currentItem?.image || "")
  }, [currentItem])

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
            <h1 className='t-title mt-0.5'>Edit food</h1>
          </div>
        </header>

        <form className='grain card mt-6 space-y-5 p-5 sm:p-6 card-3d' onSubmit={handleSubmit}>
          <div className='flex items-center gap-4'>
            <span className='mode-eat flex h-14 w-14 items-center justify-center rounded-2xl'>
              <FaUtensils className='text-2xl' />
            </span>
            <p className='text-sm' style={{ color: 'var(--ink-muted)' }}>
              Editing <span className='font-bold' style={{ color: 'var(--ink)' }}>{currentItem?.name || '…'}</span>. Changes go live right away.
            </p>
          </div>

          <label className='block'>
            <span className='t-eyebrow mb-1.5 block'>Name</span>
            <input type="text" placeholder='Enter item name' className='w-full px-3 py-2'
              onChange={(e) => setName(e.target.value)}
              value={name}
            />
          </label>

          <label className='block'>
            <span className='t-eyebrow mb-1.5 block'>Food image</span>
            <input type="file" accept='image/*' className='w-full px-3 py-2' onChange={handleImage} />
            {frontendImage && (
              <img src={frontendImage} alt="" className='mt-3 h-48 w-full rounded-2xl object-cover' style={{ border: '1px solid var(--border)' }} />
            )}
          </label>

          <label className='block'>
            <span className='t-eyebrow mb-1.5 block'>Price (₹)</span>
            <input type="number" placeholder='0' className='w-full px-3 py-2'
              onChange={(e) => setPrice(e.target.value)}
              value={price}
            />
          </label>

          <label className='block'>
            <span className='t-eyebrow mb-1.5 block'>Category</span>
            <select className='w-full px-3 py-2'
              onChange={(e) => setCategory(e.target.value)}
              value={category}
            >
              <option value="">Select category</option>
              {categories.map((cate, index) => (
                <option value={cate} key={index}>{cate}</option>
              ))}
            </select>
          </label>

          <div>
            <span className='t-eyebrow mb-1.5 block'>Food type</span>
            <div className='grid grid-cols-2 gap-3'>
              <button type='button' onClick={() => setFoodType("veg")}
                className='rounded-2xl px-3 py-2.5 text-sm font-bold transition-all'
                style={foodType === "veg"
                  ? { background: 'var(--rescue-soft)', color: 'var(--rescue)', border: '1px solid var(--rescue)' }
                  : { background: 'var(--surface-2)', color: 'var(--ink-muted)', border: '1px solid var(--border-strong)' }}>
                Veg
              </button>
              <button type='button' onClick={() => setFoodType("non veg")}
                className='rounded-2xl px-3 py-2.5 text-sm font-bold transition-all'
                style={foodType === "non veg"
                  ? { background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger)' }
                  : { background: 'var(--surface-2)', color: 'var(--ink-muted)', border: '1px solid var(--border-strong)' }}>
                Non-veg
              </button>
            </div>
          </div>

          <label className='block'>
            <span className='t-eyebrow mb-1.5 block'>Description</span>
            <textarea rows={4} className='w-full px-3 py-2'
              placeholder='Tell customers what makes this dish good (or let the AI write it below)'
              onChange={(e) => setDescription(e.target.value)}
              value={description}
            />
          </label>

          <AIDescriptionWriter
            dishName={name}
            onDescriptionGenerated={(generated) => setDescription(generated?.description || '')}
          />

          <button className='btn-primary w-full' disabled={loading}>
            {loading ? <ClipLoader size={20} color='currentColor' /> : 'Save changes'}
          </button>
        </form>
      </main>
    </div>
  )
}

export default EditItem

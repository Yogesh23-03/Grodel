import axios from 'axios'
import React from 'react'
import { FaPen, FaTrashCan } from 'react-icons/fa6'
import { useNavigate } from 'react-router-dom'
import { serverUrl } from '../App'
import { useDispatch } from 'react-redux'
import { setMyShopData } from '../redux/ownerSlice'
import { useTranslation } from 'react-i18next'

function OwnerItemCard({ data }) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { t } = useTranslation()

  const handleDelete = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/item/delete/${data._id}`, { withCredentials: true })
      dispatch(setMyShopData(result.data))
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <div className='card card-hover flex overflow-hidden'>
      <div className='w-32 shrink-0 sm:w-36' style={{ background: 'var(--surface-3)' }}>
        <img src={data.image} alt='' className='h-full w-full object-cover' />
      </div>
      <div className='flex flex-1 flex-col justify-between p-4'>
        <div>
          <h2 className='font-display text-base font-semibold' style={{ fontFamily: 'var(--font-display)' }}>{data.name}</h2>
          <p className='mt-0.5 text-xs capitalize' style={{ color: 'var(--ink-muted)' }}>
            {t(`category.${data.category}`, { defaultValue: data.category })} · {data.foodType}
          </p>
        </div>
        <div className='flex items-center justify-between'>
          <span className='font-display text-xl font-black' style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-2)' }}>
            ₹{data.price}
          </span>
          <div className='flex items-center gap-1'>
            <button className='flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95'
              style={{ background: 'var(--surface-2)', color: 'var(--accent-2)' }}
              onClick={() => navigate(`/edit-item/${data._id}`)} aria-label={`Edit ${data.name}`}>
              <FaPen size={14} />
            </button>
            <button className='flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95'
              style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
              onClick={handleDelete} aria-label={`Delete ${data.name}`}>
              <FaTrashCan size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OwnerItemCard

import React, { useState } from 'react'
import { FaMinus } from "react-icons/fa";
import { FaPlus } from "react-icons/fa";
import { CiTrash } from "react-icons/ci";
import { HiOutlineInformationCircle } from "react-icons/hi2";
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { removeCartItem, updateQuantity } from '../redux/userSlice';
import NutritionCard from './NutritionCard.jsx';

function CartItemCard({data}) {
    const dispatch=useDispatch()
    const { t } = useTranslation()
    const [showNutrition, setShowNutrition] = useState(false)
    const handleIncrease=(id,currentQty)=>{
       dispatch(updateQuantity({id,quantity:currentQty+1}))
    }
      const handleDecrease=(id,currentQty)=>{
        if(currentQty>1){
  dispatch(updateQuantity({id,quantity:currentQty-1}))
        }
        
    }
  return (
    <div className='flex items-center justify-between bg-white p-4 rounded-xl shadow border'>
      <div className='flex items-center gap-4'>
        <img src={data.image} alt="" className='w-20 h-20 object-cover rounded-lg border'/>
        <div>
            <div className='flex items-center gap-1.5'>
              <h1 className='font-medium text-gray-800'>{data.name}</h1>
              <button
                onClick={() => setShowNutrition(true)}
                className='text-gray-400 transition-colors hover:text-[color:var(--accent-text)]'
                aria-label={`${t('nutrition.title')} — ${data.name}`}
                title={t('nutrition.title')}
              >
                <HiOutlineInformationCircle size={16} />
              </button>
            </div>
            <p className='text-sm text-gray-500'>₹{data.price} x {data.quantity}</p>
            <p className="font-bold text-gray-900">₹{data.price*data.quantity}</p>
        </div>
      </div>
      <div className='flex items-center gap-3'>
        <button className='p-2 cursor-pointer bg-gray-100 rounded-full hover:bg-gray-200' onClick={()=>handleDecrease(data.id,data.quantity)}>
        <FaMinus size={12}/>
        </button>
        <span>{data.quantity}</span>
        <button className='p-2 cursor-pointer bg-gray-100 rounded-full hover:bg-gray-200'  onClick={()=>handleIncrease(data.id,data.quantity)}>
        <FaPlus size={12}/>
        </button>
        <button className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
 onClick={()=>dispatch(removeCartItem(data.id))}>
<CiTrash size={18}/>
        </button>
      </div>

      <NutritionCard itemName={data.name} isOpen={showNutrition} onClose={() => setShowNutrition(false)} />
    </div>
  )
}

export default CartItemCard

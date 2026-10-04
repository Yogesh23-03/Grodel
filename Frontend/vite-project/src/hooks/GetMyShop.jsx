import axios from 'axios'
import React, { useEffect } from 'react'
import { serverUrl } from '../App'
import { useDispatch, useSelector } from 'react-redux'
import { setUserData } from '../redux/userSlice'
 import { setMyShopData } from '../redux/ownerSlice'

function GetMyshop() {
    const dispatch=useDispatch()
    const {userData}=useSelector(state=>state.user)
  useEffect(()=>{
  if (!userData?._id || userData.role !== "owner") return
  const fetchShop=async () => {
    try {
           const result=await axios.get(`${serverUrl}/api/shop/getmy`,{withCredentials:true})
            dispatch(setMyShopData(result.data))
  
    } catch (error) {
        console.log(error)
    }
}
fetchShop()
 
  },[dispatch,userData?._id,userData?.role])
}

export default GetMyshop

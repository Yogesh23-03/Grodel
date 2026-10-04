import axios from 'axios'
import React, { useEffect } from 'react'
import { serverUrl } from '../App'
import { useDispatch, useSelector } from 'react-redux'
import { setMyOrders, setUserData } from '../redux/userSlice'
import { setMyShopData } from '../redux/ownerSlice'


function GetMyOrders(){
    const dispatch=useDispatch()
    const {userData}=useSelector(state=>state.user)
    useEffect(()=>{
        if(!userData?._id) return
        const fetchOrders=async()=>{
            try{
                const result=await axios.get(`${serverUrl}/api/order/my-orders`,{withCredentials:true})
                dispatch(setMyOrders(result.data))
                console.log(result.data)
            }catch(error){
                console.log(error)
            }
        }
        fetchOrders()
    },[userData])
}

export default GetMyOrders;

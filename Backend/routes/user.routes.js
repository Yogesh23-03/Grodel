const express=require("express")
const { getCurrentUser, updateUserLocation, getAllUsers} = require("../controllers/user.controllers.js")
const isAuth=require("../middlewares/isAuth.js")


const userRouter=express.Router()

userRouter.get("/current",isAuth,getCurrentUser)
userRouter.get("/all",isAuth,getAllUsers)
userRouter.post('/update-location',isAuth,updateUserLocation)

module.exports=userRouter


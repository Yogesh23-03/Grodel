const express=require("express")
const { createEditShop, getMyShop, getShopByCity, getAllShops } = require("../controllers/shop.controllers.js")
const isAuth=require("../middlewares/isAuth.js")
const upload=require("../middlewares/multer.js")




const shopRouter=express.Router()

shopRouter.post("/create-edit",isAuth,upload.single("image"),createEditShop)
shopRouter.get("/getmy",isAuth,getMyShop)
shopRouter.get("/getbycity/:city",getShopByCity)
shopRouter.get("/all",getAllShops)

module.exports=shopRouter
const express=require("express")
const isAuth=require("../middlewares/isAuth.js")
const requireRole=require("../middlewares/requireRole.js")
const {
    addItem, editItem, getItemById, deleteItem, getItemByCity,
    getItemsByShop, searchItems, rating,
    applyDiscount, removeDiscount, applyDiscountToAll
} = require("../controllers/item.controllers.js")
const { generateMenuDescription } = require("../controllers/aiMenuController.js")
const upload=require("../middlewares/multer.js")





const itemRouter=express.Router()

itemRouter.post("/additem",isAuth,upload.single("image"),addItem)
itemRouter.post("/edititem/:itemId",isAuth,upload.single("image"),editItem)
itemRouter.get("/getbyid/:itemId",isAuth,getItemById)
itemRouter.get("/delete/:itemId",isAuth,deleteItem)
itemRouter.get("/getbycity/:city",isAuth,getItemByCity)
itemRouter.get("/getbyshop/:shopId",isAuth,getItemsByShop)
itemRouter.get("/searchitems",isAuth,searchItems)
itemRouter.post("/rating",isAuth,rating)
/* ----- AI menu description writer (owners) -----
   `memoryUpload` keeps the bytes in memory because the vision model needs
   base64, not a file on disk. The image is optional. */
itemRouter.post("/ai-description",isAuth,requireRole("owner"),upload.memoryUpload.single("image"),generateMenuDescription)

/* ----- Discount system (owners) -----
   `discount-all` is a single path segment while the others are two, so it can
   never be swallowed by the `/:itemId/...` patterns. */
itemRouter.patch("/discount-all",isAuth,requireRole("owner"),applyDiscountToAll)
itemRouter.patch("/:itemId/discount",isAuth,requireRole("owner"),applyDiscount)
itemRouter.patch("/:itemId/remove-discount",isAuth,requireRole("owner"),removeDiscount)

module.exports=itemRouter
const Shop=require("../models/shop.Model.js")
const { uploadOnCloudinary } = require("../utils/cloudinary")


const createEditShop=async (req,res) => {
    try {
       const {name,city,state,address}=req.body
       let image;
       if(req.file){
        image=await uploadOnCloudinary(req.file.path)
       } 
       let shop=await Shop.findOne({owner:req.userId})
       if(!shop){
        shop=await Shop.create({
        name,city,state,address,image,owner:req.userId
       })
       }else{
         shop=await Shop.findByIdAndUpdate(shop._id,{
        name,city,state,address,image,owner:req.userId
       },{new:true})
       }
      
       await shop.populate("owner items")
       return res.status(201).json(shop)
    } catch (error) {
        console.error("CREATE SHOP ERROR:", error.message);
        return res.status(500).json({message:`create shop error ${error}`})
    }
}

const getMyShop=async (req,res) => {
    try {
        const shop=await Shop.findOne({owner:req.userId}).populate("owner").populate({
            path:"items",
            options:{sort:{updatedAt:-1}}
        })
        if(!shop){
           return res.status(404).json({ message: "Shop not found" });
        }
        return res.status(200).json(shop)
    } catch (error) {
        return res.status(500).json({message:`get my shop error ${error}`})
    }
}

const getShopByCity = async (req, res) => {
    try {
        const { city } = req.params

        const shops = await Shop.find({
            city: { $regex: city, $options: "i" }
        }).populate("items")

        return res.status(200).json(shops)

    } catch (error) {
        return res.status(500).json({ message: `get shop by city error ${error}` })
    }
}

const getAllShops = async (req, res) => {
    try {
        const shops = await Shop.find({}).populate("items")
        return res.status(200).json(shops)
    } catch (error) {
        return res.status(500).json({ message: `get all shops error ${error}` })
    }
}

module.exports={
    createEditShop,
    getMyShop,
    getShopByCity,
    getAllShops
}
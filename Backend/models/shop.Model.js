const mongoose = require('mongoose');
const { type } = require("os");

const shopSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    image:{
        type:String,
        required:true
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    city:{
         type:String,
        required:true,
        /* Shops are always looked up by city on the home and search screens. */
        index:true
    },
    state:{
         type:String,
        required:true
    },
    address:{
        type:String,
        required:true
    },
    items:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Item"
    }]

},{timestamps:true})

const Shop = mongoose.models.Shop || mongoose.model("Shop", shopSchema)
module.exports = Shop
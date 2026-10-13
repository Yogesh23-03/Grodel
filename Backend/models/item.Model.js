const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: "",
        maxlength: 800
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
        index: true
    },
    category: {
        type: String,
        enum: ["Snacks",
            "Main Course",
            "Desserts",
            "Pizza",
            "Burgers",
            "Sandwiches",
            "South Indian",
            "North Indian",
            "Chinese",
            "Fast Food",
            "Others"
        ],
        required:true
    },
    price:{
        type:Number,
        min:0,
        required:true
    },
    foodType:{
        type:String,
        enum:["veg","non veg"],
        required:true
    },
   rating:{
    average:{type:Number,default:0},
    count:{type:Number,default:0}
   },

   /* ----- Owner discount system: `price` always holds the price the customer
      actually pays, so cart/checkout need no special-casing. `originalPrice`
      is what we restore when a discount is removed. ----- */
   originalPrice:{
    type:Number,
    default:null
   },
   discountPercent:{
    type:Number,
    default:0,
    min:0,
    max:100
   },
   discountedPrice:{
    type:Number,
    default:null
   },
   isOnSale:{
    type:Boolean,
    default:false
   },
   saleEndsAt:{
    type:Date,
    default:null
   }
}, { timestamps: true })

const Item=mongoose.model("Item",itemSchema)
module.exports=Item;
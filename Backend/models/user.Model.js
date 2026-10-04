const mongoose = require('mongoose');
const { type } = require("os");

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique:true
    },
    password:{
        type: String,
    },
    mobile:{
        type: String,
        required: true, 
    },
    role:{
        type:String,
        enum:["user","owner","deliveryBoy","supplier","trustMember","admin","vendor","helper"],
        required:true
    },
    resetOtp:{
        type:String
    },
    isOtpVerified:{
        type:Boolean,
        default:false
    },
    otpExpires:{
        type:Date
    },
    socketId:{
     type:String,
     
    },
    isOnline:{
        type:Boolean,
        default:false
    },
  
location: {
    type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
    },
    coordinates: {
        type: [Number],
        default: [0, 0]
    }
},
buyerProfile: {
    buyerType: { type: String, enum: ['consumer', 'retailer', 'hotel', 'canteen', 'exporter'] },
    businessName: String,
    gstin: String,
    typicalMonthlyVolume: String,
    preferredCategories: [String],
    deliveryPincodes: [String],
    onboardingComplete: { type: Boolean, default: false }
}
  
}, { timestamps: true })

userSchema.index({location:'2dsphere'})

const User = mongoose.models.User || mongoose.model("User", userSchema)
module.exports = User

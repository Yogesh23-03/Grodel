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
},

/* ----- Order-wait engagement: loyalty, streaks and badges ----- */
coins: {
    type: Number,
    default: 0
},
streak: {
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastPlayedAt: { type: Date, default: null }
},
badges: [{
    id: String,
    name: String,
    description: String,
    earnedAt: { type: Date, default: Date.now }
}],
gamesPlayed: {
    type: Number,
    default: 0
},
triviaScore: {
    type: Number,
    default: 0
},
spinsUsed: {
    type: Number,
    default: 0
},
isFirstAdmin:{
    /* The founding admin keeps the platform-level powers: role changes,
       bans and seat management. Only ever true for the first admin created. */
    type:Boolean,
    default:false
},
isBanned:{
    /* Set by an admin; isAuth refuses every request from a banned account. */
    type:Boolean,
    default:false
}

}, { timestamps: true })

userSchema.index({location:'2dsphere'})

const User = mongoose.models.User || mongoose.model("User", userSchema)
module.exports = User

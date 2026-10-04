const User = require("../models/user.Model")
const VendorProfile = require("../models/VendorProfile")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const dotenv = require("dotenv")
const genToken = require("../utils/token")
const { sendOtpMail } = require("../utils/mail")
dotenv.config()

const signUp = async (req, res) => {
    try {
        const { fullName, email, password, mobile, role, preferredLanguage } = req.body

        let user = await User.findOne({ email })
        if (user) {
            return res.status(400).json({ message: "User Already exist." })
        }

        if (password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters." })
        }

        if (mobile.length < 10) {
            return res.status(400).json({ message: "Mobile no must be at least 10 digits." })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        user = await User.create({
            fullName,
            email,
            role,
            mobile,
            password: hashedPassword
        })

        if (role === "vendor") {
            const vendorLanguage = ["en", "kn", "ta", "te", "hi"].includes(preferredLanguage)
                ? preferredLanguage
                : "en"
            await VendorProfile.create({
                userId: user._id,
                displayName: fullName,
                phoneNumber: mobile,
                preferredLanguage: vendorLanguage,
                registeredVia: "web"
            })
        }

        const token = await genToken(user._id)

        res.cookie("token", token, {
            secure: false,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true
        })

        return res.status(201).json(user)

    } catch (error) {
        return res.status(500).json({ message: `Sign up error ${error.message}` })
    }
}


const signIn = async (req, res) => {
    try {
        const { email, password } = req.body

        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({ message: "User does not exist." })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect Password" })
        }

        const token = await genToken(user._id)

        res.cookie("token", token, {
            secure: false,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true
        })

        return res.status(200).json(user)

    } catch (error) {
        return res.status(500).json({ message: `Sign in error ${error.message}` })
    }
}


const signOut = async (req, res) => {
    try {
        res.clearCookie("token")
        return res.status(200).json({ message: "Log out successfully" })
    } catch (error) {
        return res.status(500).json({ message: `Sign out error ${error.message}` })
    }
}


const sendOtp=async (req,res) => {
  try {
    const {email}=req.body
    const user=await User.findOne({email})
    if(!user){
       return res.status(400).json({message:"User does not exist."})
    }
    const otp=Math.floor(1000 + Math.random() * 9000).toString()
    user.resetOtp=otp
    user.otpExpires=Date.now()+5*60*1000
    user.isOtpVerified=false
    await user.save()
    await sendOtpMail(email,otp)
    return res.status(200).json({message:"otp sent successfully"})
  } catch (error) {
    console.log(error)
     return res.status(500).json(`send otp error ${error}`)
  }  
}

const verifyOtp=async (req,res) => {
  try {
    const {email,otp}=req.body
    const user=await User.findOne({email})
    if(!user || user.resetOtp!==otp || user.otpExpires<Date.now()){
      return res.status(400).json({message:"Invalid/expired otp"})
    }
    user.isOtpVerified=true
    user.resetOtp=undefined
    user.otpExpires=undefined
    await user.save()
    return res.status(200).json({message:"otp verified successfully"})
  } catch (error) {
    return res.status(500).json(`verify otp error ${error}`)
  }
}

const resetPassword=async (req,res) => {
    try {
      const {email,password}=req.body
      const user=await User.findOne({email})
      if(!user || !user.isOtpVerified){
       return res.status(400).json({message:"OTP verification failed"})
    }
    const hashedPassword=await bcrypt.hash(password,10)
    user.password=hashedPassword
    user.isOtpVerified=false
    await user.save()
    return res.status(200).json({message:"password reset successfully"})
    } catch (error) {
      return res.status(500).json(`reset password error ${error}`)
    }

}
const googleAuth=async (req,res) => {
    try {
        const {fullName,email,mobile,role,preferredLanguage}=req.body
        let user=await User.findOne({email})
        if(!user){
            user=await User.create({
                fullName,email,mobile,role
            })
            if (role === "vendor") {
                const vendorLanguage = ["en", "kn", "ta", "te", "hi"].includes(preferredLanguage)
                    ? preferredLanguage
                    : "en"
                await VendorProfile.create({
                    userId: user._id,
                    displayName: fullName,
                    phoneNumber: mobile,
                    preferredLanguage: vendorLanguage,
                    registeredVia: "web"
                })
            }
        }

        const token=await genToken(user._id)
        res.cookie("token",token,{
            secure:false,
            sameSite:"strict",
            maxAge:7*24*60*60*1000,
            httpOnly:true
        })
  
        return res.status(200).json(user)


    } catch (error) {
         return res.status(500).json(`googleAuth error ${error}`)
    }
}

module.exports = {
    signUp,
    signIn,
    signOut,
    sendOtp,
    verifyOtp,
    resetPassword,
    googleAuth

}

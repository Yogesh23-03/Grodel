const User = require("../models/user.Model")
const VendorProfile = require("../models/VendorProfile")
const bcrypt = require("bcrypt")
const dotenv = require("dotenv")
const genToken = require("../utils/token")
const { getAdminSlotInfo } = require("../utils/adminSeats")
const { sendOtpMail } = require("../utils/mail")
dotenv.config()

// Cookie flags follow the environment: HTTPS-only "none" cookies in production,
// localhost-friendly "strict" cookies locally. Local dev keeps working while a
// deployment only needs NODE_ENV=production.
const isProduction = process.env.NODE_ENV === "production"
const cookieSecurity = {
    secure: isProduction,
    sameSite: isProduction ? "none" : "strict"
}

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

        /* Admin is a capped role: signup refuses the overflow so the platform
           can never accumulate more admins than the operator allows. */
        if (role === "admin") {
            const { full, current, max } = await getAdminSlotInfo()
            if (full) {
                return res.status(403).json({ message: `Admin seats are full (${current}/${max})` })
            }
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

        if (role === "admin") {
            /* Counted after insert, so ===1 means this account is the founder. */
            const adminCount = await User.countDocuments({ role: "admin" })
            if (adminCount === 1) {
                user.isFirstAdmin = true
                await user.save()
            }
        }

        const token = await genToken(user._id)

        res.cookie("token", token, {
            secure: cookieSecurity.secure,
            sameSite: cookieSecurity.sameSite,
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
            secure: cookieSecurity.secure,
            sameSite: cookieSecurity.sameSite,
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
    console.error("AUTH ERROR:", error.message)
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
            /* Same seat cap as the password path — Google sign-in must not be a
               way around the admin limit. */
            if (role === "admin") {
                const { full, current, max } = await getAdminSlotInfo()
                if (full) {
                    return res.status(403).json({ message: `Admin seats are full (${current}/${max})` })
                }
            }
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
            if (role === "admin") {
                const adminCount = await User.countDocuments({ role: "admin" })
                if (adminCount === 1) {
                    user.isFirstAdmin = true
                    await user.save()
                }
            }
        }

        const token=await genToken(user._id)
        res.cookie("token",token,{
            secure: cookieSecurity.secure,
            sameSite: cookieSecurity.sameSite,
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

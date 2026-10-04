const User=require("../models/user.Model")


const getCurrentUser=async (req,res) => {
    try {
        const userId=req.userId
        if(!userId){
            return res.status(400).json({message:"userId is not found"})
        }
        const user=await User.findById(userId)
        if(!user){
               return res.status(400).json({message:"user is not found"})
        }
        return res.status(200).json(user)
    } catch (error) {
        return res.status(500).json({message:`get current user error ${error}`})
    }
}

const updateUserLocation=async (req,res) => {
    try {
        const {lat,lon}=req.body
        const user=await User.findByIdAndUpdate(
    req.userId,
    {
        location: {
            type: 'Point',
            coordinates: [lon, lat]
        }
    },
    { returnDocument: 'after' }
)
         if(!user){
               return res.status(400).json({message:"user is not found"})
        }
        
        return res.status(200).json({message:'location updated'})
    } catch (error) {
           return res.status(500).json({message:`update location user error ${error}`})
    }
}

const getAllUsers=async (req,res) => {
    try {
        const currentUser=await User.findById(req.userId)
        if(currentUser?.role!=="admin"){
            return res.status(403).json({message:"Only admin can view users"})
        }
        const users=await User.find().select("-password -resetOtp -otpExpires").sort({createdAt:-1})
        return res.status(200).json(users)
    } catch (error) {
        return res.status(500).json({message:`get users error ${error}`})
    }
}


module.exports={
    getCurrentUser,
    updateUserLocation,
    getAllUsers
}


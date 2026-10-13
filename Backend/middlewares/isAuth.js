const jwt=require("jsonwebtoken")
const User=require("../models/user.Model")

/*
 * Auth gate. Every failure to prove identity answers 401 — never 500. The old
 * blanket 500 masked an expired token as a server fault, so the frontend showed
 * "something went wrong" instead of sending the user back to sign in.
 */
const isAuth=async (req,res,next) => {
    try {
        const token=req.cookies.token
        if(!token){
            return res.status(401).json({message:"Not signed in"})
        }
        const decodeToken=jwt.verify(token,process.env.JWT_SECRET)
        if(!decodeToken){
            return res.status(401).json({message:"Session is not valid"})
        }
        /*
         * The account is re-read on every request so a ban takes effect
         * immediately rather than when the 7-day cookie finally expires, and
         * so route guards get req.user without a second query.
         */
        const user=await User.findById(decodeToken.userId).select("role isBanned isFirstAdmin")
        if(!user){
            return res.status(401).json({message:"User not found"})
        }
        if(user.isBanned){
            return res.status(403).json({message:"Account suspended"})
        }
        req.userId=decodeToken.userId
        req.user=user
        next()
    } catch (error) {
        if(error?.name==="TokenExpiredError"){
            return res.status(401).json({message:"Session expired, please sign in again"})
        }
        if(error?.name==="JsonWebTokenError"){
            return res.status(401).json({message:"Session is not valid"})
        }
        /* A missing JWT_SECRET is genuinely a server misconfiguration. */
        console.error("AUTH ERROR:", error.message)
        return res.status(500).json({message:"Authentication error"})
    }
}

module.exports=isAuth
const User = require("../models/user.Model.js")

/*
 * requireRole("owner", "admin") — must be mounted AFTER isAuth, which is what
 * puts req.userId on the request. Roles are read from the database rather than
 * from the token so a demoted user loses access immediately instead of when
 * their 7-day cookie finally expires.
 */
const requireRole = (...roles) => async (req, res, next) => {
    try {
        const user = await User.findById(req.userId).select("role")
        if (!user) {
            return res.status(401).json({ message: "User not found" })
        }
        if (!roles.includes(user.role)) {
            return res.status(403).json({ message: `This action is restricted to: ${roles.join(", ")}` })
        }
        req.userRole = user.role
        next()
    } catch (error) {
        console.error("ROLE CHECK ERROR:", error.message)
        return res.status(500).json({ message: "Could not verify permissions" })
    }
}

module.exports = requireRole

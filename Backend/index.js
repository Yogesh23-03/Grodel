const express = require('express')
const dotenv = require('dotenv')
dotenv.config()
const cors = require('cors')
const connectDb = require('./config/db')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const authRouter = require("./routes/auth.routes")
const userRouter = require("./routes/user.routes")
const shopRouter = require("./routes/shop.routes")
const itemRouter = require("./routes/item.routes")
const orderRouter = require("./routes/order.routes")
const donationRouter = require("./routes/donationRoutes")
const trustRouter = require("./routes/trustRoutes")
const vendorRouter = require("./routes/vendorRoutes")
const adminRouter = require("./routes/adminRoutes")
const translationRouter = require("./routes/translationRoutes")
const http = require('http');
const { Server } = require('socket.io');
const User = require("./models/user.Model.js")
const { setIo } = require("./utils/socket")

const app = express()
const port = process.env.PORT || 5000
// Local dev origins always work; a deployment adds its frontend origin via
// CLIENT_URL / FRONTEND_URL env vars so no URL is hard-coded in source.
const extraOrigins = [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    "https://your-actual-vercel-domain.vercel.app"
].filter(Boolean)
const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...extraOrigins
]

/* Render/Vercel terminate TLS in front of us, so the client IP lives in
   X-Forwarded-For. Without this, express-rate-limit would bucket every request
   under the proxy's own address. */
app.set('trust proxy', 1)

/* crossOriginResourcePolicy is relaxed so images served from /public can still
   be embedded by the Vercel frontend. */
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}))

app.use(cors({
    origin: (origin, callback) => {
        // A missing origin means a same-origin or non-browser client (curl,
        // server-to-server) — those are allowed; a browser origin must match.
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
        return callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))

const server = http.createServer(app);
const io = new Server(server, {           // ← io is created here
    cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ["GET", "POST"]
    }
});

// ← io.on must come AFTER io is created above
io.on("connection", (socket) => {
    console.log("socket connected:", socket.id);

    socket.on("identity", async ({ userId }) => {
        try {
            if (!userId) return;
            await User.findByIdAndUpdate(userId, {
                socketId: socket.id,
                isOnline: true
            });
            console.log("identity saved:", userId, socket.id);
        } catch (error) {
            console.error("IDENTITY ERROR:", error.message);
        }
    });

    socket.on('updateLocation', async ({ latitude, longitude, userId }) => {
      try {
        const user = await User.findByIdAndUpdate(userId, {
          location: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          isOnline: true,
          socketId: socket.id
        });

        if (user) {
          io.emit('updateDeliveryLocation',{
            deliveryBoyId:userId,
            latitude,
            longitude
          });
        }


      } catch (error) {
          console.error('UPDATE DELIVERY LOCATION ERROR:', error.message);
      }
    });



    socket.on("disconnect", async () => {
        try {
            await User.findOneAndUpdate(
                { socketId: socket.id },
                { socketId: null, isOnline: false }
            );
            console.log("socket disconnected:", socket.id);
        } catch (error) {
            console.error("SOCKET DISCONNECT ERROR:", error.message);
        }
    });
});

app.set('io', io);
setIo(io);

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

/* Rate limits. The app is a SPA whose every navigation fires several API reads
   (current user, city, shops, orders, notifications) and whose group-order page
   polls every 5s, so a 100/15min ceiling throttled ordinary users and made pages
   render "Too many requests". The ceiling now allows sustained browsing while
   still capping abuse, and CORS preflights (OPTIONS) are not counted as usage.
   Tune the ceiling with RATE_LIMIT_MAX / AUTH_RATE_LIMIT_MAX. */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 1000,
    standardHeaders: true,
    legacyHeaders: false,
    // Browsers send an OPTIONS preflight before credentialed cross-origin calls;
    // those are not app usage and were silently eating the budget.
    skip: (req) => req.method === "OPTIONS",
    message: { message: "Too many requests, please try again later." }
})
app.use("/api/", apiLimiter)

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many auth attempts, try again in an hour." }
})
app.use("/api/auth/signin", authLimiter)
app.use("/api/auth/signup", authLimiter)

app.use("/api/auth", authRouter)
app.use("/api/user", userRouter)
app.get("/", function (req, res) {
    res.send("hello world")
})
app.use("/api/shop", shopRouter)
app.use("/api/item", itemRouter)
app.use("/api/order", orderRouter)
app.use("/api", donationRouter)
app.use("/api", translationRouter)
app.use("/api", require("./routes/nutritionRoutes"))
app.use("/api", require("./routes/recipeRoutes"))
app.use("/api", require("./routes/chatbotRoutes"))
app.use("/api", require("./routes/groupOrderRoutes"))
app.use("/api/engagement", require("./routes/engagementRoutes"))
app.use("/api/trusts", trustRouter)
app.use("/api/vendor", vendorRouter)
app.use("/api/dm", require("./routes/directMarket.routes"))
app.use("/api/meal-schedule", require("./routes/mealScheduleRoutes"))
app.use("/api/bulk-orders", require("./routes/bulkOrderRoutes"))
app.use("/api/analysis", require("./routes/businessAnalysisRoutes"))
app.use("/api/admin", adminRouter)

/* Global error handler — MUST be the last middleware. A CORS rejection and an
   oversized upload are both client mistakes, so they answer 403/413 rather than
   a blanket 500. */
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err)

    if (err?.message === "Not allowed by CORS") {
        return res.status(403).json({ message: "Origin not allowed" })
    }

    const isTooLarge = err?.code === "LIMIT_FILE_SIZE"
    const status = isTooLarge
        ? 413
        : (err?.status || err?.statusCode || 500)

    console.error(err?.stack || err)
    return res.status(status).json({
        message: isTooLarge
            ? "Image must be 5MB or smaller"
            : (status < 500 ? err.message : "Internal server error")
    })
})

connectDb().then(() => {
    server.listen(port, () => {
        console.log(`server is running on port ${port}`)
    })

    // TODO: Replace setInterval with a proper cron job (node-cron) for production
    setInterval(() => {
        require("./controllers/groupOrder.controllers").processScheduledOrders()
            .catch(error => console.error("SCHEDULED GROUP ORDER ERROR:", error.message))
        require("./controllers/mealSchedule.controllers").processMealSchedules()
            .catch(error => console.error("SCHEDULED MEAL ORDER ERROR:", error.message))
    }, 60 * 1000)
})

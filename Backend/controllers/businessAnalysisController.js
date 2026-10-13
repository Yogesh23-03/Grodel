const Order = require("../models/order.model.js")
const Shop = require("../models/shop.Model.js")
const VendorProfile = require("../models/VendorProfile.js")
const VendorListing = require("../models/VendorListing.js")
const VendorOrder = require("../models/VendorOrder.js")
const DeliveryAssignment = require("../models/deliveryAssignment.model.js")
const { groqChat, parseGroqJson } = require("../utils/groq")

/*
 * AI BUSINESS ANALYSIS — owner / vendor (farmer) / deliveryBoy.
 *
 * The numbers are always computed in MongoDB first and handed to the model as
 * plain text. The model only interprets; it never invents a metric, because a
 * hallucinated revenue figure would be worse than no analysis at all.
 */

const WINDOW_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

/* Every role returns the SAME shape so the frontend has one renderer. */
const SYSTEM_PROMPT = "You are a business consultant for Indian food and agriculture businesses. Give specific, actionable advice grounded only in the numbers given. Return only valid JSON."

const ANALYSIS_SCHEMA = `Return ONLY this JSON:
{
  "overallHealth": "Excellent|Good|Average|Needs Improvement",
  "healthScore": <integer 0-100>,
  "summary": "2 sentence overview",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": [
    {
      "title": "recommendation title",
      "description": "specific action to take",
      "impact": "High|Medium|Low",
      "effort": "Easy|Medium|Hard"
    }
  ],
  "revenueInsight": "specific insight about the revenue or activity pattern",
  "bestTimeToPromote": "when to run a promotion, based on the peak hours given",
  "itemToFeature": "the specific item to push more",
  "warningFlags": ["any red flags"] or []
}`

const clampScore = (value) => {
    const parsed = Math.round(Number(value))
    if (!Number.isFinite(parsed)) return 50
    return Math.min(Math.max(parsed, 0), 100)
}

const HEALTH_LABELS = ["Excellent", "Good", "Average", "Needs Improvement"]
const IMPACTS = ["High", "Medium", "Low"]
const EFFORTS = ["Easy", "Medium", "Hard"]

const pickFrom = (value, allowed, fallback) => {
    const match = allowed.find(option => option.toLowerCase() === String(value ?? "").trim().toLowerCase())
    return match || fallback
}

const stringList = (value, limit = 6) => (Array.isArray(value) ? value : [])
    .map(item => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, limit)

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100

/* Normalises whatever the model produced into the exact shape the UI expects,
   so a slightly-off AI reply degrades instead of crashing the page. */
const normaliseAnalysis = (raw) => ({
    overallHealth: pickFrom(raw?.overallHealth, HEALTH_LABELS, "Average"),
    healthScore: clampScore(raw?.healthScore),
    summary: String(raw?.summary ?? "").trim().slice(0, 500),
    strengths: stringList(raw?.strengths),
    weaknesses: stringList(raw?.weaknesses),
    recommendations: (Array.isArray(raw?.recommendations) ? raw.recommendations : [])
        .filter(entry => entry && (entry.title || entry.description))
        .slice(0, 6)
        .map(entry => ({
            title: String(entry.title ?? "").trim().slice(0, 140),
            description: String(entry.description ?? "").trim().slice(0, 500),
            impact: pickFrom(entry.impact, IMPACTS, "Medium"),
            effort: pickFrom(entry.effort, EFFORTS, "Medium")
        })),
    revenueInsight: String(raw?.revenueInsight ?? "").trim().slice(0, 500),
    bestTimeToPromote: String(raw?.bestTimeToPromote ?? "").trim().slice(0, 300),
    itemToFeature: String(raw?.itemToFeature ?? "").trim().slice(0, 140),
    warningFlags: stringList(raw?.warningFlags, 4)
})

const askConsultant = async (context) => {
    const text = await groqChat([
        { role: "system", content: SYSTEM_PROMPT },
        {
            role: "user",
            content: `Analyse this business's performance and give specific, actionable recommendations.
Only use the numbers below — never invent a figure that is not present.

${context}

${ANALYSIS_SCHEMA}`
        }
    ], { json: true, maxTokens: 1400 })

    return normaliseAnalysis(parseGroqJson(text))
}

/* ------------------------------- shared maths ------------------------------- */

const hourLabel = (hour) => `${String(hour).padStart(2, "0")}:00`

const topHours = (dates, limit = 3) => {
    const counts = new Map()
    dates.forEach(date => {
        const hour = new Date(date).getHours()
        counts.set(hour, (counts.get(hour) || 0) + 1)
    })
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([hour, count]) => `${hourLabel(hour)} (${count} orders)`)
}

const countItems = (lines, key = "name", weightKey = "quantity", limit = 5) => {
    const counts = new Map()
    lines.forEach(line => {
        const label = line?.[key]
        if (!label) return
        counts.set(label, (counts.get(label) || 0) + (Number(line?.[weightKey]) || 1))
    })
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }))
}

const describe = (list, empty = "none") =>
    list.length ? list.map(entry => `${entry.name} (${entry.count})`).join(", ") : empty

/* --------------------------------- OWNER --------------------------------- */

const getOwnerAnalysis = async (req, res) => {
    try {
        const shop = await Shop.findOne({ owner: req.userId }).populate("items", "name rating")
        if (!shop) {
            return res.status(404).json({ message: "Create your shop before requesting an analysis" })
        }

        const since = new Date(Date.now() - WINDOW_DAYS * DAY_MS)
        const previousSince = new Date(Date.now() - 2 * WINDOW_DAYS * DAY_MS)

        /* Flatten to one row per shop-order so status/subtotal/items are all at
           the same level. Older rows are kept so the trend has a baseline. */
        const rows = await Order.aggregate([
            { $match: { createdAt: { $gte: previousSince } } },
            { $unwind: "$shopOrders" },
            { $match: { "shopOrders.shop": shop._id } },
            {
                $project: {
                    _id: 0,
                    createdAt: 1,
                    status: "$shopOrders.status",
                    subtotal: "$shopOrders.subtotal",
                    items: "$shopOrders.shopOrderItems"
                }
            }
        ])

        const current = rows.filter(row => new Date(row.createdAt) >= since)
        const previous = rows.filter(row => new Date(row.createdAt) < since)

        const billable = current.filter(row => row.status !== "cancelled")
        const totalRevenue = round2(billable.reduce((sum, row) => sum + (row.subtotal || 0), 0))
        const previousRevenue = round2(
            previous.filter(row => row.status !== "cancelled").reduce((sum, row) => sum + (row.subtotal || 0), 0)
        )
        const cancelledOrders = current.filter(row => row.status === "cancelled").length
        const deliveredOrders = current.filter(row => row.status === "delivered").length
        const topItems = countItems(billable.flatMap(row => row.items || []))
        const peakHours = topHours(current.map(row => row.createdAt))

        const ratedItems = (shop.items || []).filter(item => item?.rating?.count > 0)
        const ratedTotal = ratedItems.reduce((sum, item) => sum + item.rating.count, 0)
        const avgRating = ratedTotal
            ? round2(ratedItems.reduce((sum, item) => sum + item.rating.average * item.rating.count, 0) / ratedTotal)
            : 0

        const trendPct = previousRevenue > 0
            ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 1000) / 10
            : null

        const context = `Restaurant: ${shop.name} (${shop.city})
Last ${WINDOW_DAYS} days:
- Total orders: ${current.length}
- Delivered orders: ${deliveredOrders}
- Cancelled orders: ${cancelledOrders}
- Total revenue: Rs ${totalRevenue}
- Average order value: Rs ${billable.length ? round2(totalRevenue / billable.length) : 0}
- Revenue previous ${WINDOW_DAYS} days: Rs ${previousRevenue}
- Revenue trend: ${trendPct === null ? "no prior data" : `${trendPct >= 0 ? "up" : "down"} ${Math.abs(trendPct)}% vs previous period`}
- Top 5 items: ${describe(topItems)}
- Peak ordering hours: ${peakHours.length ? peakHours.join(", ") : "no data"}
- Customer ratings: avg ${avgRating || "no ratings"}/5 across ${ratedTotal} ratings
- Menu size: ${(shop.items || []).length} items`

        const analysis = await askConsultant(context)

        return res.status(200).json({
            role: "owner",
            analysis,
            rawData: {
                businessName: shop.name,
                windowDays: WINDOW_DAYS,
                totalOrders: current.length,
                deliveredOrders,
                cancelledOrders,
                totalRevenue,
                previousRevenue,
                avgOrderValue: billable.length ? round2(totalRevenue / billable.length) : 0,
                topItems,
                peakHours,
                avgRating,
                ratingCount: ratedTotal,
                menuSize: (shop.items || []).length,
                revenueTrendPct: trendPct
            }
        })
    } catch (error) {
        return handleAnalysisError(res, error, "OWNER ANALYSIS ERROR")
    }
}

/* --------------------------------- VENDOR --------------------------------- */

const getVendorAnalysis = async (req, res) => {
    try {
        const profile = await VendorProfile.findOne({ userId: req.userId })
        if (!profile) {
            return res.status(404).json({ message: "Complete your vendor registration before requesting an analysis" })
        }

        const since = new Date(Date.now() - WINDOW_DAYS * DAY_MS)

        const [orders, listings] = await Promise.all([
            VendorOrder.find({ vendorUserId: req.userId, createdAt: { $gte: since } })
                .select("items totalAmount status createdAt")
                .lean(),
            VendorListing.find({ vendorId: profile._id })
                .select("name category pricePerUnit aiSuggestedPrice unit availableQuantity isAvailableToday isFreshToday")
                .lean()
        ])

        const billable = orders.filter(order => order.status !== "cancelled")
        const totalRevenue = round2(billable.reduce((sum, order) => sum + (order.totalAmount || 0), 0))
        const topProduce = countItems(billable.flatMap(order => order.items || []), "name", "quantity", 5)
        const peakHours = topHours(orders.map(order => order.createdAt))

        const categoryCounts = countItems(listings, "category", "pricePerUnit", 6)

        /* Closest real signal for "am I priced right": how the vendor's own
           price compares with the AI suggestion the app already stored. */
        const priced = listings.filter(listing => listing.aiSuggestedPrice > 0 && listing.pricePerUnit > 0)
        const pricedAboveSuggestion = priced.filter(l => l.pricePerUnit > l.aiSuggestedPrice).length
        const avgPriceGapPct = priced.length
            ? Math.round(priced.reduce((sum, l) => sum + ((l.pricePerUnit - l.aiSuggestedPrice) / l.aiSuggestedPrice) * 100, 0) / priced.length * 10) / 10
            : 0

        const context = `Farm / produce vendor: ${profile.displayName || "Vendor"} (${profile.location?.district || "district not set"})
Last ${WINDOW_DAYS} days:
- Orders received: ${orders.length}
- Completed/active orders: ${billable.length}
- Cancelled orders: ${orders.filter(order => order.status === "cancelled").length}
- Total revenue: Rs ${totalRevenue}
- Average order value: Rs ${billable.length ? round2(totalRevenue / billable.length) : 0}
- Fastest selling produce: ${describe(topProduce)}
- Peak order hours: ${peakHours.length ? peakHours.join(", ") : "no data"}
- Active listings: ${listings.length} (${listings.filter(l => l.isAvailableToday).length} marked available today)
- Listings by category: ${describe(categoryCounts)}
- Customer rating: ${profile.rating?.average || "no ratings"}/5 from ${profile.rating?.count || 0} ratings
- Listings priced above the AI suggested price: ${pricedAboveSuggestion} of ${priced.length}
- Average price gap vs AI suggestion: ${avgPriceGapPct}%
- Profile marked "Fresh Today": ${profile.isFreshToday ? "yes" : "no"}`

        const analysis = await askConsultant(context)

        return res.status(200).json({
            role: "vendor",
            analysis,
            rawData: {
                businessName: profile.displayName || "Your farm",
                windowDays: WINDOW_DAYS,
                totalOrders: orders.length,
                completedOrders: billable.length,
                cancelledOrders: orders.filter(order => order.status === "cancelled").length,
                totalRevenue,
                avgOrderValue: billable.length ? round2(totalRevenue / billable.length) : 0,
                topProduce,
                peakHours,
                listingCount: listings.length,
                availableToday: listings.filter(listing => listing.isAvailableToday).length,
                categoryBreakdown: categoryCounts,
                avgRating: profile.rating?.average || 0,
                ratingCount: profile.rating?.count || 0,
                pricedAboveSuggestion,
                avgPriceGapPct,
                isFreshToday: Boolean(profile.isFreshToday)
            }
        })
    } catch (error) {
        return handleAnalysisError(res, error, "VENDOR ANALYSIS ERROR")
    }
}

/* -------------------------------- DELIVERY -------------------------------- */

const getDeliveryAnalysis = async (req, res) => {
    try {
        const since = new Date(Date.now() - WINDOW_DAYS * DAY_MS)

        const assignments = await DeliveryAssignment.find({ assignedTo: req.userId, createdAt: { $gte: since } })
            .select("order status acceptedAt createdAt")
            .populate({ path: "order", select: "deliveryAddress shopOrders" })
            .lean()

        const completed = assignments.filter(assignment => assignment.status === "completed")

        /* Delivery duration: from accepting the job to the shop-order being
           marked delivered. Rows missing either timestamp are excluded rather
           than counted as zero. */
        const durations = []
        const deliveredAtList = []
        completed.forEach(assignment => {
            const shopOrder = (assignment.order?.shopOrders || [])
                .find(entry => entry.status === "delivered" && entry.deliveredAt)
            if (!shopOrder) return
            const deliveredAt = new Date(shopOrder.deliveredAt)
            deliveredAtList.push(deliveredAt)
            const startedAt = new Date(assignment.acceptedAt || assignment.createdAt)
            const minutes = (deliveredAt - startedAt) / 60000
            if (minutes > 0 && minutes < 24 * 60) durations.push(minutes)
        })

        const avgDeliveryMinutes = durations.length
            ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
            : 0

        /* Areas come from the delivery address text the customer entered. */
        const areaCounts = new Map()
        completed.forEach(assignment => {
            const text = String(assignment.order?.deliveryAddress?.text || "").trim()
            if (!text) return
            const area = text.split(",").slice(-1)[0].trim() || text
            areaCounts.set(area, (areaCounts.get(area) || 0) + 1)
        })
        const topAreas = [...areaCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }))
        const areaList = topAreas.map(entry => `${entry.name} (${entry.count})`).join(", ")

        const deliveriesPerDay = Math.round((completed.length / WINDOW_DAYS) * 10) / 10
        const peakHours = topHours(deliveredAtList)
        const completionRate = assignments.length
            ? Math.round((completed.length / assignments.length) * 100)
            : 0

        const context = `Delivery partner on a food delivery platform.
Last ${WINDOW_DAYS} days:
- Jobs assigned: ${assignments.length}
- Jobs completed: ${completed.length}
- Completion rate: ${completionRate}%
- Average delivery time: ${avgDeliveryMinutes ? `${avgDeliveryMinutes} minutes` : "not enough data"}
- Deliveries per day: ${deliveriesPerDay}
- Busiest delivery hours: ${peakHours.length ? peakHours.join(", ") : "no data"}
- Most delivered areas: ${areaList || "not enough data"}
Note: this platform does not record a per-delivery payout, so no rupee earnings exist — advise on completing deliveries and coverage only.`

        const analysis = await askConsultant(context)

        return res.status(200).json({
            role: "deliveryBoy",
            analysis,
            rawData: {
                businessName: "Your delivery run",
                windowDays: WINDOW_DAYS,
                assignedJobs: assignments.length,
                completedDeliveries: completed.length,
                completionRate,
                avgDeliveryMinutes,
                deliveriesPerDay,
                peakHours,
                topAreas
            }
        })
    } catch (error) {
        return handleAnalysisError(res, error, "DELIVERY ANALYSIS ERROR")
    }
}

const handleAnalysisError = (res, error, label) => {
    if (error?.code === "AI_NOT_CONFIGURED") {
        return res.status(503).json({ message: error.message })
    }
    if (error?.code === "AI_BAD_JSON") {
        return res.status(502).json({ message: "AI response was incomplete — please try again" })
    }
    console.error(`${label}:`, error.message)
    return res.status(500).json({ message: "Could not build your analysis right now" })
}

module.exports = { getOwnerAnalysis, getVendorAnalysis, getDeliveryAnalysis }

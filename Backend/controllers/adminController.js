const User = require("../models/user.Model");
const Order = require("../models/order.model");
const GroupOrder = require("../models/GroupOrder");
const Donation = require("../models/donation.model");
const VendorProfile = require("../models/VendorProfile");
const VendorListing = require("../models/VendorListing");
const VendorOrder = require("../models/VendorOrder");
const Shop = require("../models/shop.Model");
const Item = require("../models/item.Model");
const Settings = require("../models/Settings");
const { getAdminSlotInfo, getMaxAdmins, HARD_CAP } = require("../utils/adminSeats");

/*
 * Admin controller.
 *
 * Every handler here is mounted behind isAuth + requireRole("admin"); the two
 * genuinely destructive powers (changing roles, banning, seat management) are
 * additionally gated on isFirstAdmin by the route layer. Handlers therefore
 * never have to re-verify identity — they can trust req.user.
 */

const PAGE_LIMIT = 20;

/* User-supplied text goes into a regex, so metacharacters must be neutralised
   or a search for "a+(" would throw inside MongoDB. */
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/*
 * An order's own `status` field is frequently unset in this database — the real
 * state lives on each shop's sub-order (`shopOrders[].status`). Both the filter
 * and the badge therefore have to look there, or every row renders blank and
 * the status filter matches nothing.
 */
const PIPELINE = ["pending", "preparing", "out of delivery", "delivered"];

const rollupStatus = (order) => {
  if (order.status) return order.status;
  const statuses = (order.shopOrders || []).map((shopOrder) => shopOrder.status).filter(Boolean);
  if (!statuses.length) return "pending";
  if (statuses.every((status) => status === statuses[0])) return statuses[0];
  /* Mixed: report the least-advanced stage that is still moving so the badge
     reflects that the order is not finished. */
  const active = statuses.filter((status) => status !== "cancelled");
  if (!active.length) return "cancelled";
  return PIPELINE.find((stage) => active.includes(stage)) || active[0];
};

const paginate = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || PAGE_LIMIT));
  return { page, limit, skip: (page - 1) * limit };
};

const countBy = (rows, key) =>
  rows.reduce((acc, row) => {
    acc[row._id || "unknown"] = row.count;
    return acc;
  }, {});

/* ---------------------------------------------------------------- overview */

const getPlatformStats = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [roleAgg, totalOrders, todayOrders, revenueAgg, groupOrders, donationAgg,
      vendors, listings, shops, items, adminSlots] = await Promise.all([
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Order.countDocuments({}),
      Order.countDocuments({ createdAt: { $gte: startOfToday } }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
      GroupOrder.countDocuments({}),
      Donation.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      VendorProfile.countDocuments({}),
      VendorListing.countDocuments({}),
      Shop.countDocuments({}),
      Item.countDocuments({}),
      getAdminSlotInfo()
    ]);

    const usersByRole = countBy(roleAgg);
    const donationsByStatus = countBy(donationAgg);

    return res.status(200).json({
      stats: {
        totalUsers: Object.values(usersByRole).reduce((sum, n) => sum + n, 0),
        usersByRole,
        totalOrders,
        todayOrders,
        totalRevenue: revenueAgg[0]?.total || 0,
        groupOrders,
        donationsByStatus,
        totalDonations: Object.values(donationsByStatus).reduce((sum, n) => sum + n, 0),
        vendors,
        listings,
        shops,
        items,
        adminSlots
      }
    });
  } catch (error) {
    console.error("ADMIN STATS ERROR:", error.message);
    return res.status(500).json({ message: "Could not load platform stats" });
  }
};

const getPlatformActivity = async (req, res) => {
  try {
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const rows = await Order.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          orders: { $sum: 1 },
          revenue: { $sum: "$totalAmount" }
        }
      }
    ]);

    const byDay = rows.reduce((acc, row) => {
      acc[row._id] = { orders: row.orders, revenue: row.revenue || 0 };
      return acc;
    }, {});

    /* Fill the gaps so the chart always has one bar per day — a sparse series
       would silently squash the timeline. */
    const series = [];
    for (let i = 0; i < days; i += 1) {
      const day = new Date(since);
      day.setDate(since.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      series.push({
        date: key,
        orders: byDay[key]?.orders || 0,
        revenue: byDay[key]?.revenue || 0
      });
    }

    return res.status(200).json({ days: series });
  } catch (error) {
    console.error("ADMIN ACTIVITY ERROR:", error.message);
    return res.status(500).json({ message: "Could not load platform activity" });
  }
};

/* ------------------------------------------------------------------- users */

const getAllUsers = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};

    if (req.query.role && req.query.role !== "all") filter.role = req.query.role;
    if (req.query.search) {
      const rx = new RegExp(escapeRegex(req.query.search), "i");
      filter.$or = [{ fullName: rx }, { email: rx }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -resetOtp -otpExpires")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    return res.status(200).json({ users, total, pages: Math.max(1, Math.ceil(total / limit)), page, limit });
  } catch (error) {
    console.error("ADMIN USERS ERROR:", error.message);
    return res.status(500).json({ message: "Could not load users" });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const allowed = ["user", "owner", "deliveryBoy", "supplier", "trustMember", "vendor", "helper", "admin"];
    if (!allowed.includes(role)) {
      return res.status(400).json({ message: "Unknown role" });
    }

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: "User not found" });

    /* The founding admin is permanent: demoting them would leave the platform
       with nobody able to manage seats or roles. */
    if (target.isFirstAdmin) {
      return res.status(403).json({ message: "The first admin's role cannot be changed" });
    }

    if (role === "admin" && target.role !== "admin") {
      const { full, current, max } = await getAdminSlotInfo();
      if (full) {
        return res.status(403).json({ message: `Admin seats are full (${current}/${max})` });
      }
    }

    target.role = role;
    await target.save();

    return res.status(200).json({ user: target });
  } catch (error) {
    console.error("ADMIN UPDATE ROLE ERROR:", error.message);
    return res.status(500).json({ message: "Could not update role" });
  }
};

const banUser = async (req, res) => {
  try {
    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ message: "User not found" });

    if (target.role === "admin") {
      return res.status(403).json({ message: "Admins cannot be banned" });
    }

    target.isBanned = true;
    await target.save();

    return res.status(200).json({ user: target });
  } catch (error) {
    console.error("ADMIN BAN ERROR:", error.message);
    return res.status(500).json({ message: "Could not ban user" });
  }
};

const unbanUser = async (req, res) => {
  try {
    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ message: "User not found" });

    target.isBanned = false;
    await target.save();

    return res.status(200).json({ user: target });
  } catch (error) {
    console.error("ADMIN UNBAN ERROR:", error.message);
    return res.status(500).json({ message: "Could not unban user" });
  }
};

/* ------------------------------------------------------------------ orders */

const getAllOrders = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (req.query.status && req.query.status !== "all") {
      filter.$or = [
        { status: req.query.status },
        { "shopOrders.status": req.query.status }
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("user", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter)
    ]);

    return res.status(200).json({
      orders: orders.map((order) => ({
        ...order.toObject(),
        status: rollupStatus(order),
        shopStatuses: (order.shopOrders || []).map((shopOrder) => shopOrder.status).filter(Boolean)
      })),
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      page,
      limit
    });
  } catch (error) {
    console.error("ADMIN ORDERS ERROR:", error.message);
    return res.status(500).json({ message: "Could not load orders" });
  }
};

/* --------------------------------------------------------------- donations */

const getAllDonations = async (req, res) => {
  try {
    const donations = await Donation.find({})
      .populate("donorId", "fullName email mobile role")
      .populate("assignedTrustId", "name address")
      .populate("assignedDeliveryBoyId", "fullName mobile")
      .sort({ createdAt: -1 })
      .limit(500);

    return res.status(200).json({ donations });
  } catch (error) {
    console.error("ADMIN DONATIONS ERROR:", error.message);
    return res.status(500).json({ message: "Could not load donations" });
  }
};

/* ------------------------------------------------------------------- shops */

const getAllShops = async (req, res) => {
  try {
    const shops = await Shop.find({})
      .populate("owner", "fullName email mobile")
      .sort({ createdAt: -1 })
      .limit(500);

    const shopIds = shops.map((shop) => shop._id);
    const itemCounts = shopIds.length
      ? await Item.aggregate([
        { $match: { shop: { $in: shopIds } } },
        { $group: { _id: "$shop", count: { $sum: 1 } } }
      ])
      : [];
    const countByShop = countBy(itemCounts, "shop");

    return res.status(200).json({
      shops: shops.map((shop) => ({
        ...shop.toObject(),
        itemCount: countByShop[String(shop._id)] || 0
      }))
    });
  } catch (error) {
    console.error("ADMIN SHOPS ERROR:", error.message);
    return res.status(500).json({ message: "Could not load shops" });
  }
};

/* ----------------------------------------------------------------- vendors */

const getAllVendors = async (req, res) => {
  try {
    const vendors = await VendorProfile.find({})
      .populate("userId", "fullName email mobile role")
      .sort({ createdAt: -1 })
      .limit(500);

    const vendorIds = vendors.map((vendor) => vendor._id);
    const listingCounts = vendorIds.length
      ? await VendorListing.aggregate([
        { $match: { vendorId: { $in: vendorIds } } },
        { $group: { _id: "$vendorId", count: { $sum: 1 } } }
      ])
      : [];
    const countByVendor = countBy(listingCounts, "vendorId");

    return res.status(200).json({
      vendors: vendors.map((vendor) => ({
        ...vendor.toObject(),
        listingCount: countByVendor[String(vendor._id)] || 0
      }))
    });
  } catch (error) {
    console.error("ADMIN VENDORS ERROR:", error.message);
    return res.status(500).json({ message: "Could not load vendors" });
  }
};

const verifyVendor = async (req, res) => {
  try {
    const vendor = await VendorProfile.findByIdAndUpdate(
      req.params.vendorId,
      { isVerified: true },
      { new: true }
    );
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    return res.status(200).json({ vendor });
  } catch (error) {
    console.error("ADMIN VERIFY VENDOR ERROR:", error.message);
    return res.status(500).json({ message: "Could not verify vendor" });
  }
};

const suspendVendor = async (req, res) => {
  try {
    const vendor = await VendorProfile.findByIdAndUpdate(
      req.params.vendorId,
      { isActive: false, isVerified: false },
      { new: true }
    );
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    return res.status(200).json({ vendor });
  } catch (error) {
    console.error("ADMIN SUSPEND VENDOR ERROR:", error.message);
    return res.status(500).json({ message: "Could not suspend vendor" });
  }
};

/* ------------------------------------------------------------------ admins */

const getAdminList = async (req, res) => {
  try {
    const [admins, slots] = await Promise.all([
      User.find({ role: "admin" })
        .select("fullName email mobile isFirstAdmin isBanned createdAt")
        .sort({ createdAt: 1 }),
      getAdminSlotInfo()
    ]);

    return res.status(200).json({ admins, ...slots });
  } catch (error) {
    console.error("ADMIN LIST ERROR:", error.message);
    return res.status(500).json({ message: "Could not load admins" });
  }
};

const manageAdminSlots = async (req, res) => {
  try {
    const maxAdmins = Number(req.body.maxAdmins);
    if (!Number.isInteger(maxAdmins) || maxAdmins < 1 || maxAdmins > HARD_CAP) {
      return res.status(400).json({ message: `Max admins must be a whole number between 1 and ${HARD_CAP}` });
    }

    const { current } = await getAdminSlotInfo();
    if (maxAdmins < current) {
      return res.status(400).json({ message: `There are already ${current} admins — the limit cannot go below that` });
    }

    await Settings.findOneAndUpdate(
      { key: "maxAdmins" },
      { value: maxAdmins, updatedBy: req.userId, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ maxAdmins, current, full: current >= maxAdmins });
  } catch (error) {
    console.error("ADMIN SLOTS ERROR:", error.message);
    return res.status(500).json({ message: "Could not update admin slots" });
  }
};

/* ------------------------------------------------------------------- fraud */

const getFraudSignals = async (req, res) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [bursts, bigGroups, highListingVendors] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: oneHourAgo }, user: { $ne: null } } },
        { $group: { _id: "$user", count: { $sum: 1 } } },
        { $match: { count: { $gt: 10 } } },
        { $sort: { count: -1 } },
        { $limit: 50 }
      ]),
      GroupOrder.find({ $expr: { $gt: [{ $size: { $ifNull: ["$participants", []] } }, 20] } })
        .select("restaurantName participants createdAt")
        .limit(50),
      VendorListing.aggregate([
        { $group: { _id: "$vendorId", listings: { $sum: 1 } } },
        { $match: { listings: { $gte: 50 } } },
        { $sort: { listings: -1 } },
        { $limit: 50 }
      ])
    ]);

    /* A vendor with many listings and no sales at all is the interesting case;
       we look up their order counts in a single aggregate. */
    const vendorIds = highListingVendors.map((row) => row._id);
    const vendorSales = vendorIds.length
      ? await VendorOrder.aggregate([
        { $match: { vendor: { $in: vendorIds } } },
        { $group: { _id: "$vendor", orders: { $sum: 1 } } }
      ])
      : [];
    const salesByVendor = countBy(vendorSales, "vendor");

    const burstUserIds = bursts.map((row) => row._id);
    const burstUsers = burstUserIds.length
      ? await User.find({ _id: { $in: burstUserIds } }).select("fullName email")
      : [];
    const userById = burstUsers.reduce((acc, user) => {
      acc[String(user._id)] = user;
      return acc;
    }, {});

    const signals = [];

    bursts.forEach((row) => {
      const user = userById[String(row._id)];
      signals.push({
        type: "order_burst",
        severity: "high",
        userId: row._id,
        description: `${user?.fullName || "A user"} placed ${row.count} orders in the last hour`,
        at: new Date()
      });
    });

    bigGroups.forEach((group) => {
      signals.push({
        type: "oversized_group_order",
        severity: "medium",
        userId: group.creatorId || null,
        description: `Group order at ${group.restaurantName || "a restaurant"} has ${group.participants?.length || 0} participants`,
        at: group.createdAt
      });
    });

    highListingVendors.forEach((row) => {
      const orders = salesByVendor[String(row._id)] || 0;
      if (orders > 0) return; // listings without sales only matters when sales are zero
      signals.push({
        type: "listings_without_sales",
        severity: "low",
        userId: null,
        vendorId: row._id,
        description: `A vendor has ${row.listings} listings and no sales yet`,
        at: new Date()
      });
    });

    return res.status(200).json({ signals });
  } catch (error) {
    console.error("ADMIN FRAUD ERROR:", error.message);
    return res.status(500).json({ message: "Could not compute fraud signals" });
  }
};

/* ----------------------------------------------------------------- settings */

const getSettings = async (req, res) => {
  try {
    const [docs, maxAdmins] = await Promise.all([
      Settings.find({}).select("key value updatedAt"),
      getMaxAdmins()
    ]);

    const settings = docs.reduce((acc, doc) => {
      acc[doc.key] = doc.value;
      return acc;
    }, {});

    return res.status(200).json({ settings, maxAdmins });
  } catch (error) {
    console.error("ADMIN SETTINGS ERROR:", error.message);
    return res.status(500).json({ message: "Could not load settings" });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { key, value } = req.body;
    const allowedKeys = ["platformName", "maintenanceMode"];
    if (!allowedKeys.includes(key)) {
      return res.status(400).json({ message: `"${key}" is not a settable key` });
    }
    if (key === "maintenanceMode" && typeof value !== "boolean") {
      return res.status(400).json({ message: "maintenanceMode must be true or false" });
    }
    if (key === "platformName" && (typeof value !== "string" || !value.trim())) {
      return res.status(400).json({ message: "platformName must be a non-empty name" });
    }

    await Settings.findOneAndUpdate(
      { key },
      { value: typeof value === "string" ? value.trim() : value, updatedBy: req.userId, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ key, value });
  } catch (error) {
    console.error("ADMIN UPDATE SETTINGS ERROR:", error.message);
    return res.status(500).json({ message: "Could not save setting" });
  }
};

module.exports = {
  getPlatformStats,
  getPlatformActivity,
  getAllUsers,
  updateUserRole,
  banUser,
  unbanUser,
  getAllOrders,
  getAllDonations,
  getAllShops,
  getAllVendors,
  verifyVendor,
  suspendVendor,
  getAdminList,
  manageAdminSlots,
  getFraudSignals,
  getSettings,
  updateSettings
};

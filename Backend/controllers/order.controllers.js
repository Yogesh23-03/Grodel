const DeliveryAssignment = require("../models/deliveryAssignment.model.js")
const Order = require("../models/order.model.js")
const Shop = require("../models/shop.Model.js")
const User = require("../models/user.Model.js")
const { sendDeliveryOtpMail } = require("../utils/mail.js")
const RazorPay = require("razorpay")
const dotenv = require("dotenv")
const { count } = require("console")


// import Order from "../models/order.model.js"
// import Shop from "../models/shop.model.js"
// import User from "../models/user.model.js"
// import { sendDeliveryOtpMail } from "../utils/mail.js"
// import RazorPay from "razorpay"
// import dotenv from "dotenv"
// import { count } from "console"

dotenv.config()
let instance = new RazorPay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const placeOrder = async (req, res) => {
    try {
        const { cartItems, paymentMethod, deliveryAddress, totalAmount } = req.body
        /* Array check first: the old guard read cartItems.length before checking
           that cartItems existed, so a missing field threw and answered 500. */
        if (!Array.isArray(cartItems) || cartItems.length === 0) {
            return res.status(400).json({ message: "cart is empty" })
        }

        /* A location is only usable when the address text and a real pair of
           coordinates arrive. 0/0 is the "never captured" sentinel accounts are
           created with, so it must not count as a placeable address. */
        const rawLat = deliveryAddress?.latitude
        const rawLon = deliveryAddress?.longitude
        const lat = Number(rawLat)
        const lon = Number(rawLon)
        const isPresent = value => value !== null && value !== undefined && value !== ""
        const hasCoordinates = isPresent(rawLat) && isPresent(rawLon)
            && Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0)
        if (!deliveryAddress?.text || !hasCoordinates) {
            return res.status(400).json({ message: "Add a delivery address and pick a location on the map" })
        }

        const groupItemsByShop = {}

        cartItems.forEach(item => {
            const shopId = item.shop
            if (!groupItemsByShop[shopId]) {
                groupItemsByShop[shopId] = []
            }
            groupItemsByShop[shopId].push(item)
        });

        const shopOrders = await Promise.all(Object.keys(groupItemsByShop).map(async (shopId) => {
            const shop = await Shop.findById(shopId).populate("owner")
            if (!shop) {
                return res.status(400).json({ message: "shop not found" })
            }
            const items = groupItemsByShop[shopId]
            const subtotal = items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0)
            return {
                shop: shop._id,
                owner: shop.owner._id,
                subtotal,
                shopOrderItems: items.map((i) => ({
                    item: i.id,
                    price: i.price,
                    quantity: i.quantity,
                    name: i.name
                }))
            }
        }
        ))

        if (paymentMethod == "online") {
            const razorOrder = await instance.orders.create({
                amount: Math.round(totalAmount * 100),
                currency: 'INR',
                receipt: `receipt_${Date.now()}`
            })
            const newOrder = await Order.create({
                user: req.userId,
                paymentMethod,
                deliveryAddress,
                totalAmount,
                shopOrders,
                razorpayOrderId: razorOrder.id,
                payment: false
            })

            return res.status(200).json({
                razorOrder,
                orderId: newOrder._id,
            })

        }

        const newOrder = await Order.create({
            user: req.userId,
            paymentMethod,
            deliveryAddress,
            totalAmount,
            shopOrders
        })

        await newOrder.populate("shopOrders.shopOrderItems.item", "name image price")
        await newOrder.populate("shopOrders.shop", "name")
        await newOrder.populate("shopOrders.owner", "name socketId")
        await newOrder.populate("user", "name email mobile")

        const io = req.app.get('io')

        if (io) {
            newOrder.shopOrders.forEach(shopOrder => {
                const ownerSocketId = shopOrder.owner.socketId
                if (ownerSocketId) {
                    io.to(ownerSocketId).emit('newOrder', {
                        _id: newOrder._id,
                        paymentMethod: newOrder.paymentMethod,
                        user: newOrder.user,
                        shopOrders: shopOrder,
                        createdAt: newOrder.createdAt,
                        deliveryAddress: newOrder.deliveryAddress,
                        payment: newOrder.payment
                    })
                }
            });
        }


        return res.status(201).json(newOrder)
    } catch (error) {
        console.error("PLACE ORDER ERROR:", error.response?.data || error.message)
        return res.status(500).json({ message: "Could not place the order" })
    }
}
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, orderId } = req.body
        const payment = await instance.payments.fetch(razorpay_payment_id)
        if (!payment || payment.status != "captured") {
            return res.status(400).json({ message: "payment not captured" })
        }
        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }

        order.payment = true
        order.razorpayPaymentId = razorpay_payment_id
        await order.save()

        await order.populate("shopOrders.shopOrderItems.item", "name image price")
        await order.populate("shopOrders.shop", "name")
        await order.populate("shopOrders.owner", "name socketId")
        await order.populate("user", "name email mobile")

        const io = req.app.get('io')

        if (io) {
            order.shopOrders.forEach(shopOrder => {
                const ownerSocketId = shopOrder.owner.socketId
                if (ownerSocketId) {
                    io.to(ownerSocketId).emit('newOrder', {
                        _id: order._id,
                        paymentMethod: order.paymentMethod,
                        user: order.user,
                        shopOrders: shopOrder,
                        createdAt: order.createdAt,
                        deliveryAddress: order.deliveryAddress,
                        payment: order.payment
                    })
                }
            });
        }


        return res.status(200).json(order)

    } catch (error) {
        return res.status(500).json({ message: `verify payment  error ${error}` })
    }
}



const getMyOrders = async (req, res) => {
    try {
        const user = await User.findById(req.userId)
        if (user.role == "user") {
            const orders = await Order.find({ user: req.userId })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name")
                .populate("shopOrders.owner", "name email mobile")
                .populate("shopOrders.shopOrderItems.item", "name image price")

            return res.status(200).json(orders)
        } else if (user.role == "owner") {
            const orders = await Order.find({ "shopOrders.owner": req.userId })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name")
                .populate("user")
                .populate("shopOrders.shopOrderItems.item", "name image price")
                .populate("shopOrders.assignedDeliveryBoy", "fullName mobile")



            const filteredOrders = orders.map((order => ({
                _id: order._id,
                paymentMethod: order.paymentMethod,
                user: order.user,
                shopOrders: order.shopOrders.find(o => String(o.owner?._id || o.owner) == String(req.userId)),
                createdAt: order.createdAt,
                deliveryAddress: order.deliveryAddress,
                payment: order.payment,
                totalAmount: order.totalAmount
            }))).filter(order => order.shopOrders)


            return res.status(200).json(filteredOrders)
        }

    } catch (error) {
        return res.status(500).json({ message: `get User order error ${error}` })
    }
};
const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, shopId } = req.params;
        const { status } = req.body;
        
        // 1. Find and validate order
        const order = await Order.findById(orderId).populate("user"); // Populate user immediately
        if (!order) return res.status(404).json({ message: "Order not found" });

        const shopOrder = order.shopOrders.find(o => o.shop.toString() === shopId.toString());
        if (!shopOrder) return res.status(400).json({ message: "Shop order not found" });

        shopOrder.status = status;
        let candidates = [];
        let deliveryBoysPayload = [];

        // 2. Geospatial Logic for Delivery Boys
        if (status === "out of delivery" && !shopOrder.assignment) {
            const { longitude, latitude } = order.deliveryAddress;
            const lon = parseFloat(longitude);
            const lat = parseFloat(latitude);

            if (!isNaN(lon) && !isNaN(lat)) {
                const nearByDeliveryBoys = await User.find({
                    role: "deliveryBoy",
                    location: {
                        $near: {
                            $geometry: { type: "Point", coordinates: [lon, lat] },
                            $maxDistance: 10000 
                        }
                    }
                });

                const nearByIds = nearByDeliveryBoys.map(b => b._id);
                const busyAssignments = await DeliveryAssignment.find({
                    assignedTo: { $in: nearByIds },
                    status: { $in: ["assigned", "pickedup"] }
                }).distinct("assignedTo");

                const busyIdSet = new Set(busyAssignments.map(id => id.toString()));
                const availableBoys = nearByDeliveryBoys.filter(b => !busyIdSet.has(b._id.toString()));
                candidates = availableBoys.map(b => b._id);

                if (candidates.length > 0) {
                    const deliveryAssignment = await DeliveryAssignment.create({
                        order: order._id,
                        shop: shopOrder.shop,
                        shopOrderId: shopOrder._id,
                        brodcastedTo: candidates,
                        status: "brodcasted"
                    });

                    shopOrder.assignment = deliveryAssignment._id;
                    deliveryBoysPayload = availableBoys.map(b => ({
                        id: b._id,
                        fullName: b.fullName,
                        mobile: b.mobile
                    }));

                    const io = req.app.get('io');
                    if (io) {
                        await deliveryAssignment.populate([{ path: 'shop', select: 'name' }]);
                        availableBoys.forEach(boy => {
                            if (boy.socketId) {
                                io.to(boy.socketId).emit('newAssignment', {
                                    assignmentId: deliveryAssignment._id,
                                    orderId: order._id,
                                    shopId: shopOrder.shop,
                                    shopOrderId: shopOrder._id,
                                    shopName: deliveryAssignment.shop.name,
                                    deliveryAddress: order.deliveryAddress,
                                    subtotal: shopOrder.subtotal,
                                    items: shopOrder.shopOrderItems,
                                    status: shopOrder.status
                                });
                            }
                        });
                    }
                }
            }
        }

        // 3. Save and notify User
        await order.save();

        const io = req.app.get('io');
        // SAFE CHECK: Check if order.user exists and has a socketId
        if (io && order.user && order.user.socketId) {
            io.to(order.user.socketId).emit('update-status', {
                orderId: order._id,
                shopId: shopId,
                status: status
            });
        }

        // 4. Return response to Owner
        return res.status(200).json({
            shopOrder: shopOrder,
            availableBoys: deliveryBoysPayload,
            message: "Status updated successfully"
        });

    } catch (error) {
        console.error("Update Status Error:", error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { orderId, shopOrderId } = req.params;

        const user = await User.findById(req.userId);
        if (!user) return res.status(401).json({ message: "User not found" });

        const order = await Order.findById(orderId).populate("user", "socketId");
        if (!order) return res.status(404).json({ message: "Order not found" });

        const shopOrder = order.shopOrders.id(shopOrderId);
        if (!shopOrder) return res.status(404).json({ message: "Shop order not found" });

        const isCustomer = order.user?._id?.toString() === req.userId.toString();
        const isOwner = shopOrder.owner?.toString() === req.userId.toString();
        const isDeliveryBoy = shopOrder.assignedDeliveryBoy?.toString() === req.userId.toString();

        if (!isCustomer && !isOwner && !isDeliveryBoy) {
            return res.status(403).json({ message: "You are not authorized to cancel this order" });
        }

        if (shopOrder.status === "delivered") {
            return res.status(400).json({ message: "Delivered orders cannot be cancelled" });
        }

        if (shopOrder.status === "cancelled") {
            return res.status(400).json({ message: "Order is already cancelled" });
        }

        shopOrder.status = "cancelled";
        shopOrder.assignedDeliveryBoy = null;
        shopOrder.deliveryOtp = null;
        shopOrder.otpExpires = null;

        if (shopOrder.assignment) {
            await DeliveryAssignment.findByIdAndUpdate(shopOrder.assignment, {
                status: "cancelled"
            });
        }

        await order.save();

        const io = req.app.get("io");
        if (io) {
            io.emit("update-status", {
                orderId: order._id,
                shopId: shopOrder.shop,
                status: "cancelled"
            });
        }

        return res.status(200).json({
            message: "Order cancelled successfully",
            shopOrder
        });
    } catch (error) {
        console.error("Cancel Order Error:", error);
        return res.status(500).json({ message: `cancel order error ${error.message}` });
    }
};
const getDeliveryBoyAssignment = async (req, res) => {
    try {
        const deliveryBoyId = req.userId
        const assignments = await DeliveryAssignment.find({
            brodcastedTo: deliveryBoyId,
            status: "brodcasted"
        })
            .populate("order")
            .populate("shop")

        const formated = assignments.map(a => ({
            assignmentId: a._id,
            orderId: a.order._id,
            shopId: a.shop._id,
            shopOrderId: a.shopOrderId,
            shopName: a.shop.name,
            deliveryAddress: a.order.deliveryAddress,
            items: a.order.shopOrders.find(so => so._id.equals(a.shopOrderId)).shopOrderItems || [],
            subtotal: a.order.shopOrders.find(so => so._id.equals(a.shopOrderId))?.subtotal,
            status: a.order.shopOrders.find(so => so._id.equals(a.shopOrderId))?.status
        }))

        return res.status(200).json(formated)
    } catch (error) {
        return res.status(500).json({ message: `get Assignment error ${error}` })
    }
}

const getCancelledDeliveryOrders = async (req, res) => {
    try {
        const deliveryBoyId = req.userId
        const assignments = await DeliveryAssignment.find({
            assignedTo: deliveryBoyId,
            status: "cancelled"
        })
            .sort({ updatedAt: -1 })
            .populate("order")
            .populate("shop")

        const formatted = assignments.map(a => {
            const shopOrder = a.order?.shopOrders?.find(so => so._id.equals(a.shopOrderId))
            return {
                assignmentId: a._id,
                orderId: a.order?._id,
                shopOrderId: a.shopOrderId,
                shopName: a.shop?.name,
                deliveryAddress: a.order?.deliveryAddress,
                items: shopOrder?.shopOrderItems || [],
                subtotal: shopOrder?.subtotal,
                status: shopOrder?.status || "cancelled",
                cancelledAt: a.updatedAt
            }
        }).filter(a => a.orderId)

        return res.status(200).json(formatted)
    } catch (error) {
        return res.status(500).json({ message: `get cancelled delivery orders error ${error}` })
    }
}


const acceptOrder = async (req, res) => {
    try {
        const { assignmentId } = req.params
        const assignment = await DeliveryAssignment.findById(assignmentId)
        if (!assignment) {
            return res.status(400).json({ message: "assignment not found" })
        }
        if (assignment.status !== "brodcasted") {
            return res.status(400).json({ message: "assignment is expired" })
        }

        const alreadyAssigned = await DeliveryAssignment.findOne({
            assignedTo: req.userId,
            status: { $nin: ["brodcasted", "completed", "cancelled"] }
        })

        if (alreadyAssigned) {
            return res.status(400).json({ message: "You are already assigned to another order" })
        }

        assignment.assignedTo = req.userId
        assignment.status = 'assigned'
        assignment.acceptedAt = new Date()
        await assignment.save()

        const order = await Order.findById(assignment.order)
        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }

        let shopOrder = order.shopOrders.id(assignment.shopOrderId)
        shopOrder.assignedDeliveryBoy = req.userId
        await order.save()


        return res.status(200).json({
            message: 'order accepted'
        })
    } catch (error) {
        return res.status(500).json({ message: `accept order error ${error}` })
    }
}



const getCurrentOrder = async (req, res) => {
    try {
        const assignment = await DeliveryAssignment.findOne({
            assignedTo: req.userId,
            status: "assigned"
        })
            .populate("shop", "name")
            .populate("assignedTo", "fullName email mobile location")
            .populate({
                path: "order",
                populate: [{ path: "user", select: "fullName email location mobile" }]

            })

        if (!assignment) {
            return res.status(400).json({ message: "assignment not found" })
        }
        if (!assignment.order) {
            return res.status(400).json({ message: "order not found" })
        }

        const shopOrder = assignment.order.shopOrders.find(so => String(so._id) == String(assignment.shopOrderId))

        if (!shopOrder) {
            return res.status(400).json({ message: "shopOrder not found" })
        }

        let deliveryBoyLocation = { lat: null, lon: null }
        if (assignment.assignedTo.location.coordinates.length == 2) {
            deliveryBoyLocation.lat = assignment.assignedTo.location.coordinates[1]
            deliveryBoyLocation.lon = assignment.assignedTo.location.coordinates[0]
        }

        let customerLocation = { lat: null, lon: null }
        if (assignment.order.deliveryAddress) {
            customerLocation.lat = assignment.order.deliveryAddress.latitude
            customerLocation.lon = assignment.order.deliveryAddress.longitude
        }

        return res.status(200).json({
            _id: assignment.order._id,
            user: assignment.order.user,
            shopOrder,
            deliveryAddress: assignment.order.deliveryAddress,
            deliveryBoyLocation,
            customerLocation
        })


    } catch (error) {
        console.error("GET CURRENT ORDER ERROR:", error.message)
        return res.status(500).json({ message: `get current order error ${error.message}` })
    }
}

const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params
        const order = await Order.findById(orderId)
            .populate("user")
            .populate({
                path: "shopOrders.shop",
                model: "Shop"
            })
            .populate({
                path: "shopOrders.assignedDeliveryBoy",
                model: "User"
            })
            .populate({
                path: "shopOrders.shopOrderItems.item",
                model: "Item"
            })
            .lean()

        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }
        return res.status(200).json(order)
    } catch (error) {
        return res.status(500).json({ message: `get by id order error ${error}` })
    }
}

const sendDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId } = req.body
        const order = await Order.findById(orderId).populate("user")
        const shopOrder = order.shopOrders.id(shopOrderId)
        if (!order || !shopOrder) {
            return res.status(400).json({ message: "enter valid order/shopOrderid" })
        }
        const otp = Math.floor(1000 + Math.random() * 9000).toString()
        shopOrder.deliveryOtp = otp
        shopOrder.otpExpires = Date.now() + 5 * 60 * 1000
        await order.save()
        await sendDeliveryOtpMail(order.user.email, otp)
        return res.status(200).json({ message: `Otp sent Successfuly to ${order?.user?.fullName}` })
    } catch (error) {
        return res.status(500).json({ message: `delivery otp error ${error}` })
    }
}

const verifyDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId, otp } = req.body
        const order = await Order.findById(orderId).populate("user")
        const shopOrder = order.shopOrders.id(shopOrderId)
        if (!order || !shopOrder) {
            return res.status(400).json({ message: "enter valid order/shopOrderid" })
        }
        if (shopOrder.deliveryOtp !== otp || !shopOrder.otpExpires || shopOrder.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid/Expired Otp" })
        }

        shopOrder.status = "delivered"
        shopOrder.deliveredAt = Date.now()
        await order.save()
        await DeliveryAssignment.deleteOne({
            shopOrderId: shopOrder._id,
            order: order._id,
            assignedTo: shopOrder.assignedDeliveryBoy
        })

        return res.status(200).json({ message: "Order Delivered Successfully!" })

    } catch (error) {
        return res.status(500).json({ message: `verify delivery otp error ${error}` })
    }
}

 const getTodayDeliveries=async (req,res) => {
    try {
        const deliveryBoyId=req.userId
        const startsOfDay=new Date()
        startsOfDay.setHours(0,0,0,0)

        const orders=await Order.find({
           "shopOrders.assignedDeliveryBoy":deliveryBoyId,
           "shopOrders.status":"delivered",
           "shopOrders.deliveredAt":{$gte:startsOfDay}
        }).lean()
        //lean is used to get plain js object instead of mongoose document which is heavier and has methods and all, we just need data here so lean is better for performance

     let todaysDeliveries=[] 
     
     orders.forEach(order=>{
        order.shopOrders.forEach(shopOrder=>{
            if(shopOrder.assignedDeliveryBoy==deliveryBoyId &&
                shopOrder.status=="delivered" &&
                shopOrder.deliveredAt &&
                shopOrder.deliveredAt>=startsOfDay
            ){
                todaysDeliveries.push(shopOrder)
            }
        })
     })

let stats={}

todaysDeliveries.forEach(shopOrder=>{
    const hour=new Date(shopOrder.deliveredAt).getHours()
    stats[hour]=(stats[hour] || 0) + 1
})

let formattedStats=Object.keys(stats).map(hour=>({
 hour:parseInt(hour),
 count:stats[hour]   
}))

formattedStats.sort((a,b)=>a.hour-b.hour)

return res.status(200).json(formattedStats)
  

    } catch (error) {
        return res.status(500).json({ message: `today deliveries error ${error}` }) 
    }
}
const cancelAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const deliveryBoyId = req.userId; // From auth middleware

        // 1. Find the assignment
        const assignment = await DeliveryAssignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ message: "Assignment not found" });

        // 2. Security Check: Only the assigned delivery boy can cancel it
        if (!assignment.assignedTo || assignment.assignedTo.toString() !== deliveryBoyId.toString()) {
            return res.status(403).json({ message: "You are not authorized to cancel this assignment" });
        }

        // 3. Status Check: Cannot cancel if already picked up or delivered
        if (assignment.status === "pickedup" || assignment.status === "completed") {
            return res.status(400).json({ message: "Cannot cancel an order that is already picked up or delivered" });
        }

        // 4. Update the Order Model (Remove the assigned boy)
        const order = await Order.findById(assignment.order);
        if (order) {
            const shopOrder = order.shopOrders.id(assignment.shopOrderId);
            if (shopOrder) {
                shopOrder.assignedDeliveryBoy = null;
                shopOrder.status = "out of delivery";
                await order.save();

                const io = req.app.get("io");
                if (io) {
                    io.emit("update-status", {
                        orderId: order._id,
                        shopId: shopOrder.shop,
                        status: shopOrder.status
                    });
                }
            }
        }

        // 5. Update Assignment Status
        // Option A: Delete it so it can be re-broadcasted
        // Option B: Mark as 'cancelled' and keep for history
        assignment.status = "brodcasted"; // Reset back to broadcast so others can see it
        assignment.assignedTo = null;
        assignment.acceptedAt = null;
        await assignment.save();

        return res.status(200).json({ message: "Assignment cancelled. It is now available for delivery boys." });

    } catch (error) {
        console.error("Cancel Assignment Error:", error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
};


module.exports = {
    placeOrder,
    verifyPayment,
    getMyOrders,
    updateOrderStatus,
    getDeliveryBoyAssignment,
    acceptOrder,
    getCurrentOrder,
    getOrderById,
    sendDeliveryOtp,
    verifyDeliveryOtp,
    getTodayDeliveries,
    cancelAssignment,
    cancelOrder,
    getCancelledDeliveryOrders
}


const express =require("express")
const isAuth=require("../middlewares/isAuth.js")
const { acceptOrder, getCurrentOrder, getDeliveryBoyAssignment, getMyOrders, getOrderById, getTodayDeliveries, placeOrder, sendDeliveryOtp, updateOrderStatus, verifyDeliveryOtp, verifyPayment ,cancelAssignment,cancelOrder,getCancelledDeliveryOrders}=require("../controllers/order.controllers.js")




const orderRouter=express.Router()

orderRouter.post("/place-order",isAuth,placeOrder)
// orderRouter.post("/verify-payment",isAuth,verifyPayment)
orderRouter.post("/verify-payment",isAuth,verifyPayment)
orderRouter.get("/my-orders",isAuth,getMyOrders)
orderRouter.get("/get-assignments",isAuth,getDeliveryBoyAssignment)
orderRouter.get("/get-current-order",isAuth,getCurrentOrder)
orderRouter.get("/get-cancelled-delivery-orders",isAuth,getCancelledDeliveryOrders)
orderRouter.post("/send-delivery-otp",isAuth,sendDeliveryOtp)
orderRouter.post("/verify-delivery-otp",isAuth,verifyDeliveryOtp)
orderRouter.post("/update-status/:orderId/:shopId",isAuth,updateOrderStatus)
orderRouter.get('/accept-order/:assignmentId',isAuth,acceptOrder)
orderRouter.get('/get-order-by-id/:orderId',isAuth,getOrderById)
orderRouter.get('/get-today-deliveries',isAuth,getTodayDeliveries)
orderRouter.get('/cancel-assignment/:assignmentId',isAuth,cancelAssignment)
orderRouter.post('/cancel-order/:orderId/:shopOrderId',isAuth,cancelOrder)
// orderRouter.post("/cancel-delivery/:assignmentId", isAuth, cancelDeliveryByBoy)
module.exports=orderRouter

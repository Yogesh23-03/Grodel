const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Use true for port 465, false for port 587
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  
  },
});

const sendOtpMail=async (to,otp) => {
    await transporter.sendMail({
        from:process.env.EMAIL,
        to,
        subject:"Reset Your Password",
        html:`<p>Your OTP for password reset is <b>${otp}</b>. It expires in 5 minutes.</p>`
    })
}

const sendDeliveryOtpMail=async (to,otp) => {
    await transporter.sendMail({
        from:process.env.EMAIL,
        to,
        subject:"Delivery OTP",
        html:`<p>Your OTP for delivery is <b>${otp}</b>. It expires in 5 minutes.</p>`
    })
}

const sendDonationTrustMail=async (to,donation,trust) => {
    const items = donation.foodItems
        .map(item => `${item.name} - ${item.quantity} ${item.unit}`)
        .join("<br/>")

    await transporter.sendMail({
        from:process.env.EMAIL,
        to,
        subject:"New Food Donation Available",
        html:`<p>Hello ${trust.name},</p>
        <p>A new surplus food donation has been matched with your trust.</p>
        <p><b>Items:</b><br/>${items}</p>
        <p><b>Description:</b> ${donation.foodDescription || "N/A"}</p>
        <p><b>Pickup Address:</b> ${donation.pickupAddress}</p>
        <p><b>Pickup Time:</b> ${new Date(donation.pickupTime).toLocaleString()}</p>
        <p><b>Expiry Time:</b> ${new Date(donation.expiryTime).toLocaleString()}</p>`
    })
}


// Generic notification mail used by the direct-market (farmer/buyer) flows.
const sendNotificationMail = async (to, subject, html) => {
    await transporter.sendMail({
        from: process.env.EMAIL,
        to,
        subject,
        html
    })
}

module.exports = {
    sendOtpMail,
    sendDeliveryOtpMail,
    sendDonationTrustMail,
    sendNotificationMail
};

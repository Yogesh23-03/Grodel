const bcrypt = require("bcrypt")
const dotenv = require("dotenv")
dotenv.config()
const cloudinary = require("cloudinary").v2
const genToken = require("../utils/token.js")
const { groqVision, parseGroqJson } = require("../utils/groq.js")

const User = require("../models/user.Model.js")
const VendorProfile = require("../models/VendorProfile.js")
const VendorListing = require("../models/VendorListing.js")
const HelperProfile = require("../models/HelperProfile.js")
const VendorOrder = require("../models/VendorOrder.js")

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------
const PRODUCE_KEYWORDS = {
  vegetables: [
    "tomato", "potato", "onion", "carrot", "spinach", "beans",
    "ಟೊಮೆಟೊ", "ಆಲೂಗಡ್ಡೆ", "ಈರುಳ್ಳಿ",
    "தக்காளி", "உருளைக்கிழங்கு", "வெங்காயம்",
    "టొమాటో", "బంగాళాదుంప", "ఉల్లిపాయ",
    "टमाटर", "आलू", "प्याज"
  ],
  fruits: [
    "mango", "banana", "apple", "orange", "grapes", "papaya",
    "ಮಾವು", "ಬಾಳೆ", "ಸೇಬು",
    "மாம்பழம்", "வாழைப்பழம்", "ஆப்பிள்",
    "మామిడి", "అరటి", "ఆపిల్",
    "आम", "केला", "सेब"
  ]
}

const NUMBER_WORDS = {
  en: {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
    fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
    nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
    seventy: 70, eighty: 80, ninety: 90, hundred: 100
  },
  kn: {
    "ಒಂದು": 1, "ಎರಡು": 2, "ಮೂರು": 3, "ನಾಲ್ಕು": 4, "ಐದು": 5,
    "ಹತ್ತು": 10, "ಇಪ್ಪತ್ತು": 20, "ಮೂವತ್ತು": 30, "ನಲವತ್ತು": 40,
    "ಐವತ್ತು": 50, "ಅರವತ್ತು": 60, "ಎಪ್ಪತ್ತು": 70, "ಎಂಬತ್ತು": 80,
    "ತೊಂಬತ್ತು": 90, "ನೂರು": 100
  },
  ta: {
    "ஒன்று": 1, "இரண்டு": 2, "மூன்று": 3, "நான்கு": 4, "ஐந்து": 5,
    "பத்து": 10, "இருபது": 20, "முப்பது": 30, "நாற்பது": 40,
    "ஐம்பது": 50, "அறுபது": 60, "எழுபது": 70, "எண்பது": 80,
    "தொண்ணூறு": 90, "நூறு": 100
  },
  te: {
    "ఒకటి": 1, "రెండు": 2, "మూడు": 3, "నాలుగు": 4, "ఐదు": 5,
    "పది": 10, "ఇరవై": 20, "ముప్పై": 30, "నలభై": 40,
    "యాభై": 50, "అరవై": 60, "డెబ్బై": 70, "ఎనభై": 80,
    "తొంభై": 90, "వంద": 100
  },
  hi: {
    "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पाँच": 5,
    "दस": 10, "बीस": 20, "तीस": 30, "चालीस": 40,
    "पचास": 50, "साठ": 60, "सत्तर": 70, "अस्सी": 80,
    "नब्बे": 90, "सौ": 100
  }
}

/* Spoken copy. Every string here is read aloud by the app, so it stays short. */
const VOICE_COPY = {
  en: {
    open: "Your shop is open today.",
    closed: "Your shop is closed for today.",
    fresh: "Marked as fresh today.",
    priceUpdated: (name, price, unit) => "Updated " + name + " to " + price + " rupees per " + unit + ".",
    stockUpdated: (name, qty, unit) => name + " stock is now " + qty + " " + unit + ".",
    earnings: (amount, orders) => "Today you earned " + amount + " rupees from " + orders + " orders.",
    noMatch: "I could not find that item in your shop.",
    noNumber: "I did not hear a number. Say the item and the price.",
    hint: "Say: open shop, close shop, tomato 30 rupees, or how much did I earn.",
    directions: [
      "Say \u201copen shop\u201d every morning so customers can see you.",
      "Photograph what you sell \u2014 GroDel names it and suggests a price.",
      "Say a price like \u201ctomato 30 rupees\u201d to change it any time.",
      "New orders appear at the top. Tap Confirm to accept."
    ]
  },
  kn: {
    open: "\u0ca8\u0cbf\u0cae\u0ccd\u0cae \u0c85\u0c82\u0c97\u0ca1\u0cbf \u0c87\u0c82\u0ca6\u0cc1 \u0ca4\u0cc6\u0cb0\u0cc6\u0ca6\u0cc6.",
    closed: "\u0ca8\u0cbf\u0cae\u0ccd\u0cae \u0c85\u0c82\u0c97\u0ca1\u0cbf \u0c87\u0c82\u0ca6\u0cc1 \u0cae\u0cc1\u0c9a\u0ccd\u0c9a\u0cbf\u0ca6\u0cc6.",
    fresh: "\u0c87\u0c82\u0ca6\u0cc1 \u0cb9\u0cca\u0cb8 \u0cb8\u0cb0\u0c95\u0cc1 \u0c8e\u0c82\u0ca6\u0cc1 \u0c97\u0cc1\u0cb0\u0cc1\u0ca4\u0cbf\u0cb8\u0cb2\u0cbe\u0c97\u0cbf\u0ca6\u0cc6.",
    priceUpdated: (name, price, unit) => name + " \u0cac\u0cc6\u0cb2\u0cc6 " + price + " \u0cb0\u0cc2\u0caa\u0cbe\u0caf\u0cbf (" + unit + ") \u0c8e\u0c82\u0ca6\u0cc1 \u0cac\u0ca6\u0cb2\u0cbe\u0caf\u0cbf\u0cb8\u0cb2\u0cbe\u0c97\u0cbf\u0ca6\u0cc6.",
    stockUpdated: (name, qty, unit) => name + " \u0ca6\u0cc1\u0c95\u0cbe\u0ca3 " + qty + " " + unit + " \u0c8e\u0c82\u0ca6\u0cc1 \u0cac\u0ca6\u0cb2\u0cbe\u0caf\u0cbf\u0cb8\u0cb2\u0cbe\u0c97\u0cbf\u0ca6\u0cc6.",
    earnings: (amount, orders) => "\u0c87\u0c82\u0ca6\u0cc1 " + orders + " \u0c86\u0cb0\u0ccd\u0ca1\u0cb0\u0ccd\u0c97\u0cb3\u0cbf\u0c82\u0ca6 " + amount + " \u0cb0\u0cc2\u0caa\u0cbe\u0caf\u0cbf \u0cb8\u0c82\u0caa\u0cbe\u0ca6\u0cbf\u0cb8\u0cbf\u0ca6\u0ccd\u0ca6\u0cc0\u0cb0\u0cbf.",
    noMatch: "\u0ca8\u0cbf\u0cae\u0ccd\u0cae \u0c85\u0c82\u0c97\u0ca1\u0cbf\u0caf\u0cb2\u0ccd\u0cb2\u0cbf \u0c86 \u0cb8\u0cb0\u0c95\u0cc1 \u0cb8\u0cbf\u0c97\u0cc1\u0ca4\u0ccd\u0ca4\u0cbf\u0cb2\u0ccd\u0cb2.",
    noNumber: "\u0cb8\u0c82\u0c96\u0ccd\u0caf\u0cc6 \u0c95\u0cc7\u0cb3\u0cbf\u0cb8\u0cb2\u0cbf\u0cb2\u0ccd\u0cb2. \u0cb8\u0cb0\u0c95\u0cc1 \u0cae\u0ca4\u0ccd\u0ca4\u0cc1 \u0cac\u0cc6\u0cb2\u0cc6 \u0cb9\u0cc7\u0cb3\u0cbf.",
    hint: "\u0cb9\u0cc7\u0cb3\u0cbf: open shop, close shop, \u0c9f\u0cca\u0cae\u0cc6\u0c9f\u0cca 30 \u0cb0\u0cc2\u0caa\u0cbe\u0caf\u0cbf, \u0c87\u0c82\u0ca6\u0cc1 \u0c8e\u0cb7\u0ccd\u0c9f\u0cc1 \u0cb8\u0c82\u0caa\u0cbe\u0ca6\u0ca8\u0cc6.",
    directions: [
      "\u0caa\u0ccd\u0cb0\u0ca4\u0cbf \u0cac\u0cc6\u0cb3\u0cbf\u0c97\u0ccd\u0c97\u0cc6 \u201copen shop\u201d \u0c8e\u0ca8\u0ccd\u0ca8\u0cbf\u0cb0\u0cbf \u2014 \u0c97\u0ccd\u0cb0\u0cbe\u0cb9\u0c95\u0cb0\u0cbf\u0c97\u0cc6 \u0ca8\u0cbf\u0cae\u0ccd\u0cae \u0c85\u0c82\u0c97\u0ca1\u0cbf \u0c95\u0cbe\u0ca3\u0cc1\u0ca4\u0ccd\u0ca4\u0ca6\u0cc6.",
      "\u0ca8\u0cc0\u0cb5\u0cc1 \u0cae\u0cbe\u0cb0\u0cc1\u0cb5 \u0cb5\u0cb8\u0ccd\u0ca4\u0cc1\u0cb5\u0cbf\u0c97\u0cc6 \u0cab\u0ccb\u0c9f\u0ccb \u0ca4\u0cc6\u0c97\u0cc6\u0caf\u0cbf\u0cb0\u0cbf \u2014 GroDel \u0cb9\u0cc6\u0cb8\u0cb0\u0cc1 \u0cae\u0ca4\u0ccd\u0ca4\u0cc1 \u0cac\u0cc6\u0cb2\u0cc6 \u0cb9\u0cc7\u0cb3\u0cc1\u0ca4\u0ccd\u0ca4\u0ca6\u0cc6.",
      "\u0cac\u0cc6\u0cb2\u0cc6 \u0cac\u0ca6\u0cb2\u0cbf\u0cb8\u0cb2\u0cc1 \u201c\u0c9f\u0cca\u0cae\u0cc6\u0c9f\u0cca 30 \u0cb0\u0cc2\u0caa\u0cbe\u0caf\u0cbf\u201d \u0c8e\u0c82\u0ca6\u0cc1 \u0cb9\u0cc7\u0cb3\u0cbf.",
      "\u0cb9\u0cca\u0cb8 \u0c86\u0cb0\u0ccd\u0ca1\u0cb0\u0ccd \u0cae\u0cc7\u0cb2\u0cc6 \u0c95\u0cbe\u0ca3\u0cc1\u0ca4\u0ccd\u0ca4\u0ca6\u0cc6. \u0c92\u0caa\u0ccd\u0caa\u0cb2\u0cc1 Confirm \u0c92\u0ca4\u0ccd\u0ca4\u0cbf\u0cb0\u0cbf."
    ]
  },
  ta: {
    open: "\u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0b95\u0b9f\u0bc8 \u0b87\u0ba9\u0bcd\u0bb1\u0bc1 \u0ba4\u0bbf\u0bb1\u0ba8\u0bcd\u0ba4\u0bc1\u0bb3\u0bcd\u0bb3\u0ba4\u0bc1.",
    closed: "\u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0b95\u0b9f\u0bc8 \u0b87\u0ba9\u0bcd\u0bb1\u0bc1 \u0bae\u0bc2\u0b9f\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1.",
    fresh: "\u0b87\u0ba9\u0bcd\u0bb1\u0bc1 \u0baa\u0bc1\u0ba4\u0bbf\u0baf \u0baa\u0bca\u0bb0\u0bc1\u0b9f\u0bcd\u0b95\u0bb3\u0bcd \u0b8e\u0ba9\u0bb1\u0bc1 \u0b95\u0bc1\u0bb1\u0bbf\u0b95\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1.",
    priceUpdated: (name, price, unit) => name + " \u0bb5\u0bbf\u0bb2\u0bc8 " + price + " \u0bb0\u0bc2\u0baa\u0bbe\u0baf\u0bcd (" + unit + ") \u0b8e\u0ba9 \u0bae\u0bbe\u0bb1\u0bcd\u0bb1\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1.",
    stockUpdated: (name, qty, unit) => name + " \u0b87\u0bb0\u0bc1\u0baa\u0bcd\u0baa\u0bc1 " + qty + " " + unit + " \u0b8e\u0ba9 \u0bae\u0bbe\u0bb1\u0bcd\u0bb1\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1.",
    earnings: (amount, orders) => "\u0b87\u0ba9\u0bcd\u0bb1\u0bc1 " + orders + " \u0b86\u0bb0\u0bcd\u0b9f\u0bb0\u0bcd\u0b95\u0bb3\u0bbf\u0bb2\u0bcd \u0b87\u0bb0\u0bc1\u0ba8\u0bcd\u0ba4\u0bc1 " + amount + " \u0bb0\u0bc2\u0baa\u0bbe\u0baf\u0bcd \u0b9a\u0bae\u0bcd\u0baa\u0bbe\u0ba4\u0bbf\u0ba4\u0bcd\u0ba4\u0bc0\u0bb0\u0bcd\u0b95\u0bb3\u0bcd.",
    noMatch: "\u0b85\u0ba8\u0bcd\u0ba4 \u0baa\u0bca\u0bb0\u0bc1\u0bb3\u0bcd \u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0b95\u0b9f\u0bc8\u0baf\u0bbf\u0bb2\u0bcd \u0b87\u0bb2\u0bcd\u0bb2\u0bc8.",
    noNumber: "\u0b8e\u0ba3\u0bcd \u0b95\u0bc7\u0b9f\u0bcd\u0b95\u0bb5\u0bbf\u0bb2\u0bcd\u0bb2\u0bc8. \u0baa\u0bca\u0bb0\u0bc1\u0bb3\u0bcd \u0bae\u0bb1\u0bcd\u0bb1\u0bc1\u0bae\u0bcd \u0bb5\u0bbf\u0bb2\u0bc8 \u0b9a\u0bca\u0bb2\u0bcd\u0bb2\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd.",
    hint: "\u0b9a\u0bca\u0bb2\u0bcd\u0bb2\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd: open shop, close shop, \u0ba4\u0b95\u0bcd\u0b95\u0bbe\u0bb3\u0bbf 30 \u0bb0\u0bc2\u0baa\u0bbe\u0baf\u0bcd.",
    directions: [
      "\u0b92\u0bb5\u0bcd\u0bb5\u0bca\u0bb0\u0bc1 \u0b95\u0bbe\u0bb2\u0bc8\u0baf\u0bbf\u0bb2\u0bc1\u0bae\u0bcd \u201copen shop\u201d \u0b8e\u0ba9\u0bcd\u0bb1\u0bc1 \u0b9a\u0bca\u0bb2\u0bcd\u0bb2\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd.",
      "\u0ba8\u0bc0\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0bb5\u0bbf\u0bb1\u0bcd\u0baa\u0ba4\u0bc8 \u0baa\u0bc1\u0b95\u0bc8\u0baa\u0bcd\u0baa\u0b9f\u0bae\u0bcd \u0b8e\u0b9f\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u2014 GroDel \u0baa\u0bc6\u0baf\u0bb0\u0bc1\u0bae\u0bcd \u0bb5\u0bbf\u0bb2\u0bc8\u0baf\u0bc1\u0bae\u0bcd \u0b9a\u0bca\u0bb2\u0bcd\u0bb2\u0bc1\u0bae\u0bcd.",
      "\u0bb5\u0bbf\u0bb2\u0bc8\u0baf\u0bc8 \u0bae\u0bbe\u0bb1\u0bcd\u0bb1 \u201c\u0ba4\u0b95\u0bcd\u0b95\u0bbe\u0bb3\u0bbf 30 \u0bb0\u0bc2\u0baa\u0bbe\u0baf\u0bcd\u201d \u0b8e\u0ba9\u0bcd\u0bb1\u0bc1 \u0b9a\u0bca\u0bb2\u0bcd\u0bb2\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd.",
      "\u0baa\u0bc1\u0ba4\u0bbf\u0baf \u0b86\u0bb0\u0bcd\u0b9f\u0bb0\u0bcd \u0bae\u0bc7\u0bb2\u0bc7 \u0ba4\u0bcb\u0ba9\u0bcd\u0bb1\u0bc1\u0bae\u0bcd. \u0b8f\u0bb1\u0bcd\u0b95 Confirm \u0b85\u0bb4\u0bc1\u0ba4\u0bcd\u0ba4\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd."
    ]
  },
  te: {
    open: "\u0c2e\u0c40 \u0c26\u0c41\u0c15\u0c3e\u0c23\u0c02 \u0c08\u0c30\u0c4b\u0c1c\u0c41 \u0c24\u0c46\u0c30\u0c41\u0c1a\u0c2c\u0c21\u0c3f\u0c28\u0c26\u0c3f.",
    closed: "\u0c2e\u0c40 \u0c26\u0c41\u0c15\u0c3e\u0c23\u0c02 \u0c08\u0c30\u0c4b\u0c1c\u0c41 \u0c2e\u0c42\u0c38\u0c3f\u0c35\u0c47\u0c2f\u0c2c\u0c21\u0c3f\u0c28\u0c26\u0c3f.",
    fresh: "\u0c08\u0c30\u0c4b\u0c1c\u0c41 \u0c15\u0c4a\u0c24\u0c4d\u0c24 \u0c38\u0c30\u0c41\u0c15\u0c41 \u0c17\u0c41\u0c30\u0c4d\u0c24\u0c41 \u0c1a\u0c47\u0c2f\u0c2c\u0c21\u0c3f\u0c28\u0c26\u0c3f.",
    priceUpdated: (name, price, unit) => name + " \u0c27\u0c30 " + price + " \u0c30\u0c42\u0c2a\u0c3e\u0c2f\u0c32\u0c41 (" + unit + ") \u0c17\u0c3e \u0c2e\u0c3e\u0c30\u0c4d\u0c1a\u0c2c\u0c21\u0c3f\u0c28\u0c26\u0c3f.",
    stockUpdated: (name, qty, unit) => name + " \u0c28\u0c3f\u0c32\u0c4d\u0c35 " + qty + " " + unit + " \u0c17\u0c3e \u0c2e\u0c3e\u0c30\u0c4d\u0c1a\u0c2c\u0c21\u0c3f\u0c28\u0c26\u0c3f.",
    earnings: (amount, orders) => "\u0c08\u0c30\u0c4b\u0c1c\u0c41 " + orders + " \u0c06\u0c30\u0c4d\u0c21\u0c30\u0c4d\u0c32\u0c28\u0c41 " + amount + " \u0c30\u0c42\u0c2a\u0c3e\u0c2f\u0c32\u0c41 \u0c38\u0c02\u0c2a\u0c3e\u0c26\u0c3f\u0c02\u0c1a\u0c3e\u0c30\u0c41.",
    noMatch: "\u0c06 \u0c35\u0c38\u0c4d\u0c24\u0c41\u0c35\u0c41 \u0c2e\u0c40 \u0c26\u0c41\u0c15\u0c3e\u0c23\u0c02\u0c32\u0c4b \u0c32\u0c47\u0c26\u0c41.",
    noNumber: "\u0c38\u0c02\u0c16\u0c4d\u0c2f \u0c35\u0c3f\u0c28\u0c2a\u0c21\u0c32\u0c47\u0c26\u0c41. \u0c35\u0c38\u0c4d\u0c24\u0c41\u0c35\u0c41 \u0c2e\u0c30\u0c3f\u0c2f\u0c41 \u0c27\u0c30 \u0c1a\u0c46\u0c2a\u0c4d\u0c2a\u0c02\u0c21\u0c3f.",
    hint: "\u0c1a\u0c46\u0c2a\u0c4d\u0c2a\u0c02\u0c21\u0c3f: open shop, close shop, \u0c1f\u0c4a\u0c2e\u0c3e\u0c1f\u0c4b 30 \u0c30\u0c42\u0c2a\u0c3e\u0c2f\u0c32\u0c41.",
    directions: [
      "\u0c2a\u0c4d\u0c30\u0c24\u0c3f \u0c09\u0c26\u0c2f\u0c02 \u201copen shop\u201d \u0c05\u0c28\u0c3f \u0c1a\u0c46\u0c2a\u0c4d\u0c2a\u0c02\u0c21\u0c3f.",
      "\u0c2e\u0c40\u0c30\u0c41 \u0c05\u0c2e\u0c4d\u0c2e\u0c47 \u0c35\u0c38\u0c4d\u0c24\u0c41\u0c35\u0c41\u0c28\u0c41 \u0c2b\u0c4b\u0c1f\u0c4b \u0c24\u0c40\u0c38\u0c02\u0c21\u0c3f \u2014 GroDel \u0c2a\u0c47\u0c30\u0c41, \u0c27\u0c30 \u0c1a\u0c46\u0c2c\u0c41\u0c24\u0c41\u0c02\u0c26\u0c3f.",
      "\u0c27\u0c30 \u0c2e\u0c3e\u0c30\u0c4d\u0c1a\u0c21\u0c3e\u0c28\u0c3f\u0c15\u0c3f \u201c\u0c1f\u0c4a\u0c2e\u0c3e\u0c1f\u0c4b 30 \u0c30\u0c42\u0c2a\u0c3e\u0c2f\u0c32\u0c41\u201d \u0c05\u0c28\u0c3f \u0c1a\u0c46\u0c2a\u0c4d\u0c2a\u0c02\u0c21\u0c3f.",
      "\u0c15\u0c4a\u0c24\u0c4d\u0c24 \u0c06\u0c30\u0c4d\u0c21\u0c30\u0c4d \u0c2a\u0c48\u0c28 \u0c15\u0c28\u0c3f\u0c2a\u0c3f\u0c38\u0c4d\u0c24\u0c41\u0c02\u0c26\u0c3f. \u0c05\u0c02\u0c17\u0c40\u0c15\u0c30\u0c3f\u0c02\u0c1a\u0c1f\u0c3e\u0c28\u0c3f\u0c15\u0c3f Confirm \u0c28\u0c4a\u0c15\u0c4d\u0c15\u0c02\u0c21\u0c3f."
    ]
  },
  hi: {
    open: "\u0906\u092a\u0915\u0940 \u0926\u0941\u0915\u093e\u0928 \u0906\u091c \u0916\u0941\u0932 \u0917\u0908\u0964",
    closed: "\u0906\u092a\u0915\u0940 \u0926\u0941\u0915\u093e\u0928 \u0906\u091c \u092c\u0902\u0926 \u0939\u094b \u0917\u0908\u0964",
    fresh: "\u0906\u091c \u0915\u093e \u0924\u093e\u091c\u093c \u092e\u093e\u0932 \u0926\u0930\u094d\u091c \u0939\u094b \u0917\u092f\u093e\u0964",
    priceUpdated: (name, price, unit) => name + " \u0915\u093e \u0926\u093e\u092e " + price + " \u0930\u0941\u092a\u092f\u0947 (" + unit + ") \u0915\u0930 \u0926\u093f\u092f\u093e\u0964",
    stockUpdated: (name, qty, unit) => name + " \u0915\u093e \u0938\u094d\u091f\u0949\u0915 " + qty + " " + unit + " \u0915\u0930 \u0926\u093f\u092f\u093e\u0964",
    earnings: (amount, orders) => "\u0906\u091c " + orders + " \u0911\u0930\u094d\u0921\u0930 \u0938\u0947 " + amount + " \u0930\u0941\u092a\u092f\u0947 \u0915\u092e\u093e\u090f\u0964",
    noMatch: "\u0935\u0939 \u0938\u093e\u092e\u093e\u0928 \u0906\u092a\u0915\u0940 \u0926\u0941\u0915\u093e\u0928 \u092e\u0947\u0902 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964",
    noNumber: "\u0928\u0902\u092c\u0930 \u0938\u0941\u0928\u093e\u0908 \u0928\u0939\u0940\u0902 \u0926\u093f\u092f\u093e\u0964 \u0938\u093e\u092e\u093e\u0928 \u0914\u0930 \u0926\u093e\u092e \u0915\u0939\u093f\u090f\u0964",
    hint: "\u0915\u0939\u093f\u090f: open shop, close shop, \u091f\u092e\u093e\u091f\u0930 30 \u0930\u0941\u092a\u092f\u0947\u0964",
    directions: [
      "\u0939\u0930 \u0938\u0941\u092c\u0939 \u201copen shop\u201d \u0915\u0939\u093f\u090f \u2014 \u0917\u094d\u0930\u093e\u0939\u0915 \u0906\u092a\u0915\u0940 \u0926\u0941\u0915\u093e\u0928 \u0926\u0947\u0916\u0947\u0902\u0917\u0947\u0964",
      "\u091c\u094b \u092c\u0947\u091a\u0924\u0947 \u0939\u0948\u0902 \u0909\u0938\u0915\u0940 \u092b\u093c\u094b\u091f\u094b \u0932\u0940\u091c\u093f\u090f \u2014 GroDel \u0928\u093e\u092e \u0914\u0930 \u0926\u093e\u092e \u092c\u0924\u093e\u090f\u0917\u093e\u0964",
      "\u0926\u093e\u092e \u092c\u0926\u0932\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u201c\u091f\u092e\u093e\u091f\u0930 30 \u0930\u0941\u092a\u092f\u0947\u201d \u0915\u0939\u093f\u090f\u0964",
      "\u0928\u092f\u093e \u0911\u0930\u094d\u0921\u0930 \u090a\u092a\u0930 \u0926\u093f\u0916\u0947\u0917\u093e\u0964 \u092e\u0902\u091c\u0942\u0930 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f Confirm \u0926\u092c\u093e\u0907\u090f\u0964"
    ]
  }
}

/* The "how many orders" answer is the one reply that carries a number, so each
   language keeps its own sentence instead of borrowing a line from the spoken
   directions list. */
const PENDING_ORDER_COPY = {
  en: (count) => count === 1
    ? "You have 1 new order. Tap Confirm to accept."
    : "You have " + count + " new orders. Tap Confirm to accept.",
  kn: (count) => count + " ಹೊಸ ಆರ್ಡರ್ ಇದೆ. ಒಪ್ಪಲು Confirm ಒತ್ತಿರಿ.",
  ta: (count) => count + " புதிய ஆர்டர் வந்துள்ளது. ஏற்க Confirm அழுத்துங்கள்.",
  te: (count) => count + " కొత్త ఆర్డర్ వచ్చింది. అంగీకరించడానికి Confirm నొక్కండి.",
  hi: (count) => "आपके पास " + count + " नए ऑर्डर हैं। मंजूर करने के लिए Confirm दबाइए।"
}

const voiceCopy = (language) => ({
  ...(VOICE_COPY[language] || VOICE_COPY.en),
  pendingOrders: PENDING_ORDER_COPY[language] || PENDING_ORDER_COPY.en
})

/* Spoken commands are matched loosely, and the closed/close wording is checked
   first so "the shop is not open" cannot be read as a request to open. */
const VOICE_OPEN_PATTERN = /(open|tere|tira|thira|khul|khool|\u0ca4\u0cc6\u0cb0\u0cc6|\u0ca4\u0cbf\u0cb0\u0cc1|\u0c24\u0c46\u0c30|\u0c16\u0c4b\u0c32|\u0c16\u0c41\u0c32|\u0b24\u0bbf\u0bb1)/i
const VOICE_CLOSE_PATTERN = /(close|shut|band|bandh|mucc|muchch|\u092e\u0941\u091a\u0ccd|\u0cae\u0cc2\u0cb8|\u0c2e\u0c42\u0c38|\u092c\u0902\u0926|\u0bae\u0bc2\u0b9f)/i
const VOICE_FRESH_PATTERN = /(fresh|hosa|hos|\u0cb9\u0cca\u0cb8|\u0ca4\u0cbe\u0c9c|\u0c24\u0c3e\u0c1c|\u0924\u093e\u091c|\u0924\u093e\u091c\u093c|\u0baa\u0bc1\u0ba4\u0bbf\u0baf)/i
const VOICE_HELP_PATTERN = /(help|sahaya|sahaaya|sahai|madad|\u0cb8\u0cb9\u0cbe\u0caf|\u0cb8\u0cbe\u0cb9\u0cbe\u0caf|\u0c38\u0c39\u0cbe\u0c2f|\u0938\u0939\u093e\u092f\u0924\u093e|\u0b89\u0ba4\u0bb5\u0bbf)/i
const VOICE_EARNINGS_PATTERN = /(earn|earning|income|how much|money|\u0c8e\u0cb7\u0ccd\u0c9f\u0cc1|\u0c0e\u0c02\u0c24|\u0915\u092e\u093e\u0908|\u0906\u092e\u0926\u0928|\u0bb5\u0bb0\u0bc1\u0bae\u0bbe\u0ba9)/i
const VOICE_ORDERS_PATTERN = /(order|orders|\u0c86\u0cb0\u0ccd\u0ca1\u0cb0|\u0c06\u0c30\u0c4d\u0c21\u0c30|\u0911\u0930\u094d\u0921\u0930|\u0b86\u0bb0\u0bcd\u0b9f\u0bb0)/i
const VOICE_PRICE_PATTERN = /([^\s]+)\s+(\d+)/

/* A spoken command arrives with words around the number — "tomato stock 5",
   "the tomato price 30" — so every word is treated as a candidate item name and
   the words that only describe the action are skipped. */
const VOICE_STOCK_WORD = /(stock|quantity|qty|left|remaining|kilo|kilos|kg)/i
const VOICE_FILLER_WORDS = new Set([
  "the", "a", "an", "my", "is", "are", "now", "today", "price", "rate",
  "rupees", "rupee", "rs", "per", "for", "of", "and", "to", "set", "change",
  "update", "make", "it", "at", "only", "new"
])

const listingNames = (listing) => [
  listing.name,
  listing.nameInLanguage && listing.nameInLanguage.kn,
  listing.nameInLanguage && listing.nameInLanguage.ta,
  listing.nameInLanguage && listing.nameInLanguage.te,
  listing.nameInLanguage && listing.nameInLanguage.hi
].filter(Boolean).map((name) => String(name).toLowerCase())

const findListingByWord = (listings, word) => {
  if (!word || word.length < 2) return null
  return listings.find((listing) => listingNames(listing).some((name) => name.includes(word) || word.includes(name)))
}

const NAME_TAGS = ["naam", "name", "hesaru", "peru", "paer", "peyar", "\u0cb9\u0cc6\u0cb8\u0cb0\u0cc1", "\u0baa\u0bc6\u0baf\u0bb0\u0bcd", "\u0c2a\u0c47\u0c30\u0c41", "\u0928\u093e\u092e"]
const LANDMARK_TAGS = ["near", "paas", "hatra", "pakka", "\u0c85\u0cb0\u0cbf\u0c97\u0cbf\u0cb2\u0ccd", "\u0ca6\u0c97\u0ccd\u0c97\u0cb0", "\u0cb9\u0ca4\u0ccd\u0ca4\u0cbf\u0cb0", "\u0baa\u0b95\u0bcd\u0b95\u0bae\u0bcd", "\u0c2a\u0c15\u0ccd\u0c15", "\u0928\u091c\u0926\u0940\u0915", "\u092a\u093e\u0938"]
const VENDOR_UNITS = ["kg", "g", "dozen", "bundle", "piece", "litre"]

const PRODUCE_VISION_PROMPT = `This is a photo from an Indian street vendor or farmer.
Identify the produce and return ONLY valid JSON, no markdown, no explanation:
{
  "name": "English name of produce",
  "nameKn": "ಕನ್ನಡದಲ್ಲಿ ಹೆಸರು",
  "nameTa": "தமிழில் பெயர்",
  "nameTe": "తెలుగులో పేరు",
  "nameHi": "हिंदी में नाम",
  "category": "vegetables|fruits|grains|dairy|herbs|spices|flowers|other",
  "unit": "kg|g|dozen|bundle|piece|litre",
  "suggestedPrice": <typical Indian market price as number in INR per unit>,
  "freshnessNote": "one short sentence about freshness",
  "confidence": "high|medium|low"
}`

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
const uploadBufferToCloudinary = async (buffer, mimeType = "image/jpeg", folder = "grodel/vendor-listings") => {
  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`
  const result = await cloudinary.uploader.upload(dataUri, { folder })
  return result.secure_url
}

const getProduceMatch = (word) => {
  const lower = String(word || "").toLowerCase()
  for (const [category, keywords] of Object.entries(PRODUCE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return { name: word, category }
      }
    }
  }
  return null
}

/* The keyword table lists the English names first and then the same items in
   Kannada, Tamil, Telugu and Hindi, three at a time. A spoken word in any of
   those scripts maps back to its English name by position, so a vendor saying
   "\u0c9f\u0cca\u0cae\u0cc6\u0c9f\u0cca 26" reaches the listing filed as "tomato". */
const PRODUCE_ALIASES = (() => {
  const aliases = {}
  const isEnglish = (word) => /^[a-z]+$/i.test(word)
  for (const keywords of Object.values(PRODUCE_KEYWORDS)) {
    const english = keywords.filter(isEnglish)
    const spoken = keywords.filter((word) => !isEnglish(word))
    if (!english.length || !spoken.length) continue
    const perScript = spoken.length / 4
    spoken.forEach((word, index) => {
      const englishName = english[index % perScript]
      if (englishName) aliases[word] = englishName
    })
  }
  return aliases
})()

const translateProduceWord = (word) => {
  const lower = String(word || "").toLowerCase()
  if (!lower) return ""
  if (PRODUCE_ALIASES[lower]) return PRODUCE_ALIASES[lower]
  const hit = Object.keys(PRODUCE_ALIASES).find((alias) => lower.includes(alias.toLowerCase()))
  return hit ? PRODUCE_ALIASES[hit] : ""
}

/* Every way one spoken word can name the same produce: the word itself, the
   English name it maps to, and the other languages that map to that name. */
const produceNameVariants = (word) => {
  const spoken = String(word || "").toLowerCase()
  if (!spoken) return []
  const english = translateProduceWord(spoken) || spoken
  return [
    spoken,
    english,
    ...Object.keys(PRODUCE_ALIASES).filter((alias) => PRODUCE_ALIASES[alias] === english)
  ]
}

const parseVoiceNumber = (transcript, language) => {
  const digitMatch = String(transcript || "").match(/\d+/)
  if (digitMatch) {
    return { price: Number(digitMatch[0]), confidence: "high" }
  }
  const langWords = NUMBER_WORDS[language] || NUMBER_WORDS.en
  let sum = 0
  const words = String(transcript || "").toLowerCase().split(/\s+/)
  for (const word of words) {
    if (langWords[word]) sum += langWords[word]
  }
  if (sum > 0) return { price: sum, confidence: "medium" }
  return { price: null, confidence: "low" }
}

const requireVendor = async (req) => {
  const user = await User.findById(req.userId)
  if (!user || user.role !== "vendor") return null
  return user
}

const ensureVendorProfile = async (vendor) => VendorProfile.findOneAndUpdate(
  { userId: vendor._id },
  {
    $setOnInsert: {
      displayName: vendor.fullName,
      phoneNumber: vendor.mobile,
      registeredVia: "web"
    }
  },
  { new: true, upsert: true }
)


const sendVendorDirections = (language, created) => {
  const copy = voiceCopy(language)
  return created ? copy.directions : copy.directions.slice(1)
}

/* A signed-out visitor may analyse a photo while joining, so the endpoint keeps
   its own small per-IP budget instead of relying on an account. */
const PHOTO_WINDOW_MS = 60 * 60 * 1000
const PHOTO_LIMIT_PER_WINDOW = 30
const photoHits = new Map()

const allowPhotoAnalysis = (req) => {
  const key = String(req.ip || req.headers["x-forwarded-for"] || "unknown")
  const now = Date.now()
  const recent = (photoHits.get(key) || []).filter((at) => now - at < PHOTO_WINDOW_MS)
  if (recent.length >= PHOTO_LIMIT_PER_WINDOW) {
    photoHits.set(key, recent)
    return false
  }
  recent.push(now)
  photoHits.set(key, recent)
  if (photoHits.size > 500) {
    for (const [k, hits] of photoHits) {
      if (!hits.some((at) => now - at < PHOTO_WINDOW_MS)) photoHits.delete(k)
    }
  }
  return true
}

const analyseProduceImage = async (imageBuffer, mimeType = "image/jpeg") => {
  try {
    const text = await groqVision(imageBuffer.toString("base64"), mimeType, PRODUCE_VISION_PROMPT)
    return parseGroqJson(text)
  } catch (error) {
    console.error("GROQ VISION ERROR:", error.message)
    const aiError = new Error("AI analysis is temporarily unavailable — you can enter details manually instead")
    aiError.code = "AI_ANALYSIS_UNAVAILABLE"
    throw aiError
  }
}

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const resetDailyCountersIfNewDay = (vendorProfile) => {
  const today = new Date().toDateString()
  if (vendorProfile.lastStatsResetDate !== today) {
    vendorProfile.todayOrders = 0
    vendorProfile.todayEarnings = 0
    vendorProfile.lastStatsResetDate = today
  }
}

// ------------------------------------------------------------------
// Registration
// ------------------------------------------------------------------
const registerViaVoice = async (req, res) => {
  try {
    const {
      transcript = "",
      phoneNumber = "",
      fullName = "",
      products = "",
      landmark = "",
      price = "",
      unit = "",
      district = "",
      state = "",
      preferredLanguage = "kn"
    } = req.body

    const cleanPhone = String(phoneNumber).trim().replace(/\D/g, "")
    if (!cleanPhone) {
      return res.status(400).json({ success: false, message: "Please say your mobile number" })
    }
    if (cleanPhone.length < 10) {
      return res.status(400).json({ success: false, message: "Your mobile number needs 10 digits" })
    }

    /* Every answer can arrive as a typed value or inside the spoken sentence,
       so both are read and the explicit value wins. */
    const words = String(transcript).split(/\s+/).filter(Boolean)
    const tagged = (tags) => {
      for (let i = 0; i < words.length; i++) {
        if (tags.includes(words[i].toLowerCase()) && i + 1 < words.length) return words[i + 1]
      }
      return ""
    }
    const spokenProduce = words.map(getProduceMatch).find(Boolean) || null
    const spokenName = String(fullName).trim() || tagged(NAME_TAGS)
    const spokenLandmark = String(landmark).trim() || tagged(LANDMARK_TAGS)
    const produce = String(products).trim() || (spokenProduce ? spokenProduce.name : "")
    const produceCategory = produce ? (getProduceMatch(produce)?.category || "other") : null
    const spokenPrice = Number(String(price).replace(/[^\d.]/g, "")) || parseVoiceNumber(transcript, preferredLanguage).price
    const chosenUnit = VENDOR_UNITS.includes(String(unit)) ? String(unit) : "kg"
    const displayName = spokenName || cleanPhone

    let user = await User.findOne({ mobile: cleanPhone })
    let created = false
    if (!user) {
      user = await User.create({
        fullName: displayName,
        email: cleanPhone + "@vendor.grodel.local",
        mobile: cleanPhone,
        role: "vendor",
        password: await bcrypt.hash(cleanPhone, 10)
      })
      created = true
    } else {
      /* Joining as a vendor has to change the role: every /vendor page is
         guarded by "vendor", so a customer would be bounced back home. Their
         own password is left alone \u2014 we only promote the account. */
      if (user.role !== "vendor") user.role = "vendor"
      if (!user.fullName || user.fullName === user.mobile || /^vendor$/i.test(user.fullName)) {
        user.fullName = displayName
      }
      await user.save()
    }

    let vendorProfile = await VendorProfile.findOne({ userId: user._id })
    if (!vendorProfile) {
      vendorProfile = await VendorProfile.create({
        userId: user._id,
        displayName,
        phoneNumber: cleanPhone,
        preferredLanguage,
        registeredVia: "voice",
        location: { landmark: spokenLandmark, district: district || "", state: state || "" }
      })
    } else {
      vendorProfile.displayName = displayName || vendorProfile.displayName
      vendorProfile.preferredLanguage = preferredLanguage || vendorProfile.preferredLanguage
      vendorProfile.registeredVia = "voice"
      vendorProfile.location = {
        ...(vendorProfile.location || {}),
        landmark: spokenLandmark || (vendorProfile.location && vendorProfile.location.landmark) || "",
        district: district || (vendorProfile.location && vendorProfile.location.district) || "",
        state: state || (vendorProfile.location && vendorProfile.location.state) || ""
      }
      await vendorProfile.save()
    }

    /* Sign the vendor in. Asking someone who cannot read to hunt for the login
       page and type an email is how a registration gets abandoned. */
    const token = await genToken(user._id)
    res.cookie("token", token, {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true
    })

    return res.status(200).json({
      success: true,
      signedIn: true,
      created,
      credentials: created ? { email: user.email, password: cleanPhone } : null,
      user: { _id: user._id, fullName: user.fullName, email: user.email, mobile: user.mobile, role: user.role },
      vendorProfile,
      suggestion: produce
        ? {
            name: produce,
            category: produceCategory || "other",
            unit: chosenUnit,
            suggestedPrice: spokenPrice || null,
            landmark: spokenLandmark || ""
          }
        : null,
      directions: sendVendorDirections(preferredLanguage, created)
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const registerViaHelper = async (req, res) => {
  try {
    const helper = await User.findById(req.userId)
    if (!helper || helper.role !== "helper") {
      return res.status(403).json({ success: false, message: "Only helpers can register vendors" })
    }

    const { vendorName, phoneNumber, landmark, district, state, preferredLanguage, preferredPayment, categories } = req.body
    if (!vendorName || !phoneNumber) {
      return res.status(400).json({ success: false, message: "vendorName and phoneNumber are required" })
    }

    const cleanPhone = String(phoneNumber).trim().replace(/\D/g, "")
    let user = await User.findOne({ $or: [{ mobile: phoneNumber.trim() }, { mobile: cleanPhone }] })
    if (!user) {
      const hashedPassword = await bcrypt.hash(cleanPhone, 10)
      user = await User.create({
        fullName: vendorName,
        email: `${cleanPhone}@vendor.grodel.local`,
        mobile: cleanPhone,
        role: "vendor",
        password: hashedPassword
      })
    }

    let vendorProfile = await VendorProfile.findOne({ userId: user._id })
    if (!vendorProfile) {
      vendorProfile = await VendorProfile.create({
        userId: user._id,
        displayName: vendorName,
        phoneNumber: cleanPhone,
        preferredLanguage: preferredLanguage || "kn",
        registeredVia: "helper",
        helperUserId: helper._id,
        location: { landmark: landmark || "", district: district || "", state: state || "" },
        preferredPayment: preferredPayment || "cash"
      })
    } else {
      vendorProfile.helperUserId = helper._id
      vendorProfile.registeredVia = "helper"
      if (preferredPayment) vendorProfile.preferredPayment = preferredPayment
      await vendorProfile.save()
    }

    await HelperProfile.findOneAndUpdate(
      { userId: helper._id },
      { $addToSet: { vendorsRegistered: vendorProfile._id } },
      { upsert: true }
    )

    if (Array.isArray(categories)) {
      for (const category of categories) {
        if (!VendorListing.schema.paths.category.enumValues.includes(category)) continue
        const existing = await VendorListing.findOne({ vendorId: vendorProfile._id, category })
        if (!existing) {
          await VendorListing.create({
            vendorId: vendorProfile._id,
            name: category,
            category,
            priceSetBy: "typed",
            addedVia: "manual",
            isAvailableToday: false
          })
        }
      }
    }

    return res.status(200).json({ success: true, vendorProfile })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const registerHelper = async (req, res) => {
  try {
    const { fullName, phoneNumber, district, state, organisation } = req.body
    if (!fullName || !phoneNumber) {
      return res.status(400).json({ success: false, message: "fullName and phoneNumber are required" })
    }

    const cleanPhone = String(phoneNumber).trim().replace(/\D/g, "")
    let user = await User.findOne({ $or: [{ mobile: phoneNumber.trim() }, { mobile: cleanPhone }] })
    if (!user) {
      const hashedPassword = await bcrypt.hash(cleanPhone, 10)
      user = await User.create({
        fullName,
        email: `${cleanPhone}@helper.grodel.local`,
        mobile: cleanPhone,
        role: "helper",
        password: hashedPassword
      })
    }

    let helperProfile = await HelperProfile.findOne({ userId: user._id })
    if (!helperProfile) {
      helperProfile = await HelperProfile.create({
        userId: user._id,
        fullName,
        phoneNumber: cleanPhone,
        district: district || "",
        state: state || "",
        organisation: organisation || ""
      })
    }

    return res.status(201).json({ success: true, helperProfile })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// AI Photo Analysis
// ------------------------------------------------------------------
const analyseProducePhoto = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: "image file is required" })
    }
    if (!allowPhotoAnalysis(req)) {
      return res.status(429).json({ success: false, message: "Too many photos for now \u2014 please try again in a little while" })
    }

    const imageBuffer = req.file.buffer
    const mimeType = req.file.mimetype || "image/jpeg"

    /* Identify first: the answer is what the vendor needs, and a storage
       hiccup must not cost them the identification. */
    const aiSuggestion = await analyseProduceImage(imageBuffer, mimeType)

    let imageUrl = ""
    try {
      imageUrl = await uploadBufferToCloudinary(imageBuffer, mimeType, "grodel/vendor-listings")
    } catch (uploadError) {
      console.error("CLOUDINARY UPLOAD ERROR:", uploadError.message)
    }

    return res.status(200).json({ success: true, aiSuggestion, imageUrl })
  } catch (error) {
    if (error.code === "AI_ANALYSIS_UNAVAILABLE") {
      return res.status(503).json({ success: false, code: error.code, message: error.message })
    }
    return res.status(500).json({ success: false, message: error.message })
  }
}

const uploadListingPhoto = async (req, res) => {
  try {
    const vendor = await requireVendor(req)
    if (!vendor) return res.status(403).json({ success: false, message: "Vendor role required" })
    if (!req.file || !req.file.buffer) return res.status(400).json({ success: false, message: "image file is required" })

    const imageUrl = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype || "image/jpeg", "grodel/vendor-listings")
    return res.status(200).json({ success: true, imageUrl })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const confirmListing = async (req, res) => {
  try {
    const vendor = await requireVendor(req)
    if (!vendor) {
      return res.status(403).json({ success: false, message: "Vendor role required" })
    }
    const vendorProfile = await VendorProfile.findOne({ userId: vendor._id })
    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: "Vendor profile not found" })
    }

    const {
      name, nameKn, nameTa, nameTe, nameHi,
      category, unit, availableQuantity,
      pricePerUnit, priceSetBy, aiSuggestedPrice,
      image, freshnessNote, addedVia, listingSource, isFreshToday,
      grade, gradeSource, harvestDate, minOrderQty, negotiable, certifications, bulkPricing
    } = req.body

    if (!name || !category || !unit || pricePerUnit === undefined || availableQuantity === undefined) {
      return res.status(400).json({ success: false, message: "name, category, unit, pricePerUnit and availableQuantity are required" })
    }

    const listing = await VendorListing.create({
      vendorId: vendorProfile._id,
      name,
      nameInLanguage: { kn: nameKn || "", ta: nameTa || "", te: nameTe || "", hi: nameHi || "" },
      category,
      unit,
      availableQuantity,
      pricePerUnit,
      priceSetBy: priceSetBy || "typed",
      aiSuggestedPrice,
      image,
      freshnessNote,
      addedVia: addedVia || "photo",
      listingSource: listingSource || "manual",
      isFreshToday: isFreshToday === undefined ? new Date().getHours() < 10 : Boolean(isFreshToday),
      grade: grade || null,
      gradeSource: gradeSource || null,
      harvestDate: harvestDate || null,
      minOrderQty: minOrderQty ?? null,
      negotiable: Boolean(negotiable),
      certifications: Array.isArray(certifications) ? certifications : [],
      bulkPricing: Array.isArray(bulkPricing) ? bulkPricing : []
    })

    if (new Date().getHours() < 10 && !vendorProfile.isFreshToday) {
      vendorProfile.isFreshToday = true
      await vendorProfile.save()
    }

    // Direct Market Access: match buyer price alerts against this new listing.
    try {
      const { checkPriceAlertsForListing } = require("./directMarket.controller.js")
      await checkPriceAlertsForListing(listing)
    } catch (alertError) {
      console.error("PRICE ALERT HOOK ERROR:", alertError.message)
    }

    return res.status(201).json({ success: true, listing })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// Voice Price Parsing
// ------------------------------------------------------------------
const parseVoicePrice = async (req, res) => {
  try {
    const { transcript = "", language = "kn" } = req.body
    const result = parseVoiceNumber(transcript, language)
    return res.status(200).json({ success: true, ...result })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------------
const toggleAvailability = async (req, res) => {
  try {
    const vendor = await requireVendor(req)
    if (!vendor) {
      return res.status(403).json({ success: false, message: "Vendor role required" })
    }
    const vendorProfile = await VendorProfile.findOne({ userId: vendor._id })
    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: "Vendor profile not found" })
    }

    vendorProfile.isActive = !vendorProfile.isActive
    if (vendorProfile.isActive) {
      vendorProfile.lastOpenedAt = Date.now()
      vendorProfile.isFreshToday = new Date().getHours() <= 7
    } else {
      vendorProfile.isFreshToday = false
    }
    await vendorProfile.save()

    return res.status(200).json({
      success: true,
      isActive: vendorProfile.isActive,
      isFreshToday: vendorProfile.isFreshToday
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const getMyDashboard = async (req, res) => {
  try {
    const vendor = await requireVendor(req)
    if (!vendor) {
      return res.status(403).json({ success: false, message: "Vendor role required" })
    }
    const vendorProfile = await ensureVendorProfile(vendor)
    resetDailyCountersIfNewDay(vendorProfile)

    const listings = await VendorListing.find({ vendorId: vendorProfile._id }).sort({ createdAt: -1 })

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [todayOrders, pendingCount, confirmedCount, readyCount] = await Promise.all([
      VendorOrder.countDocuments({ vendor: vendorProfile._id, createdAt: { $gte: startOfDay } }),
      VendorOrder.countDocuments({ vendor: vendorProfile._id, status: "pending" }),
      VendorOrder.countDocuments({ vendor: vendorProfile._id, status: { $in: ["confirmed", "ready"] } }),
      VendorOrder.countDocuments({ vendor: vendorProfile._id, status: "out of delivery" })
    ])

    vendorProfile.todayOrders = todayOrders
    await vendorProfile.save()

    return res.status(200).json({
      success: true,
      vendorProfile,
      listings,
      todayOrders,
      todayEarnings: vendorProfile.todayEarnings || 0,
      orderCounts: { pending: pendingCount, confirmed: confirmedCount, outForDelivery: readyCount }
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const updateListing = async (req, res) => {
  try {
    const vendor = await requireVendor(req)
    if (!vendor) {
      return res.status(403).json({ success: false, message: "Vendor role required" })
    }
    const vendorProfile = await VendorProfile.findOne({ userId: vendor._id })
    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: "Vendor profile not found" })
    }
    const listing = await VendorListing.findOne({ _id: req.params.listingId, vendorId: vendorProfile._id })
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" })
    }

    const { pricePerUnit, availableQuantity, isAvailableToday, priceSetBy, grade, harvestDate, minOrderQty, negotiable, certifications, bulkPricing } = req.body
    if (pricePerUnit !== undefined) {
      listing.pricePerUnit = pricePerUnit
      if (priceSetBy) listing.priceSetBy = priceSetBy
    }
    if (availableQuantity !== undefined) listing.availableQuantity = availableQuantity
    if (isAvailableToday !== undefined) listing.isAvailableToday = Boolean(isAvailableToday)
    if (grade !== undefined) listing.grade = grade || null
    if (harvestDate !== undefined) listing.harvestDate = harvestDate || null
    if (minOrderQty !== undefined) listing.minOrderQty = minOrderQty
    if (negotiable !== undefined) listing.negotiable = Boolean(negotiable)
    if (certifications !== undefined) listing.certifications = Array.isArray(certifications) ? certifications : []
    if (bulkPricing !== undefined) listing.bulkPricing = Array.isArray(bulkPricing) ? bulkPricing : []
    await listing.save()

    return res.status(200).json({ success: true, listing })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const deleteListing = async (req, res) => {
  try {
    const vendor = await requireVendor(req)
    if (!vendor) {
      return res.status(403).json({ success: false, message: "Vendor role required" })
    }
    const vendorProfile = await VendorProfile.findOne({ userId: vendor._id })
    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: "Vendor profile not found" })
    }
    const listing = await VendorListing.findOne({ _id: req.params.listingId, vendorId: vendorProfile._id })
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" })
    }

    listing.isAvailableToday = false
    await listing.save()

    return res.status(200).json({ success: true, message: "Listing deleted" })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// Customer Discovery
// ------------------------------------------------------------------
const getNearbyVendors = async (req, res) => {
  try {
    const { lat, lng, category } = req.query
    // 50km is the discovery horizon: a tighter default silently hid farms that
    // a buyer in the same district would happily travel to. Callers can still
    // narrow it with ?radius=.
    const radius = parseFloat(req.query.radius || 50)

    /* No coordinates (denied geolocation, or the browser has none) must not
       mean "no farmers" — every active farm is returned, with distanceKm left
       null so the card shows "location not shared" instead of a distance. */
    const vendors = await VendorProfile.find({ isActive: true })
    const result = []

    for (const vendor of vendors) {
      const vendorLat = vendor.location && vendor.location.lat
      const vendorLng = vendor.location && vendor.location.lng
      let distanceKm = null
      if (lat && lng && vendorLat && vendorLng) {
        distanceKm = haversine(parseFloat(lat), parseFloat(lng), vendorLat, vendorLng)
      }
      if (distanceKm !== null && distanceKm > radius) continue

      let listings = await VendorListing.find({ vendorId: vendor._id, isAvailableToday: true })
      if (category && category !== "all" && category !== "All") {
        listings = listings.filter(item => item.category === category)
        if (listings.length === 0) continue
      }

      const vendorObj = vendor.toObject()
      vendorObj.listings = listings
      vendorObj.distanceKm = distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null
      result.push(vendorObj)
    }

    result.sort((a, b) => {
      if (Boolean(a.isFreshToday) !== Boolean(b.isFreshToday)) return a.isFreshToday ? -1 : 1
      const ratingDiff = (b.rating && b.rating.average || 0) - (a.rating && a.rating.average || 0)
      if (ratingDiff !== 0) return ratingDiff
      const distanceA = a.distanceKm === null ? Infinity : a.distanceKm
      const distanceB = b.distanceKm === null ? Infinity : b.distanceKm
      return distanceA - distanceB
    })

    return res.status(200).json({ success: true, vendors: result })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const getVendorById = async (req, res) => {
  try {
    const vendorProfile = await VendorProfile.findById(req.params.vendorId)
    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: "Vendor not found" })
    }
    const listings = await VendorListing.find({ vendorId: vendorProfile._id, isAvailableToday: true }).sort({ createdAt: -1 })
    return res.status(200).json({ success: true, vendorProfile, listings })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const rateVendor = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user || user.role !== "user") {
      return res.status(403).json({ success: false, message: "Only customers can rate vendors" })
    }
    const vendorProfile = await VendorProfile.findById(req.params.vendorId)
    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: "Vendor not found" })
    }

    const rating = parseFloat(req.body.rating)
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" })
    }

    const previous = (vendorProfile.ratings || []).find(
      r => String(r.userId) === String(user._id)
    )

    let average = (vendorProfile.rating && vendorProfile.rating.average) || 0
    let count = (vendorProfile.rating && vendorProfile.rating.count) || 0

    if (previous) {
      const total = average * count - previous.rating + rating
      average = total / count
      previous.rating = rating
      previous.at = new Date()
    } else {
      const total = average * count + rating
      count += 1
      average = total / count
      vendorProfile.ratings.push({ userId: user._id, rating, at: new Date() })
    }

    vendorProfile.rating = { average: Math.round(average * 10) / 10, count }
    vendorProfile.markModified("ratings")
    await vendorProfile.save()

    return res.status(200).json({ success: true, vendorProfile })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const runVoiceCommand = async (req, res) => {
  try {
    const vendor = await requireVendor(req)
    if (!vendor) {
      return res.status(403).json({ success: false, message: "Vendor role required" })
    }
    const vendorProfile = await ensureVendorProfile(vendor)
    resetDailyCountersIfNewDay(vendorProfile)
    const language = vendorProfile.preferredLanguage || "kn"
    const copy = voiceCopy(language)

    const transcript = String(req.body.transcript || "").trim()
    const lower = transcript.toLowerCase()
    const say = (text, extra = {}) => res.status(200).json({ success: true, transcript, language, said: text, ...extra })

    if (!transcript || VOICE_HELP_PATTERN.test(lower)) return say(copy.hint)

    if (VOICE_CLOSE_PATTERN.test(lower)) {
      vendorProfile.isActive = false
      vendorProfile.isFreshToday = false
      await vendorProfile.save()
      return say(copy.closed, { action: "close", isActive: false, isFreshToday: false })
    }

    if (VOICE_OPEN_PATTERN.test(lower)) {
      vendorProfile.isActive = true
      vendorProfile.lastOpenedAt = Date.now()
      if (new Date().getHours() <= 10) vendorProfile.isFreshToday = true
      await vendorProfile.save()
      return say(copy.open, { action: "open", isActive: true, isFreshToday: vendorProfile.isFreshToday })
    }

    if (VOICE_FRESH_PATTERN.test(lower)) {
      vendorProfile.isFreshToday = true
      await vendorProfile.save()
      return say(copy.fresh, { action: "fresh", isFreshToday: true })
    }

    if (VOICE_EARNINGS_PATTERN.test(lower)) {
      return say(copy.earnings(vendorProfile.todayEarnings || 0, vendorProfile.todayOrders || 0), { action: "earnings" })
    }

    if (VOICE_ORDERS_PATTERN.test(lower)) {
      const pending = await VendorOrder.countDocuments({ vendor: vendorProfile._id, status: "pending" })
      return say(copy.pendingOrders(pending), { action: "orders", pending })
    }

    /* "tomato 30 rupees" / "tomato 30" / "tomato 20 kg" */
    const priceMatch = VOICE_PRICE_PATTERN.exec(lower)
    if (priceMatch) {
      const amount = Number(priceMatch[2])
      const before = lower.slice(0, priceMatch.index).split(/\s+/)
      const after = lower.slice(priceMatch.index + priceMatch[0].length).split(/\s+/)
      const candidates = [priceMatch[1], ...before, ...after]
        /* \p{M} keeps the vowel signs of Kannada/Tamil/Telugu/Devanagari words,
           which are combining marks and would otherwise be stripped. */
        .map((word) => word.replace(/[^\p{L}\p{N}\p{M}]/gu, "").trim())
        .filter((word) => word.length > 1 && !VOICE_FILLER_WORDS.has(word) && !VOICE_STOCK_WORD.test(word))
      const wantsStock = /(stock|quantity|kilo|kg|\u0cb8\u0ccd\u0c9f\u0cbe\u0c95\u0ccd|\u0bb8\u0bcd\u0b9f\u0bbe\u0b95\u0bcd|\u0c38\u0bcd\u0c1f\u0bbe\u0c95\u0bcd|\u0938\u094d\u091f\u0949\u0915|\u0c95\u0cbf\u0cb2\u0ccb|\u0c15\u0c3f\u0c32\u0ccb)/i.test(lower)

      const listings = await VendorListing.find({ vendorId: vendorProfile._id })
      let target = null
      for (const word of candidates) {
        for (const name of produceNameVariants(word)) {
          target = findListingByWord(listings, name)
          if (target) break
        }
        if (target) break
      }

      if (!target) return say(copy.noMatch + " " + copy.hint, { action: "nomatch" })

      if (wantsStock) {
        target.availableQuantity = amount
        await target.save()
        return say(copy.stockUpdated(target.name, amount, target.unit || "kg"), { action: "stock", listingId: target._id })
      }

      target.pricePerUnit = amount
      target.priceSetBy = "voice"
      await target.save()
      return say(copy.priceUpdated(target.name, amount, target.unit || "kg"), {
        action: "price",
        listingId: target._id,
        pricePerUnit: amount
      })
    }

    return say(copy.hint, { action: "unknown" })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const getVendorStats = async (req, res) => {
  try {
    const vendors = await VendorProfile.countDocuments({})
    const produce = await VendorListing.countDocuments({})
    const ordersAgg = await VendorProfile.aggregate([{ $group: { _id: null, total: { $sum: "$totalOrders" } } }])
    const orders = ordersAgg.length ? ordersAgg[0].total : 0
    return res.status(200).json({ success: true, stats: { vendors, produce, orders } })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ------------------------------------------------------------------
// Vendor produce orders (customer checkout)
// ------------------------------------------------------------------
const placeVendorOrder = async (req, res) => {
  try {
    const customer = await User.findById(req.userId)
    if (!customer || customer.role !== "user") {
      return res.status(403).json({ success: false, message: "Only customers can order produce" })
    }

    const { vendorId, items, deliveryAddress, contactPhone, note, paymentMethod } = req.body

    const vendorProfile = await VendorProfile.findById(vendorId)
    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: "Vendor not found" })
    }
    if (!vendorProfile.isActive) {
      return res.status(400).json({ success: false, message: "This vendor is closed today" })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Add at least one item to your basket" })
    }
    if (!deliveryAddress || !deliveryAddress.text) {
      return res.status(400).json({ success: false, message: "Delivery address is required" })
    }

    // Re-fetch fresh listings server-side: never trust client prices
    const listingIds = items.map(i => i.listingId).filter(Boolean)
    const listings = await VendorListing.find({ _id: { $in: listingIds }, vendorId: vendorProfile._id, isAvailableToday: true })
    if (!listings.length) {
      return res.status(400).json({ success: false, message: "The selected produce is no longer available" })
    }

    const orderItems = []
    let total = 0
    for (const entry of items) {
      const listing = listings.find(l => String(l._id) === String(entry.listingId))
      if (!listing) continue
      const qty = Math.max(1, Math.min(Number(entry.quantity) || 1, Math.max(1, listing.availableQuantity || 1)))
      total += (listing.pricePerUnit || 0) * qty
      orderItems.push({
        listing: listing._id,
        name: listing.name,
        image: listing.image || "",
        pricePerUnit: listing.pricePerUnit || 0,
        quantity: qty,
        unit: listing.unit || "kg"
      })
    }

    if (!orderItems.length) {
      return res.status(400).json({ success: false, message: "The selected produce is no longer available" })
    }

    const order = await VendorOrder.create({
      customer: customer._id,
      vendor: vendorProfile._id,
      vendorUserId: vendorProfile.userId,
      items: orderItems,
      totalAmount: Math.round(total * 100) / 100,
      paymentMethod: paymentMethod === "online" ? "online" : "cod",
      deliveryAddress: {
        text: deliveryAddress.text,
        latitude: deliveryAddress.latitude || undefined,
        longitude: deliveryAddress.longitude || undefined
      },
      contactPhone: contactPhone || customer.mobile || "",
      note: note || "",
      status: "pending",
      statusHistory: [{ status: "pending" }]
    })

    // Notify the vendor in real time if they are online
    try {
      const vendorUser = await User.findById(vendorProfile.userId)
      const io = req.app.get("io")
      if (io && vendorUser && vendorUser.socketId) {
        io.to(vendorUser.socketId).emit("newVendorOrder", {
          orderId: order._id,
          vendorId: vendorProfile._id,
          customerName: customer.fullName,
          items: order.items,
          totalAmount: order.totalAmount,
          note: order.note,
          createdAt: order.createdAt
        })
      }
    } catch (notifyError) {
      console.error("VENDOR ORDER NOTIFY ERROR:", notifyError.message)
    }

    return res.status(201).json({ success: true, order })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const getMyVendorOrders = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user || user.role !== "user") {
      return res.status(403).json({ success: false, message: "Only customers can view produce orders" })
    }
    const orders = await VendorOrder.find({ customer: req.userId })
      .sort({ createdAt: -1 })
      .populate("vendor", "displayName profilePhoto rating location")
    return res.status(200).json({ success: true, orders })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const getVendorIncomingOrders = async (req, res) => {
  try {
    const vendor = await requireVendor(req)
    if (!vendor) {
      return res.status(403).json({ success: false, message: "Vendor role required" })
    }
    const vendorProfile = await VendorProfile.findOne({ userId: vendor._id })
    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: "Vendor profile not found" })
    }
    const orders = await VendorOrder.find({ vendor: vendorProfile._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("customer", "fullName mobile")
    return res.status(200).json({ success: true, orders })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const updateVendorOrderStatus = async (req, res) => {
  try {
    const vendor = await requireVendor(req)
    if (!vendor) {
      return res.status(403).json({ success: false, message: "Vendor role required" })
    }
    const vendorProfile = await VendorProfile.findOne({ userId: vendor._id })
    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: "Vendor profile not found" })
    }

    const order = await VendorOrder.findOne({ _id: req.params.orderId, vendor: vendorProfile._id })
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }

    const { status } = req.body
    const allowed = ["pending", "confirmed", "ready", "out of delivery", "delivered", "cancelled"]
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" })
    }
    if (["delivered", "cancelled"].includes(order.status)) {
      return res.status(400).json({ success: false, message: `Order is already ${order.status}` })
    }

    order.status = status
    order.statusHistory.push({ status })

    if (status === "delivered") {
      resetDailyCountersIfNewDay(vendorProfile)
      vendorProfile.todayOrders = (vendorProfile.todayOrders || 0) + 1
      vendorProfile.todayEarnings = Math.round(((vendorProfile.todayEarnings || 0) + (order.totalAmount || 0)) * 100) / 100
      vendorProfile.totalOrders = (vendorProfile.totalOrders || 0) + 1
      vendorProfile.totalEarnings = Math.round(((vendorProfile.totalEarnings || 0) + (order.totalAmount || 0)) * 100) / 100
      await vendorProfile.save()

      // decrement stock at delivery time
      for (const item of order.items) {
        if (!item.listing) continue
        const listing = await VendorListing.findById(item.listing)
        if (listing) {
          listing.availableQuantity = Math.max(0, (listing.availableQuantity || 0) - (item.quantity || 0))
          await listing.save()
        }
      }
    }

    await order.save()

    // Notify the customer in real time
    try {
      const customer = await User.findById(order.customer)
      const io = req.app.get("io")
      if (io && customer && customer.socketId) {
        io.to(customer.socketId).emit("vendorOrderStatus", {
          orderId: order._id,
          status: order.status
        })
      }
    } catch (notifyError) {
      console.error("VENDOR ORDER STATUS NOTIFY ERROR:", notifyError.message)
    }

    return res.status(200).json({ success: true, order })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

const cancelVendorOrderByCustomer = async (req, res) => {
  try {
    const order = await VendorOrder.findOne({ _id: req.params.orderId, customer: req.userId })
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }
    if (["delivered", "cancelled"].includes(order.status)) {
      return res.status(400).json({ success: false, message: `Order is already ${order.status}` })
    }

    order.status = "cancelled"
    order.statusHistory.push({ status: "cancelled" })
    await order.save()

    // Notify the vendor in real time
    try {
      const vendorUser = await User.findById(order.vendorUserId)
      const io = req.app.get("io")
      if (io && vendorUser && vendorUser.socketId) {
        io.to(vendorUser.socketId).emit("vendorOrderStatus", {
          orderId: order._id,
          status: "cancelled"
        })
      }
    } catch (notifyError) {
      console.error("VENDOR ORDER CANCEL NOTIFY ERROR:", notifyError.message)
    }

    return res.status(200).json({ success: true, order })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = {
  registerViaVoice,
  registerViaHelper,
  registerHelper,
  analyseProducePhoto,
  uploadListingPhoto,
  confirmListing,
  parseVoicePrice,
  toggleAvailability,
  getMyDashboard,
  updateListing,
  deleteListing,
  getNearbyVendors,
  getVendorById,
  rateVendor,
  runVoiceCommand,
  getVendorStats,
  placeVendorOrder,
  getMyVendorOrders,
  getVendorIncomingOrders,
  updateVendorOrderStatus,
  cancelVendorOrderByCustomer
}

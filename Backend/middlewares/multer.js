const multer = require("multer")

/* Shared upload guards. Rejecting non-images at the middleware layer keeps junk
   out of Cloudinary and stops an oversized body from ever being parsed. */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

const fileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    const error = new Error("Only image files are allowed (jpeg, png, webp, gif)")
    error.status = 400
    cb(error)
  }
}

const limits = { fileSize: 5 * 1024 * 1024 } // 5MB max

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/")
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname
    cb(null, uniqueName)
  }
})

/* Disk storage — the food-shop / produce upload path, which hands the saved
   path to Cloudinary. Stays the default export so every existing
   `require("../middlewares/multer.js")` call site keeps working unchanged. */
const upload = multer({ storage, fileFilter, limits })

/* Memory storage — used when the bytes themselves are needed (base64 for the
   vision model) instead of a file on disk. */
const memoryUpload = multer({ storage: multer.memoryStorage(), fileFilter, limits })

module.exports = upload
module.exports.memoryUpload = memoryUpload
module.exports.ALLOWED_IMAGE_TYPES = ALLOWED_IMAGE_TYPES
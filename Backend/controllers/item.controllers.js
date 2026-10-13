const Item = require("../models/item.Model.js");
const Shop = require("../models/shop.Model.js");
const { uploadOnCloudinary } = require("../utils/cloudinary.js");
const { clean, cleanNumber } = require("../utils/sanitize");


const addItem = async (req, res) => {
    try {
        const name = clean(req.body.name, 120)
        const category = clean(req.body.category, 60)
        const foodType = clean(req.body.foodType, 20)
        const description = clean(req.body.description, 800)
        const price = cleanNumber(req.body.price)
        let image;
        if (req.file) {
            image = await uploadOnCloudinary(req.file.path)
        }
        const shop = await Shop.findOne({ owner: req.userId })
        if (!shop) {
            return res.status(400).json({ message: "shop not found" })
        }
        const item = await Item.create({
            name, category, foodType, price, description, image, shop: shop._id
        })

        shop.items.push(item._id)
        await shop.save()
        await shop.populate("owner")
        await shop.populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        })
        return res.status(201).json(shop)

    } catch (error) {
        console.error("ADD ITEM ERROR:", error);
        return res.status(500).json({ message: `add item error ${error}` })
    }
}

const editItem = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const name = clean(req.body.name, 120)
        const category = clean(req.body.category, 60)
        const foodType = clean(req.body.foodType, 20)
        const description = clean(req.body.description, 800)
        const price = cleanNumber(req.body.price)
        let image;
        if (req.file) {
            image = await uploadOnCloudinary(req.file.path)
        }
        const item = await Item.findByIdAndUpdate(itemId, {
            name, category, foodType, price, description, image
        }, { new: true })
        if (!item) {
            return res.status(400).json({ message: "item not found" })
        }
        const shop = await Shop.findOne({ owner: req.userId }).populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        })
        return res.status(200).json(shop)

    } catch (error) {
        return res.status(500).json({ message: `edit item error ${error}` })
    }
}

const getItemById = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const item = await Item.findById(itemId)
        if (!item) {
            return res.status(400).json({ message: "item not found" })
        }
        return res.status(200).json(item)
    } catch (error) {
        console.error("GET ITEM ERROR:", error);
        return res.status(500).json({ message: `get item error ${error}` })
    }
}

const deleteItem = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const item = await Item.findByIdAndDelete(itemId)
        if (!item) {
            return res.status(400).json({ message: "item not found" })
        }
        const shop = await Shop.findOne({ owner: req.userId })
        shop.items = shop.items.filter(i => i !== item._id)
        await shop.save()
        await shop.populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        })
        return res.status(200).json(shop)

    } catch (error) {
        return res.status(500).json({ message: `delete item error ${error}` })
    }
}

const getItemByCity = async (req, res) => {
    try {
        const { city } = req.params
        if (!city) {
            return res.status(400).json({ message: "city is required" })
        }
        const shops = await Shop.find({
            city: { $regex: new RegExp(`^${city}$`, "i") }
        }).populate('items')
        if (!shops) {
            return res.status(400).json({ message: "shops not found" })
        }
        const shopIds=shops.map((shop)=>shop._id)

        const items=await Item.find({shop:{$in:shopIds}})
        return res.status(200).json(items)

    } catch (error) {
 return res.status(500).json({ message: `get item by city error ${error}` })
    }
}

const getItemsByShop=async (req,res) => {
    try {
        const {shopId}=req.params
        const shop=await Shop.findById(shopId).populate("items")
        if(!shop){
            return res.status(400).json("shop not found")
        }
        return res.status(200).json({
            shop,items:shop.items
        })
    } catch (error) {
         return res.status(500).json({ message: `get item by shop error ${error}` })
    }
}

const searchItems=async (req,res) => {
    try {
        const {query,city}=req.query
        if(!query || !city){
            return null
        }
        const shops=await Shop.find({
            city:{$regex:new RegExp(`^${city}$`, "i")}
        }).populate('items')
        if(!shops){
            return res.status(400).json({message:"shops not found"})
        }
        const shopIds=shops.map(s=>s._id)
        const items=await Item.find({
            
            shop:{$in:shopIds},
            $or:[
                {name:{$regex:query,$options:"i"}},
                {category:{$regex:query,$options:"i"}}
            ]

        }).populate("shop","name image")

        return res.status(200).json(items)

    } catch (error) {
         return res.status(500).json({ message: `search item  error ${error}` })
    }
}

const rating = async (req, res) => {
    try {
        const { itemId, rating } = req.body

        if (!itemId || rating === undefined || rating === null) {
            return res.status(400).json({ message: "itemId and rating is required" })
        }

        if (rating !== 0 && (rating < 1 || rating > 5)) {
            return res.status(400).json({ message: "rating must be between 0 to 5" })
        }

        const item = await Item.findById(itemId)
        if (!item) {
            return res.status(400).json({ message: "item not found" })
        }

        // If rating is 0, remove the user's rating (undo)
        if (rating === 0) {
            if (item.rating.count > 0) {
                const newCount = item.rating.count - 1
                const newAverage = newCount === 0
                    ? 0
                    : (item.rating.average * item.rating.count - rating) / newCount

                item.rating.count = newCount
                item.rating.average = newAverage
                await item.save()
            }
            return res.status(200).json({ rating: item.rating })
        }

        const newCount = item.rating.count + 1
        const newAverage = (item.rating.average * item.rating.count + rating) / newCount

        item.rating.count = newCount
        item.rating.average = newAverage
        await item.save()

        return res.status(200).json({ rating: item.rating })

    } catch (error) {
        return res.status(500).json({ message: `rating error ${error}` })
    }
}

/* ============================ DISCOUNT SYSTEM ============================ */

/*
 * One place for the maths, so a single-item discount and a shop-wide discount
 * can never disagree. `originalPrice` is the anchor: once set it is never
 * overwritten, which is what stops a second discount from compounding on the
 * already-reduced price.
 */
const discountFields = (item, discountPercent, saleEndsAt) => {
    const originalPrice = item.originalPrice ?? item.price
    const discountedPrice = Math.round(originalPrice * (1 - discountPercent / 100) * 100) / 100
    return {
        originalPrice,
        discountPercent,
        discountedPrice,
        /* `price` is what the customer actually pays, so cart, checkout and
           FoodCard need no discount-aware logic at all. */
        price: discountedPrice,
        isOnSale: discountPercent > 0,
        saleEndsAt: saleEndsAt ? new Date(saleEndsAt) : null
    }
}

const parseDiscountPercent = (raw) => {
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0 || value > 100) return null
    return Math.round(value * 100) / 100
}

/* Confirms the item exists AND belongs to the caller's own shop. */
const findOwnedItem = async (itemId, ownerId) => {
    const item = await Item.findById(itemId)
    if (!item) return { status: 404, message: "item not found" }
    const shop = await Shop.findOne({ owner: ownerId })
    if (!shop || String(item.shop) !== String(shop._id)) {
        return { status: 403, message: "this item does not belong to your shop" }
    }
    return { item }
}

const applyDiscount = async (req, res) => {
    try {
        const discountPercent = parseDiscountPercent(req.body?.discountPercent)
        if (discountPercent === null) {
            return res.status(400).json({ message: "discountPercent must be a number between 0 and 100" })
        }

        const { item, status, message } = await findOwnedItem(req.params.itemId, req.userId)
        if (!item) {
            return res.status(status).json({ message })
        }

        Object.assign(item, discountFields(item, discountPercent, req.body?.saleEndsAt))
        await item.save()
        return res.status(200).json(item)
    } catch (error) {
        console.error("APPLY DISCOUNT ERROR:", error.message)
        return res.status(500).json({ message: "Could not apply the discount" })
    }
}

const removeDiscount = async (req, res) => {
    try {
        const { item, status, message } = await findOwnedItem(req.params.itemId, req.userId)
        if (!item) {
            return res.status(status).json({ message })
        }

        /* Restore the pre-sale price. An item that was never on sale keeps its
           current price rather than being zeroed by a null originalPrice. */
        item.price = item.originalPrice ?? item.price
        item.discountPercent = 0
        item.discountedPrice = null
        item.isOnSale = false
        item.saleEndsAt = null
        item.originalPrice = null
        await item.save()
        return res.status(200).json(item)
    } catch (error) {
        console.error("REMOVE DISCOUNT ERROR:", error.message)
        return res.status(500).json({ message: "Could not remove the discount" })
    }
}

const applyDiscountToAll = async (req, res) => {
    try {
        const discountPercent = parseDiscountPercent(req.body?.discountPercent)
        if (discountPercent === null) {
            return res.status(400).json({ message: "discountPercent must be a number between 0 and 100" })
        }

        const shop = await Shop.findOne({ owner: req.userId })
        if (!shop) {
            return res.status(404).json({ message: "shop not found" })
        }
        /* A shopId is accepted for explicitness, but an owner may only ever
           discount their own shop. */
        if (req.body?.shopId && String(req.body.shopId) !== String(shop._id)) {
            return res.status(403).json({ message: "this shop does not belong to you" })
        }

        const items = await Item.find({ shop: shop._id })
        if (items.length === 0) {
            return res.status(200).json({ updated: 0 })
        }

        const saleEndsAt = req.body?.saleEndsAt || null
        const result = await Item.bulkWrite(items.map(item => ({
            updateOne: {
                filter: { _id: item._id },
                update: { $set: discountFields(item, discountPercent, saleEndsAt) }
            }
        })))

        return res.status(200).json({ updated: result.modifiedCount ?? items.length })
    } catch (error) {
        console.error("APPLY DISCOUNT TO ALL ERROR:", error.message)
        return res.status(500).json({ message: "Could not apply the discount to your menu" })
    }
}

module.exports = {
    addItem,
    editItem,
    getItemById,
    deleteItem,
    getItemByCity,
    getItemsByShop,
    searchItems,
    rating,
    applyDiscount,
    removeDiscount,
    applyDiscountToAll
}
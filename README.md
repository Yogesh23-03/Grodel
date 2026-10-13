# GroDel — Food Delivery, Local Produce & Community Food Platform

GroDel is a full-stack platform that connects neighbourhood restaurants, street vendors and farmers with the people around them. Beyond ordinary food ordering it handles group ordering with split payment, surplus-food donation to trusts, a farmer-to-buyer direct market, and an AI layer that writes menus, explains nutrition, plans recipes and analyses a business. Real-time Socket.IO tracking and AI-assisted ordering keep the whole experience working for users who would rather speak than type.

## What is GroDel

GroDel is a food platform built around a neighbourhood rather than a warehouse. A customer opens it, gets their city, and finds three different kinds of supply in one place: restaurants that cook to order, local farmers and vendors selling today's harvest, and a donation table where surplus food is matched with a trust that can use it. Ordering, group ordering, bulk catering and donating are all first-class journeys, not add-ons bolted onto a cart.

Every role gets a tool that respects how they actually work. A restaurant owner writes a menu and lets AI draft the copy, then watches orders land on a live dock. A farmer photographs produce once and AI turns it into a listing with a suggested price, then updates that price by voice. A delivery partner receives assignments, shares live GPS and closes each drop with an OTP. A trust receives donations and follows them to the door. An admin keeps the whole thing honest from a nine-section control room.

Under the surface it is a MERN application: React 19 and Vite on the front, Express 5 and MongoDB behind it, Socket.IO carrying order and location events in real time, and Groq powering the AI features (menu copy, produce recognition, nutrition, recipes, business analysis, chatbot). Authentication is a JWT in an httpOnly cookie, with Firebase Google sign-in as an alternative. The UI is one dark, token-driven theme shared by every page, with CSS-only motion and no animation libraries.

> Everything listed below is implemented in this repository. Features are grouped by the role that uses them.

---

## Features

| Feature | Users | Description |
|---------|-------|-------------|
| Restaurant ordering | Customer | Browse shops by city, search dishes, cart and checkout |
| Online payment | Customer | Razorpay checkout with server-side signature verification |
| Group ordering | Customer | Shareable link, participants add items, vote on options, split payment, in-order chat |
| Recurring meal schedule | Customer | Save a meal slot once; the server places it automatically each day |
| Food donation | Customer, Owner, Supplier | Post surplus food, match it to a trust, hand it to a delivery partner |
| Restaurant management | Owner | Create/edit a shop, manage the menu, live order dock |
| AI menu description writer | Owner | Generate menu copy from a few fields, optionally from a dish photo |
| Bulk / catering orders | Owner, Customer | Quantity-based request off the existing menu, accept or reject, owner emailed |
| Discount system | Owner | Per-item or shop-wide percentage discounts, prices update everywhere automatically |
| AI business analysis | Owner, Vendor, Delivery | 30-day metrics interpreted into strengths, risks and a prioritised action list |
| Order-wait games | Customer | Trivia, food Wordle, spin wheel, guess-the-dish, recipe challenge while an order is in progress |
| GroDel coins, streaks & badges | Customer | Earn coins in the games, redeem for discounts, daily streak and badge tiers |
| Nutrition info | Customer | Per-dish nutrition and health guidance (AI, cached) |
| Recipe instructions | Customer | How to cook a dish (AI, cached) |
| AI food chatbot | Customer | Conversational food assistant with optional voice input |
| Voice & photo vendor onboarding | Vendor, Helper | Register a street vendor by voice or by photo; helper-assisted registration |
| Vendor marketplace | Vendor, Farmer | List produce by photo/voice/WhatsApp, manage availability and pricing |
| Farmer direct market | Farmer, Buyer | Farmer profiles, produce listings with grades, negotiation threads, offers, cooperative orders |
| Market price board | Farmer, Buyer, Admin | Price bands by crop and district, price reporting and alerts |
| WhatsApp vendor bot | Vendor | Manage a shop over WhatsApp (Twilio) |
| AI produce photo analysis | Vendor | Identify produce from a photo (Groq vision) |
| Live delivery tracking | Customer, Owner, Delivery | Socket.IO location updates, delivery OTP handoff |
| Delivery partner dashboard | Delivery | Broadcast assignments, accept jobs, today's deliveries, history |
| Trust / NGO management | Trust member, Admin | Manage trusts, receive and track donations |
| Admin console | Admin | Donation oversight, market-price admin, fraud signals |
| Admin dashboard | Admin | Nine sections in one control room: live stats, activity chart, users, orders, donations, shops, vendors, admin seats, fraud signals and settings |
| Capped admin seats | Admin | `MAX_ADMINS` (default 5); the first admin ever created becomes the founder, and the limit is tunable from the dashboard |
| Ban / unban & role changes | Admin | Founder-only powers; a ban takes effect on the next request, not when the cookie expires |
| Public landing page | Everyone | Dark glass marketing page shown to visitors who are not signed in, with a live admin-seat badge |
| Voice search | Everyone | Browser Web Speech API, language-aware, no external service |
| Unified dark theme | Everyone | One token-driven theme across every page with a light/dark switch; all motion is CSS-only |
| Trending feed | Customer | Most-ordered items in the last hour, top-rated restaurant, orders today |
| YouTube food shorts | Customer | Keyless short-video panel on the wait screen |
| Multi-language UI | Everyone | i18next with 15 languages listed; 5 have hand-written translations and the rest fall back to English |
| Real-time notifications | Everyone | Socket.IO events for new orders, status changes, delivery locations |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, React Router 7, Redux Toolkit + React-Redux |
| Styling | Tailwind CSS 4, React Icons, CSS custom-property design tokens |
| i18n | i18next / react-i18next (+ optional Google Translate) |
| Backend | Node.js (>= 20), Express 5 |
| Database | MongoDB + Mongoose 9 |
| Real-time | Socket.IO 4 |
| Auth | JWT in httpOnly cookies (`secure`/`sameSite` driven by `NODE_ENV`) + Firebase Google sign-in |
| AI | Groq API — text `openai/gpt-oss-20b`, vision `qwen/qwen3.8-27b` (both overridable via env) |
| Payments | Razorpay |
| Images | Cloudinary |
| Email | Nodemailer over Gmail SMTP |
| WhatsApp | Twilio |
| Maps / geocoding | Geoapify |
| Security | Helmet, express-rate-limit, CORS allow-list, Multer type/size validation |
| Deployment | Backend → Render, Frontend → Vercel |

### AI models

All AI calls go through `Backend/utils/groq.js` (`groqChat`, `groqVision`, `parseGroqJson`). The defaults are read from env, so a model can be swapped without touching code:

- `GROQ_MODEL` — default `openai/gpt-oss-20b`
- `GROQ_VISION_MODEL` — default `qwen/qwen3.8-27b`

---

## Architecture

```
                    ┌──────────────────────────────────────────┐
                    │  Frontend — Vercel                       │
                    │  React 19 + Vite + Redux Toolkit         │
                    │  Tailwind 4 · react-icons · i18next      │
                    └───────────────┬──────────────────────────┘
                                    │  HTTPS  (axios, withCredentials)
                                    │  WebSocket (Socket.IO)
                                    ▼
                    ┌──────────────────────────────────────────┐
                    │  Backend — Render                        │
                    │  Express 5                               │
                    │  helmet → cors → json → cookieParser     │
                    │  rate limit → routes → error handler     │
                    │                                          │
                    │  controllers/  ↔  routes/  ↔  models/    │
                    └───┬───────────┬───────────┬──────────────┘
                        │           │           │
             ┌──────────▼──┐  ┌─────▼──────┐  ┌─▼──────────────┐
             │ MongoDB     │  │ Groq API   │  │ Cloudinary     │
             │ Atlas       │  │ text+vision│  │ images         │
             └─────────────┘  └────────────┘  └────────────────┘
                        │
       ┌────────────────┼─────────────────┬──────────────┬────────────┐
       ▼                ▼                 ▼              ▼            ▼
   Razorpay        Nodemailer         Twilio        Geoapify     Firebase
   payments        (Gmail SMTP)       WhatsApp      geocoding    Google sign-in
```

---

## Roles

| Role | What they can do |
|------|------------------|
| `user` (Customer) | Order food, pay online, group orders, meal schedules, donate surplus food, play the wait games and earn coins |
| `owner` (Restaurant) | Create/edit a shop, manage the menu, write descriptions with AI, run discounts, handle bulk requests, view AI analysis |
| `vendor` (Farmer / Street vendor) | List produce by photo or voice, manage availability and pricing, receive vendor orders, WhatsApp bot, AI analysis |
| `deliveryBoy` | Receive broadcast assignments, accept deliveries, OTP handoff, live location sharing, AI analysis |
| `supplier` | Included in the donation flows as a food source |
| `trustMember` (NGO) | Manage trust details, receive and acknowledge matched donations |
| `admin` | Donation oversight, market-price administration, fraud signals |
| `helper` | Register street vendors on their behalf through a guided flow |

Custom buyer profiles (`consumer`, `retailer`, `hotel`, `canteen`, `exporter`) extend a customer account for the farmer direct market.

---

## Admin system

### Admin seats

- A maximum of **5** admins by default, configurable through `MAX_ADMINS`.
- The **first** admin ever created is the founder: it is the only account with `isFirstAdmin`, and it can never be demoted or banned.
- Only the founder can change roles, ban or unban users, and manage the seat limit.
- The seat count is enforced in two places. The signup route (and Google sign-in) refuses an `admin` signup once the seats are full, and the public `GET /api/admin/slots-public` endpoint tells the landing page and the signup screen to hide the Admin option entirely. Showing a doomed option is worse than not showing it.
- The founder can raise or lower the limit from **Admin → Admins** or **Admin → Settings**; the value is persisted in the `Settings` collection so it survives a redeploy.

### Bans

A banned account is refused on its very next request: `isAuth` re-reads the account on every request and answers `403 Account suspended`, so a ban does not wait for the 7-day cookie to expire. Admins cannot be banned.

### Admin dashboard (`/admin`)

Nine sections behind `isAuth + requireRole("admin")`, with the destructive controls hidden from non-founders:

| Section | What it does |
|---------|--------------|
| Overview | Eight live stat tiles, a CSS-only 30-day revenue chart, users by role, donations by status |
| Users | Role filter, debounced search, pagination; role change and ban/unban for the founder |
| Orders | Status filter and pagination, customer populated |
| Donations | Donor, food items, assigned trust and status (read-only — assignment lives on the Trusts page) |
| Shops | Shop, owner, city, item count, rating |
| Vendors | Verify or suspend a vendor, with listing counts and rating |
| Admins | Seat usage with a progress bar, the admin list, and the seat limit control |
| Fraud signals | Order bursts, oversized group orders, vendors with many listings and no sales |
| Settings | Platform name, maintenance-mode flag, admin limit |

---

## Setup & run locally

### Prerequisites

- Node.js >= 20
- A MongoDB database (local or Atlas)
- A Groq API key (all AI features)
- Optional: Cloudinary, Razorpay, Gmail, Twilio, Geoapify, Firebase for those specific flows

### 1. Backend

```bash
cd Backend
npm install
cp .env.example .env      # then fill in the values
npm run dev               # nodemon on http://localhost:8000
```

### 2. Frontend

```bash
cd Frontend/vite-project
npm install
npm run dev               # Vite on http://localhost:5173
```

The frontend defaults to `http://localhost:8000`, so no frontend env is required for local development.

### 3. Verify

```bash
cd Backend            && npm start          # boots on PORT (default 8000)
cd Frontend/vite-project && npm run build   # production bundle into dist/
```

---

## Deployment

### Backend → Render

1. Push the repository to GitHub.
2. In Render, create a **New Web Service** and connect the repository.
3. Set **Root Directory** to `Backend`.
4. Set **Build Command** to `npm install`.
5. Set **Start Command** to `npm start`.
6. Add every variable from [Backend/.env.example](Backend/.env.example) in the Render dashboard.
7. Set `NODE_ENV=production` and `FRONTEND_URL` to the exact Vercel origin (no trailing slash).
8. `Backend/render.yaml` is a blueprint you can apply instead of steps 3–7.

### Frontend → Vercel

1. In Vercel, import the same repository.
2. Set **Root Directory** to `Frontend/vite-project`.
3. Framework preset **Vite**; build command `npm run build`; output directory `dist`.
4. Add environment variables:
   - `VITE_SERVER_URL=https://your-render-backend-url.onrender.com`
   - `VITE_RAZORPAY_KEY_ID=rzp_test_...` (public key only)
5. Deploy. `Frontend/vite-project/vercel.json` supplies the SPA rewrite and security headers.

> `Frontend/vite-project/.env.production` exists as a local reminder of the production keys, but it is git-ignored and **Vercel's environment variables take precedence over it**.

### After deploying both

1. Copy the Vercel URL and paste it as `FRONTEND_URL` in the Render environment variables — the backend restarts automatically.
2. In MongoDB Atlas → **Network Access**, allow `0.0.0.0/0` (Render has no static egress IP on the free plan).
3. Visit the Vercel URL. A signed-out visitor should see the landing page, not a blank screen.
4. Sign up as the **first** user with role `admin`. That account becomes the founder (`isFirstAdmin`) and can manage roles, bans and seats. If you are past that point and no admin exists, create one directly in MongoDB, or sign up while seats are free.
5. Open `/admin` and confirm the overview numbers load before handing the deployment to anyone.

### Common errors

| Error | Fix |
|-------|-----|
| CORS blocked | `FRONTEND_URL` must match the Vercel origin exactly, with **no trailing slash** |
| Cookie not sent after login | `NODE_ENV=production` on Render, and the frontend and backend must both be HTTPS |
| White screen on refresh | The SPA rewrite in `Frontend/vite-project/vercel.json` is missing |
| Backend times out on start | Add `0.0.0.0/0` in Atlas → Network Access |
| "Admin seats are full" at signup | Every admin seat is taken — raise `MAX_ADMINS` or widen the limit from the dashboard as the founder |
| Admin option missing on signup | Expected while the seat count is unknown, or when the seats really are full |
| Landing page seems stale | The admin-seat badge is fetched from `/api/admin/slots-public`; check the backend is reachable from the browser |

See [DEPLOYMENT.md](DEPLOYMENT.md) for the pre-flight checklist and the fixes for the errors that actually come up.

---

## Environment Variables

### Backend (`Backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | no | HTTP port (default `8000`; falls back to `5000` if unset) |
| `NODE_ENV` | prod | `production` turns on secure cookies (`sameSite=none`, `secure=true`) |
| `MONGODB_URL` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Signing secret for the auth cookie |
| `MAX_ADMINS` | no | Hard ceiling on accounts with role `admin` (default `5`). The founder can lower it further from the dashboard, where it is stored in the `Settings` collection |
| `GROQ_API_KEY` | yes | Groq key for every AI feature |
| `GROQ_MODEL` | no | Text model override (default `openai/gpt-oss-20b`) |
| `GROQ_VISION_MODEL` | no | Vision model override (default `qwen/qwen3.8-27b`) |
| `CLOUD_NAME` | no | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | no | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | no | Cloudinary API secret |
| `RAZORPAY_KEY_ID` | no | Razorpay key id |
| `RAZORPAY_KEY_SECRET` | no | Razorpay key secret (used for HMAC verification) |
| `EMAIL` | no | Gmail address used as the mail sender |
| `PASS` | no | Gmail app password |
| `GOOGLE_TRANSLATE_API_KEY` | no | Enables the Google Cloud Translate path |
| `TWILIO_ACCOUNT_SID` | no | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | no | Twilio auth token |
| `TWILIO_WHATSAPP_NUMBER` | no | Twilio WhatsApp sender |
| `WHATSAPP_WEBHOOK_SECRET` | no | Shared secret for the WhatsApp webhook |
| `FRONTEND_URL` | prod | Deployed frontend origin, added to the CORS allow-list |
| `CLIENT_URL` | no | Extra allowed origin |
| `BULK_ORDER_MINIMUM` | no | Bulk-order minimum total (default `500`) |
| `RATE_LIMIT_MAX` | no | Requests per 15 min per IP (default `1000`) |
| `AUTH_RATE_LIMIT_MAX` | no | Auth attempts per hour per IP (default `10`) |

### Frontend (`Frontend/vite-project/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_SERVER_URL` | Backend origin (falls back to `VITE_API_URL`, then `http://localhost:8000`) |
| `VITE_RAZORPAY_KEY_ID` | Razorpay **public** key |
| `VITE_GEOAPIKEY` | Geoapify key for reverse geocoding |
| `VITE_FIREBASE_*` | Firebase web config for Google sign-in |

Never place a secret key (`RAZORPAY_KEY_SECRET`, `GROQ_API_KEY`, `CLOUDINARY_API_SECRET`) in a `VITE_` variable — those are inlined into the browser bundle.

---

## Security

- **JWT in httpOnly cookies.** Tokens are never readable from JavaScript and are sent automatically with `withCredentials`.
- **Cookie flags follow the environment** — `secure` + `sameSite=none` in production, `strict` locally. Never hard-coded.
- **401 for authentication failures**, including expired and malformed tokens.
- **Helmet** security headers, with cross-origin resource policy relaxed only enough to serve `/public` images to the frontend.
- **Rate limiting** — 1000 requests / 15 min per IP across `/api` (CORS preflights excluded), and 10 attempts / hour on sign-in and sign-up.
- **Role guards.** `isAuth` proves identity; `requireRole(...)` reads the role from the database so a demoted user loses access immediately.
- **CORS allow-list.** Only explicit origins are accepted; browser origins must match, server-to-server calls are permitted.
- **Input sanitisation.** Shared `clean` / `cleanList` / `cleanNumber` helpers trim, bound and type-coerce user text before it reaches MongoDB.
- **Upload validation.** Multer accepts only `image/jpeg|png|webp|gif` up to 5 MB, and oversized uploads answer `413`.
- **Server-side re-pricing.** Bulk orders recompute every line from the database, so a tampered request cannot set its own prices.
- **Payment verification.** Razorpay signatures are verified server-side before an order is marked paid.
- **Model integrity.** The Wordle answer is verified server-side and never sent to the browser.
- **A single global error handler** answers at the edge of the app, so a CORS rejection is a `403` and an oversized file a `413`, instead of a blanket `500`.

---

## API Reference

All routes are prefixed with `/api`. `🔒` marks a route that requires a valid session cookie; role-restricted routes name the required role.

### Admin — `/api/admin`

Every route needs `isAuth` + `requireRole("admin")` **except** the first one. Routes marked *founder* additionally require `isFirstAdmin`, the first admin account ever created.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/admin/slots-public` | **Public, no auth.** Returns `{ current, max, full }` so the landing page and signup can offer or hide the Admin role |
| GET | `/api/admin/stats` | Users by role, orders, today's orders, total revenue, group orders, donations by status, vendors, listings, shops, items |
| GET | `/api/admin/activity` | Last 30 days of orders and revenue, gap-filled per day |
| GET | `/api/admin/users` | `?role=&page=&limit=&search=` — search matches name or email |
| PATCH | `/api/admin/users/:userId/role` | *founder*. Refuses to demote the founder, refuses to exceed the seat limit |
| PATCH | `/api/admin/users/:userId/ban` · `/unban` | *founder*. Admins cannot be banned |
| GET | `/api/admin/orders` | `?status=&page=&limit=`, customer populated |
| GET | `/api/admin/donations` | Donor, assigned trust and delivery partner populated |
| GET | `/api/admin/shops` | Shops with owner and item counts |
| GET | `/api/admin/vendors` | Vendor profiles with user and listing counts |
| PATCH | `/api/admin/vendors/:vendorId/verify` · `/suspend` | Verify, or suspend (clears `isActive` and `isVerified`) |
| GET | `/api/admin/admins` | Admin list plus current seat usage |
| PATCH | `/api/admin/slots` | *founder*. `{ maxAdmins }` between 1 and 5; cannot go below the current admin count |
| GET | `/api/admin/fraud` | Order bursts, oversized group orders, vendors with listings but no sales |
| GET · PATCH | `/api/admin/settings` | *founder*. `platformName` and `maintenanceMode` |

---

### Auth — `/api/auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | Create an account |
| POST | `/signin` | Sign in, sets the httpOnly cookie |
| GET | `/signout` | Clear the session cookie |
| POST | `/googleauth` | Firebase Google sign-in |
| POST | `/sendotp` | Email a password-reset OTP |
| POST | `/verifyotp` | Verify the OTP |
| POST | `/resetpassword` | Set a new password |

### Users — `/api/user`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/current` 🔒 | Current session user |
| GET | `/all` 🔒 | List users |
| POST | `/update-location` 🔒 | Update live coordinates |

### Shops — `/api/shop`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/create-edit` 🔒 | Create or update the caller's shop |
| GET | `/getmy` 🔒 | The caller's shop with its menu |
| GET | `/getbycity/:city` | Shops in a city |
| GET | `/all` | Every shop |

### Items, discounts & AI menu — `/api/item`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/additem` 🔒 | Add a menu item (optional image) |
| POST | `/edititem/:itemId` 🔒 | Edit a menu item |
| GET | `/getbyid/:itemId` 🔒 | One item |
| GET | `/delete/:itemId` 🔒 | Delete an item |
| GET | `/getbycity/:city` 🔒 | Items in a city |
| GET | `/getbyshop/:shopId` 🔒 | A shop and its items |
| GET | `/searchitems` 🔒 | Search items by name/category |
| POST | `/rating` 🔒 | Rate an item (0 removes the rating) |
| POST | `/ai-description` 🔒 owner | Generate menu copy, optionally from a photo |
| PATCH | `/discount-all` 🔒 owner | Apply one percentage to the whole menu |
| PATCH | `/:itemId/discount` 🔒 owner | Discount a single item |
| PATCH | `/:itemId/remove-discount` 🔒 owner | Restore the original price |

### Orders — `/api/order`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/place-order` 🔒 | Place an order (splits it per shop) |
| POST | `/verify-payment` 🔒 | Verify a Razorpay payment |
| GET | `/my-orders` 🔒 | Orders for the caller's role |
| GET | `/get-assignments` 🔒 | Broadcast delivery assignments |
| GET | `/get-current-order` 🔒 | Active order with live locations |
| GET | `/get-cancelled-delivery-orders` 🔒 | Cancelled deliveries |
| POST | `/send-delivery-otp` 🔒 | Send the handover OTP |
| POST | `/verify-delivery-otp` 🔒 | Verify the handover OTP |
| POST | `/update-status/:orderId/:shopId` 🔒 | Advance a shop-order status |
| GET | `/accept-order/:assignmentId` 🔒 | Accept a delivery job |
| GET | `/get-order-by-id/:orderId` 🔒 | One order |
| GET | `/get-today-deliveries` 🔒 | Today's deliveries for a partner |
| GET | `/cancel-assignment/:assignmentId` 🔒 | Release an assignment |
| POST | `/cancel-order/:orderId/:shopOrderId` 🔒 | Cancel a shop-order |
| POST | `/cancel-delivery/:assignmentId` 🔒 | Cancel a delivery |

### Bulk orders — `/api/bulk-orders`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` 🔒 | Place a bulk request (re-priced server-side, owner emailed) |
| GET | `/my` 🔒 | Owner: requests to my shops. Others: requests I placed |
| PATCH | `/:bulkOrderId` 🔒 owner | Accept, reject or advance a request |

### AI business analysis — `/api/analysis`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/owner` 🔒 owner | 30-day restaurant analysis |
| GET | `/vendor` 🔒 vendor | 30-day vendor/farmer analysis |
| GET | `/delivery` 🔒 deliveryBoy | 30-day delivery analysis |

### Order-wait engagement — `/api/engagement`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/coins` 🔒 | Coins, streak and badges |
| POST | `/coins/redeem` 🔒 | Convert coins into a discount |
| GET | `/leaderboard` | Top players by coins, streak or trivia |
| POST | `/trivia/generate` | Generate a trivia question |
| POST | `/trivia/record` 🔒 | Record a trivia answer and award coins |
| GET | `/word/daily` | Today's Wordle hint and length (never the word) |
| POST | `/word/verify` | Grade a guess server-side |
| POST | `/word/record` 🔒 | Record a Wordle win |
| POST | `/spin` 🔒 | Spin once per order |
| GET | `/dish/generate` | Clues for guess-the-dish |
| POST | `/dish/verify` | Grade a dish guess |
| POST | `/dish/record` 🔒 | Record a dish win |
| GET | `/recipe/generate` | Ingredients for the recipe challenge |
| POST | `/recipe/verify` | Check whether a dish uses the ingredients |
| POST | `/recipe/record` 🔒 | Record a recipe-challenge win |
| POST | `/fact` | A fact about the ordered dish |
| GET | `/trending` | Trending items, top restaurant and today's order count |

### Donations & trusts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/donations` 🔒 | Post a surplus-food donation |
| GET | `/donations/my` 🔒 | Donations visible to the caller |
| GET | `/donations` 🔒 | All donations (admin) |
| PATCH | `/donations/:id/status` 🔒 | Advance a donation |
| PATCH | `/donations/:id/cancel` 🔒 | Cancel a donation |
| PATCH | `/donations/:id/assign-trust` 🔒 | Match a trust |
| PATCH | `/donations/:id/assign-delivery` 🔒 | Assign a delivery partner |
| GET | `/donation-deliveries/available` 🔒 | Open donation pickups |
| GET | `/donation-deliveries/current` 🔒 | The caller's active pickup |
| PATCH | `/donations/:id/accept-delivery` 🔒 | Accept a pickup |
| GET | `/delivery-boys` 🔒 | Delivery partners (admin) |
| GET | `/trusts` | List trusts |
| GET | `/trusts/location` | Trusts near a point |
| GET | `/trusts/:id` | One trust |
| POST | `/trusts` 🔒 | Create a trust |
| PATCH | `/trusts/:id` 🔒 | Update a trust |
| DELETE | `/trusts/:id` 🔒 | Delete a trust |

### Group orders — `/api/group-orders`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` 🔒 | Start a group order |
| GET | `/my` 🔒 | The caller's group orders |
| POST | `/reorder/:groupOrderId` 🔒 | Repeat a past group order |
| GET | `/link/:shareableLink` | Open a shared group order |
| POST | `/link/:shareableLink/join` | Join as a participant |
| PATCH | `/link/:shareableLink/items` | Add or change items |
| POST | `/link/:shareableLink/lock` | Lock the cart |
| POST | `/link/:shareableLink/pay` | Pay a participant share |
| POST | `/link/:shareableLink/verify-payment` | Verify a share payment |
| DELETE | `/link/:shareableLink/participant` | Leave the group order |
| POST | `/link/:shareableLink/nudge` | Nudge one participant |
| POST | `/link/:shareableLink/nudge-all` | Nudge everyone |
| POST | `/link/:shareableLink/vote-options` | Propose vote options |
| POST | `/link/:shareableLink/vote` | Cast a vote |
| POST | `/link/:shareableLink/close-vote` | Close the vote |
| POST | `/link/:shareableLink/apply-coupon` | Apply a coupon |
| POST | `/link/:shareableLink/chat` | Group-order chat message |
| GET | `/menu/:shopId` | Menu for a group order |

### Vendors & produce — `/api/vendor`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register/voice` | Register a vendor by voice |
| POST | `/register/helper` | Helper-assisted registration |
| POST | `/register-helper` | Register a helper's vendor |
| GET | `/whatsapp-info` | WhatsApp bot instructions |
| GET | `/stats` | Vendor stats |
| POST | `/orders` | Place a vendor order |
| GET | `/orders/mine` | Orders placed by the caller |
| GET | `/orders/incoming` | Orders for the vendor |
| PATCH | `/orders/:orderId/status` | Advance a vendor order |
| POST | `/orders/:orderId/cancel` | Cancel a vendor order |
| POST | `/analyse-photo` | Identify produce from a photo |
| POST | `/upload-photo` | Upload a listing photo |
| POST | `/confirm-listing` | Save a listing |
| POST | `/parse-voice-price` | Parse a spoken price |
| PATCH | `/toggle` | Open/close the shop for today |
| GET | `/dashboard` | Vendor dashboard |
| PUT | `/listing/:listingId` | Update a listing |
| DELETE | `/listing/:listingId` | Remove a listing |
| GET | `/nearby` | Vendors near a point |
| GET | `/:vendorId` | One vendor |
| POST | `/:vendorId/rate` | Rate a vendor |
| POST | `/whatsapp-webhook` | Twilio WhatsApp webhook |

### Farmer direct market — `/api/dm`

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/farmer/profile` 🔒 | Save a farmer profile |
| GET/PUT | `/buyer/profile` 🔒 | Read/save a buyer profile |
| GET | `/buyer/matches` 🔒 | Matched listings for a buyer |
| GET | `/buyer/purchases` 🔒 | A buyer's purchases |
| POST | `/threads` 🔒 | Open a negotiation thread |
| GET | `/threads` 🔒 | The caller's threads |
| GET | `/threads/:threadId` 🔒 | One thread |
| POST | `/threads/:threadId/messages` 🔒 | Send a message |
| POST | `/threads/:threadId/offers` 🔒 | Make an offer |
| PATCH | `/threads/:threadId/offers/respond` 🔒 | Accept or decline an offer |
| POST | `/threads/:threadId/convert` 🔒 | Convert a thread into an order |
| GET | `/farmer/orders` 🔒 | A farmer's orders |
| GET | `/farmer/earnings` 🔒 | A farmer's earnings |
| POST | `/orders/:orderId/rate-buyer` 🔒 | Rate a buyer |
| POST | `/coop/propose` 🔒 | Propose a cooperative order |
| PATCH | `/coop/:coopId/shares/:shareIndex/respond` 🔒 | Respond to a coop share |
| GET | `/prices/band` 🔒 | Price band for a crop/district |
| POST | `/prices/report` 🔒 | Report a market price |
| POST | `/prices/admin` 🔒 admin | Publish an official price |
| POST | `/prices/alerts` 🔒 | Create a price alert |
| PATCH | `/prices/alerts/:alertId` 🔒 | Update a price alert |
| GET | `/notifications` 🔒 | Market notifications |
| PATCH | `/notifications/read` 🔒 | Mark notifications read |
| GET | `/admin/fraud-signals` 🔒 admin | Fraud signals |

### Meal schedules & AI content

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/meal-schedule` 🔒 | The caller's meal slots |
| PUT | `/meal-schedule/slot` 🔒 | Save a meal slot |
| DELETE | `/meal-schedule/slot/:mealType` 🔒 | Remove a meal slot |
| PUT | `/meal-schedule/slot/:mealType/selection` 🔒 | Choose default items |
| GET | `/nutrition` | Nutrition for a dish (AI, cached) |
| GET | `/recipe` | Recipe for a dish (AI, cached) |
| POST | `/chatbot` | Food chatbot reply |
| POST | `/translate/batch` | Translate a batch of strings |

---

## Project layout

```
Backend/
  config/db.js                 MongoDB connection
  controllers/                 one file per domain
  middlewares/                 isAuth, requireRole, multer
  models/                      Mongoose schemas
  routes/                      Express routers, mounted in index.js
  utils/                       groq (all AI), mail, cloudinary, socket, token, sanitize
  index.js                     app, CORS, security, Socket.IO, route mounting

Frontend/vite-project/
  src/components/              shared UI (owner, vendor, delivery, engagement games)
  src/pages/                   one file per route
  src/hooks/                   data hooks (current user, city, orders)
  src/i18n/                    locales.js (source of truth) + en.json
  src/redux/                   userSlice, ownerSlice
  src/App.jsx                  routes, RoleGuard, serverUrl
```

## Contributing

Fork the repository, create a feature branch and open a pull request. Please keep new UI text behind `t()` with an English default, route every AI call through `Backend/utils/groq.js`, and register new routes in `Backend/index.js` and new pages in `Frontend/vite-project/src/App.jsx`.

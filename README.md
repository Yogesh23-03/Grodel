# GroDel — Food Delivery, Local Produce & Food Rescue

GroDel is a full-stack platform for ordering restaurant food, coordinating split-payment group orders, donating surplus food to trusts/NGOs, and helping local farmers and street vendors sell produce. It has a React/Vite web client and an Express/MongoDB API, wrapped in a custom **"Market Modern"** design language (dark forest-ink room by default, market-day light theme, lime/jade/terracotta/sage/violet accents).

## Features

| Feature | What happens end to end |
| --- | --- |
| Restaurant ordering | A customer's city is detected, local shops/items are loaded, items are added to the Redux cart, and checkout creates restaurant-specific shop orders. Orders support cash on delivery and Razorpay online payment. |
| Restaurant operations | Owners get a bento dashboard (today's revenue, pending prep, on-the-road orders, top items), live `newOrder` socket events with a pulse banner, and tactile status progression buttons (`pending → preparing → out of delivery → delivered`) per shop order. Shop and menu CRUD live at `/create-edit-shop`, `/add-item`, `/edit-item/:itemId`. |
| Delivery partner work | Partners see an **available rail** split into *order runs* and *rescue runs (donations)* with one-tap Accept, an active-run card with live map + email-OTP handoff, a GPS sharing toggle that streams location over Socket.IO, earnings bento (₹50/run) with an hourly Recharts bar, and a returned-orders tray. |
| Live order tracking | `/track-order/:orderId` is a first-class live story: status narrative copy, ticking timeline, rider card with call link, animated route ribbon on a Leaflet map, and a live rider marker fed by the `updateDeliveryLocation` socket event. |
| Group ordering | A user creates an expiring share link; signed-in users or guests join, select their own items, pay their own shares, vote on restaurants, chat, apply coupons, schedule, and reorder. The final group becomes a normal order. |
| Food donation | Eligible users submit surplus food through a 3-step calm flow (food → where → pickup) with an impact counter. Trust/admin assign trusts and delivery partners from a donation-management console; donations advance `pending → accepted → picked_up → delivered` (or cancelled) with delivery-charge payment metadata (GPay/online/offline). Delivery partners pick rescue runs straight from their dashboard. |
| Trust network | `/trusts` lists the rescue network as cards (photo, capacity, accepted food types, location). Owners, trust members, and admins can register or edit trusts, including GPS pin-capture and bank/GPay details for delivery-charge payouts. |
| Vendor marketplace | Vendors register normally, by voice, or through a helper. They can upload a produce photo for Gemini-assisted identification, dictate a price, confirm the listing, toggle availability, and manage stock. |
| Produce ordering | Customers discover nearby vendors, browse their storefronts with a basket, and place produce orders with COD or online payment. Vendors confirm/track them live; completing an order updates vendor stats and stock. Customers rate vendors per order. |
| Scheduled meal ordering | Customers set breakfast, lunch, snacks or dinner cutoffs and usual items; at cutoff, the saved selection or default is auto-ordered once using COD and the shop owner is notified live. |
| Languages & accessibility | i18next translations with inline fallbacks, Google Translate integration for 15 languages, browser speech recognition for vendor entry, and text-to-speech instructions. Every animation respects `prefers-reduced-motion`. |
| Dark / light theming | Dark "market room" is the signature; light "market day" is a first-class theme. The toggle persists per browser and every surface follows CSS tokens. |

---

## UI design system — "Market Modern"

The UI is built entirely from CSS custom properties (design tokens) defined twice in [`src/index.css`](Frontend/vite-project/src/index.css): `:root` (dark room) and `html[data-theme='light']` (market day). Pages never hard-code palette values that can't follow the theme — legacy Tailwind utilities are remapped by attribute-selector rules at the end of the stylesheet.

### Palette

| Token | Dark room | Market day | Used for |
| --- | --- | --- | --- |
| `--bg` | `#0c110e` | `#f4f0e4` | Page background (+ soft lime/terracotta radial glows) |
| `--surface-1/2/3` | `#151d16` → `#242f25` | `#fdfbf3` → `#efe9d7` | Cards, inputs, wells |
| `--ink`, `--ink-soft/muted/faint` | cream `#f0ebdd` family | ink `#232820` family | Text hierarchy |
| `--accent` | electric lime `#cdf060` | market moss `#34572c` | Primary actions (`--accent-ink` is the AA text on it) |
| `--accent-2` | jade `#5eead4` | teal `#0f766e` | **Eat** mode |
| `--vendor` | terracotta `#e8956d` | `#b4552f` | **Market** mode (produce, vendors) |
| `--rescue` | sage `#8fd6a4` | `#2f7d4f` | **Rescue** mode (donations, trusts) |
| `--plan` | violet `#b7a6f2` | `#6d5bd0` | **Plan** mode (meal scheduling) |
| `--danger / --warning / --success` | coral / amber / sage | rust / ochre / green | Status |

Each accent ships a `*-soft` translucent companion for chips, washes and focus rings.

### Typography & texture

- **Fraunces** (variable serif) for display via `.t-display`, `.t-title`, `.section-heading`; **Sora** for body text. Numbers/prices use the display font for a ledger feel.
- `.grain` overlays a subtle SVG paper-noise texture on cards and hero panels; `.gradient-text` blends the three mode accents.
- Modular type scale (`--step--1` … `--step-4`) with clamp for display sizes.

### Primitives (all in `index.css`)

- **Surfaces:** `.card` (+ `.card-hover` lift), `.tile` with mode washes (`.tile-eat/market/rescue/plan`) for bento grids, `.glass-panel` (blurred glass), `.modal-card`/`.modal-overlay`.
- **Actions:** `.btn-primary` (pill, lime, spring hover), `.btn-ghost` (outlined pill), `.link-brand`; all buttons get active-scale press and visible focus rings.
- **Labels:** `.badge` + `.badge-success/warning/danger/brand/accent/muted` chips; `.t-eyebrow` uppercase section labels.
- **Forms:** global `input/textarea/select` token styling with lime focus ring — pages just add spacing.
- **Feedback:** `.toast` (fixed, above the mobile dock), `.skeleton` shimmer, `.loading-dots`.
- **Motion:** keyframes `fade-in`, `rise-in`, `modal-in`, `toast-in`, `soft-pulse`, `shimmer`, `ribbon-flow`, `drift`, `breathe`; `.stagger` cascades children in. `prefers-reduced-motion` collapses all animation durations and disables ambient loops.

### Navigation shell (`src/components/MarketNav.jsx`)

- **Desktop (≥1024px):** fixed 76px left `.rail` — brand button, four-mode switcher (Eat/Market/Rescue/Plan with per-mode accent), role-aware work icons (my orders, group orders, my donations, add item, vendor tools, deliveries, trusts, admin), then search/cart (customers), theme toggle, language switcher, and the avatar that opens the profile sheet. Pages offset with `lg:pl-[76px]`.
- **Mobile (<1024px):** fixed bottom `.dock` with labeled mode buttons + cart badge + avatar; `body` reserves `4.75rem` bottom padding.
- **Sheets:** search opens a centered command sheet (customers); the **profile sheet opens as a centered dialog on desktop (`sm:` = centered, 24rem wide) and a bottom sheet on mobile** — account header, work chips, dark/light toggle ("Dark room / Market day"), a 15-language grid, and logout. All sheets are `position: fixed` overlays anchored to the viewport.
- **Layout invariant:** no route wrapper may carry a CSS `transform` (even `translateY(0)` via animation fill-mode) — a transformed ancestor becomes the containing block for `position: fixed` descendants and would drag the rail/dock/sheets out of the viewport. `AnimatedRoutes` in `App.jsx` therefore animates **opacity only** (`animate-page-fade`).

### Page anatomy

```jsx
<div className='min-h-screen lg:pl-[76px]'>
  <MarketNav />
  <main className='mx-auto w-full max-w-[900px] px-4 pb-16 pt-6 sm:px-6'>
    <p className='t-eyebrow' style={{ color: 'var(--rescue)' }}>Mode eyebrow</p>
    <h1 className='t-display mt-2'>Human, warm headline</h1>
    {/* bento: stagger grid of .tile tiles • lists: .card.grain.card-hover rows */}
  </main>
</div>
```

Leaflet maps are theme-aware (`.leaflet-*` remaps), order pages use `animate-rise-in` entrances, and tracking pages add an animated dashed route ribbon via `ribbon-flow`.

---

## Architecture

```text
React 19 + Vite browser client
  ├─ React Router pages and role gates
  ├─ Redux: user/session, cart, map, shop and order state
  ├─ Axios requests with JWT cookie
  ├─ Contexts: language (i18n + Google Translate), theme (dark/light)
  └─ Socket.IO: identity, live delivery location, vendor & owner order events
                 │
                 ▼
Express 5 + Socket.IO API
  ├─ JWT auth, uploads and domain controllers
  ├─ Razorpay / Nodemailer / Cloudinary / Gemini / Twilio
  └─ Mongoose models ── MongoDB
```

## Project structure

```text
food/
├─ README.md
├─ Backend/
│  ├─ index.js                  # Express app, CORS, Socket.IO wiring, group-order scheduler
│  ├─ config/db.js              # MongoDB connection
│  ├─ controllers/              # auth, user, shop, order, groupOrder, donation,
│  │                            # trust, vendor, mealSchedule, translation
│  ├─ routes/                   # One router per domain, mounted under /api in index.js
│  ├─ models/                   # user, order, donation, trust, GroupOrder, MealSchedule,
│  │                            # VendorProfile, VendorListing, HelperProfile, …
│  ├─ middlewares/              # isAuth (JWT cookie guard), multer (disk & memory uploads)
│  ├─ utils/                    # cloudinary, mailer (Nodemailer), JWT, socket helpers
│  ├─ scripts/                  # maintenance scripts
│  └─ public/                   # Disk-uploaded images
└─ Frontend/vite-project/
   ├─ vite.config.js
   └─ src/
      ├─ App.jsx                # Route table + role gates, socket lifecycle, AnimatedRoutes
      ├─ main.jsx               # Router, Redux store, theme + language providers
      ├─ index.css              # Design tokens, primitives, motion library, dark-mode remaps
      ├─ pages/                 # Route-level screens (29)
      │  ├─ auth:               SignUp · SignIn · ForgotPassword
      │  ├─ eat:                Home · Shop · CartPage · CheckOut · OrderPlaced ·
      │  │                      MyOrders · TrackOrderPage
      │  ├─ owner:              CreateEditShop · AddItem · EditItem
      │  ├─ group:              StartGroupOrderPage · GroupOrderPage · JoinGroupOrderPage ·
      │  │                      MyGroupOrdersPage
      │  ├─ rescue:             DonateFoodPage · MyDonationsPage · TrustsPage · AdminDashboard
      │  ├─ vendors:            VendorPortalPage · VendorRegisterPage · AddProducePage ·
      │  │                      VendorDashboardPage · NearbyVendorsPage · VendorShopPage ·
      │  │                      HelperRegisterPage
      │  └─ plan:               MealSchedulePage
      ├─ components/            # MarketNav (rail/dock/sheets) · OwnerDashBoard ·
      │                         # OwnerOrderCard · OwnerItemCard · UserDashBoard ·
      │                         # UserOrderCard · DeliveryBoyDashBoard · DeliveryBoyTracking ·
      │                         # DonationManagement · FoodCard · CartItemCard · CategoryCard ·
      │                         # CountdownTimer · PricePad · MealScheduleBanner · Nav (legacy)
      ├─ hooks/                 # GetCurrentUser · GetCity · GetShopByCity · GetItemByCity ·
      │                         # GetMyShop · GetMyOrders · UseUpdateLocation ·
      │                         # useRescueImpact · useSpeechRecognition · useAudioInstructions ·
      │                         # useMySchedules
      ├─ redux/                 # store.js · userSlice (session/cart/orders/socket) ·
      │                         # ownerSlice (shop/items) · mapSlice (lat/lng/address)
      ├─ context/               # ThemeContext (dark/light, localStorage) ·
      │                         # LanguageContext (i18n + Google Translate combo)
      ├─ i18n/                  # i18next config and locale resources (en + fallbacks inline)
      └─ assets/                # Bundled images
```

## Roles

| Role | Access |
| --- | --- |
| `user` | Food discovery, cart/checkout, group orders, produce ordering, meal scheduling, donations, ratings and order tracking. |
| `owner` | Restaurant and menu management, incoming-order dashboard, trust registration. |
| `deliveryBoy` | Delivery assignments (orders + donations), live location updates, delivery-OTP completion, earnings view. |
| `supplier` | Standard authenticated experience and food donations. |
| `trustMember` | Trust and donation-management workflows. |
| `admin` | Admin dashboard, user/trust visibility, donation assignment and status administration. |
| `vendor` | Produce listing, AI/voice tools, availability, incoming order management and vendor dashboard. |
| `helper` | Vendor registration on a vendor's behalf. |

The client guards routes by role in `App.jsx`. API endpoints use `isAuth` to validate the JWT cookie; controllers add ownership/role checks for protected actions.

## Socket.IO events

| Event | Direction | Payload | Purpose |
| --- | --- | --- | --- |
| `identity` | client → server | `{ userId }` | Registers the user's socket id for targeted events. |
| `updateLocation` | client → server | `{ latitude, longitude, userId }` | Delivery partner GPS stream (gated by the in-app live-location toggle). |
| `updateDeliveryLocation` | server → client | `{ deliveryBoyId, latitude, longitude }` | Broadcasts rider movement to tracking pages (stored per-rider). |
| `newOrder` | server → client | order document | New order to the owner dashboard (pulse banner + reload) and to my-orders. |
| `update-status` | server → client | `{ orderId, shopId, status }` | Shop-order status changes; drives customers' live cards and partner cleanup. |
| `newAssignment` | server → client | assignment | New delivery run for online partners (appended to the available rail). |
| `newDonationDelivery` | server → client | — | Emitted when a donation is accepted with no rider; partners refresh the rescue rail. |
| `newVendorOrder` / `vendorOrderStatus` | server → client | order / status | Produce-order lifecycle between customers and vendors. |

## Main workflows

### Place and deliver a restaurant order

1. Startup hooks load the signed-in user, geolocation/city, local shops/items, owner shop, and orders.
2. A food card adds an item to Redux cart; cart reducers update quantities and totals.
3. Checkout converts an address to coordinates via Geoapify and calls `POST /api/order/place-order` with the cart, payment method and delivery address.
4. The API splits the cart into shop orders. COD can proceed; online orders open Razorpay and the result is verified by `POST /api/order/verify-payment`.
5. The owner moves a shop order through `pending → preparing → out of delivery → delivered` from the dashboard or my-orders card; a delivery assignment is broadcast and accepted.
6. The delivery partner's geolocation is persisted and emitted. The tracking page receives `updateDeliveryLocation`; email OTP verification confirms delivery.

### Delivery partner day

1. The dashboard (`components/DeliveryBoyDashBoard.jsx`) loads assignments, the current order, returned orders, available donation deliveries and today's stats, then subscribes to `newAssignment`, `newDonationDelivery` and `update-status`.
2. The **available rail** lists *order runs* (shop, drop-off, items, subtotal) and *rescue runs* (trust, pickup address, food chips, delivery charge) with Accept buttons — `GET /api/order/get-assignments` and `GET /api/donation-deliveries/available`.
3. Accepting an order (`GET /api/order/accept-order/:assignmentId`) swaps the rail for the active-run card: live map (`DeliveryBoyTracking`, auto-fitting bounds), **Mark delivered (send OTP)** → email OTP → 4-digit input → `verify-delivery-otp`. Runs can be returned via `cancel-assignment`.
4. Accepting a rescue run (`PATCH /api/donations/:id/accept-delivery`) starts a donation card with `picked_up → delivered` controls (`PATCH /api/donations/:id/status`).
5. The GPS toggle gates `navigator.geolocation.watchPosition` → `socket.emit('updateLocation')`; earnings (₹50/run) and the hourly bar chart come from `GET /api/order/get-today-deliveries`.

### Create a group order

1. At `/start-group-order`, a customer selects a restaurant, delivery information and an expiry or scheduled time.
2. The server generates a shareable link. New visitors land at `/join/:shareableLink` where signed-in users join automatically and guests enter a display name; their participant index is kept in `sessionStorage`.
3. Participants update their own menu choices. The creator can manage participants, nudge them, set/close restaurant voting, apply a coupon, and chat. Arriving at the join page via browser Back shows a choice screen instead of silently re-joining the group.
4. After lock, each participant pays their calculated Razorpay share; HMAC verification records payment.
5. The server places the underlying order when the group is ready. `Backend/index.js` checks scheduled group orders once per minute.

### Donate food (rescue)

1. An eligible user builds the donation at `/donate-food`: food items (name/quantity/unit), pickup address + optional coordinates, pickup time and expiry time (validated to be after pickup), plus a verified trust. Success shows a confirmation state with the matched trust's name and shortcuts to `/my-donations`.
2. `POST /api/donations` requires `trustId`, `foodItems`, pickup address/time and expiry; it verifies the trust, emails the trust (Nodemailer), and returns the donation.
3. Trust/admin manage everything in the donation-management console: four bento counters (open / in transit / delivered / units rescued), inline trust + rider selects, status control, and a delivery-charge panel (GPay number or offline). Accepting online prompts for the payment method; accepted-without-rider donations broadcast `newDonationDelivery` to online partners.
4. Donors track status chips in `/my-donations` (impact ring + weekly counter) and can cancel while `pending`.
5. Delivery partners accept rescue runs from their dashboard (see above). Statuses: `pending → accepted → picked_up → delivered` / `cancelled`.

### Trust network

1. `/trusts` renders every registered trust as a card (photo, capacity/day, accepted food types, contact, GPay, coordinates).
2. Owners, trust members and admins can register a trust (name, contact, email, registration number, capacity, GPay, accepted food types, address, description, bank details, photo upload) and capture lat/lng from device GPS.
3. Card owners (or admins) load a trust back into the edit form. Trust data feeds donation matching and rider navigation.

### Order fresh produce from local vendors

1. A vendor lists produce (AI photo analysis or the manual form); active listings are geo-searchable.
2. A customer opens `/vendors/nearby`, filters by category, and views a vendor storefront at `/vendor/:vendorId`.
3. The storefront basket collects items with quantities; the sticky bar shows the running total and opens a checkout modal for address, phone and payment method.
4. `POST /api/vendor/orders` validates prices/stock server-side, creates a `VendorOrder`, and pushes a `newVendorOrder` socket event to the vendor.
5. The vendor manages incoming orders at `/vendor/dashboard`, moving them through `pending → confirmed → ready → out of delivery → delivered`. Marking `delivered` increments the vendor's daily stats and decrements listing stock; the customer is told via a `vendorOrderStatus` socket event.
6. Customers track status live in "My orders", can cancel while pending/confirmed, and rate the vendor after delivery (one rating per user per vendor, updatable).

### Set up scheduled ordering

1. A customer configures a breakfast, lunch, snacks or dinner slot at `/meal-schedule`, chooses a default restaurant/menu items, and sets its cutoff time.
2. The page validates the shop, items and address per slot with inline feedback, shows live totals with quantity steppers, and supports a shared delivery address.
3. Before the cutoff, the Home banner lets the customer save that day's selection for the slot.
4. At the cutoff, the server creates one COD order using the saved selection, or the configured default when no selection exists, and emits a `newOrder` socket event to the shop owner.
5. `/my-orders` marks the result as auto-ordered and identifies whether it used the default or saved selection.

### Switch between dark and light themes

1. The app boots in the dark room (forest ink, electric-lime actions, terracotta produce accents, paper-grain surfaces).
2. The sun/moon button in the navigation rail (or profile sheet) toggles `data-theme` on `<html>`; the choice is stored in `localStorage` under `grodel_theme`.
3. Every page reads CSS variables, and theme remaps translate hard-coded Tailwind utility colors (legacy brand orange, cyan, grays, reds/greens) onto the active palette, so pages follow the theme without per-file edits. Printing stays paper-white in both themes.

## Client route map

| Routes | Purpose |
| --- | --- |
| `/signup`, `/signin`, `/forgot-password` | Authentication, Google sign-in and OTP password reset. |
| `/` | City-aware home feed, category filtering and food search. |
| `/shop/:shopId`, `/cart`, `/checkout`, `/order-placed`, `/my-orders`, `/track-order/:orderId` | Restaurant browsing and order lifecycle. |
| `/create-edit-shop`, `/add-item`, `/edit-item/:itemId` | Owner shop/menu tools. |
| `/start-group-order`, `/group/:shareableLink`, `/join/:shareableLink`, `/my-group-orders` | Group-order lifecycle. |
| `/donate-food`, `/my-donations`, `/trusts`, `/admin` | Donation, trust and administration tools. |
| `/vendor-portal`, `/vendor/register`, `/vendor/add-produce`, `/vendor/dashboard`, `/vendors/nearby`, `/vendor/:vendorId` | Vendor onboarding, discovery, listings, storefront and incoming orders. |
| `/helper/register-vendor` | Helper-assisted vendor registration. |
| `/meal-schedule` | Customer meal cutoff/default configuration. |

## API domains

All paths below have `/api` as a prefix. Except for explicit public endpoints, requests require the `token` HTTP-only cookie.

| Area | Routes |
| --- | --- |
| Auth | `POST /auth/signup`, `/signin`, `/googleauth`, `/sendotp`, `/verifyotp`, `/resetpassword`; `GET /auth/signout` |
| User | `GET /user/current`, `/user/all`; `POST /user/update-location` |
| Shop & item | Shop create/edit and city/all/current lookup under `/shop`; menu CRUD, lookup, search and rating under `/item` |
| Orders | Place/verify payment, list/detail/current/assignment queries, accept/cancel, status changes, and delivery-OTP endpoints under `/order` |
| Group orders | Create/list/reorder, shared-link detail/join/items, lock/pay/verify, participant/vote/coupon/chat operations under `/group-orders` |
| Donations | `POST /donations`, `GET /donations/my`, `GET /donations`, `PATCH /donations/:id/status`, `/donations/:id/cancel`, `/donations/:id/assign-trust`, `/donations/:id/assign-delivery`, `/donations/:id/accept-delivery`; `GET /donation-deliveries/available`, `/donation-deliveries/current`; `GET /delivery-boys` |
| Trusts | Public list/detail/location lookup and authenticated create/update/delete under `/trusts` |
| Vendors | Voice/helper registration, photo analysis, listings, availability, nearby/shop/rating, stats, WhatsApp webhook, plus produce orders: `POST /orders`, `GET /orders/mine`, `GET /orders/incoming`, `PATCH /orders/:orderId/status`, `POST /orders/:orderId/cancel` under `/vendor` |
| Translation | `POST /translate/batch`, caching translations in MongoDB. |
| Meal scheduling | `GET /meal-schedule`, `PUT /meal-schedule/slot`, `DELETE /meal-schedule/slot/:mealType`, and `PUT /meal-schedule/slot/:mealType/selection` |

The route and controller files are the authoritative source for payload and response details.

## Data model

| Model | Purpose |
| --- | --- |
| `User` | Identity, role, hashed password, password OTP, socket status and GeoJSON location (`2dsphere` indexed). |
| `Shop`, `Item` | Restaurant identity/location and food items with category, veg/non-veg type, price and rating. |
| `Order`, `DeliveryAssignment` | Customer order, per-shop order status/items, payment identifiers, delivery OTP and partner assignment. |
| `GroupOrder` | Share link, expiry/status, participants/items/shares, votes, coupons, scheduling, chat and final order link. |
| `Donation`, `Trust` | Surplus food/pickup/expiry/status/assignment data, delivery-charge payment metadata, and trust contact/location/capacity data. |
| `VendorProfile`, `VendorListing`, `HelperProfile` | Vendor profile/location/stats/per-user ratings, produce availability/AI metadata, and helper registration records. |
| `VendorOrder` | Customer produce order: items with price/qty/unit, payment method, delivery address/phone, status history and cancellation data. |
| `MealSchedule` | A user's meal slots, cutoff times, default items, pending daily picks and once-per-day processing state. |

## Prerequisites

- Node.js 20+ recommended.
- MongoDB locally or MongoDB Atlas.
- Razorpay credentials for online payments.
- Optional service accounts: Firebase Auth, Geoapify, Cloudinary, Google Gemini, Gmail SMTP, Google Translate and Twilio WhatsApp.

## Environment configuration

Create `Backend/.env` and never commit it:

```dotenv
# Server port. 8000 matches the client default.
PORT=8000
MONGODB_URL=mongodb+srv://USER:PASSWORD@HOST/grodel
JWT_SECRET=replace-with-a-long-random-secret

# Frontend origin(s) allowed by CORS and Socket.IO. localhost is always allowed.
# Set CLIENT_URL to your deployed frontend origin (e.g. https://app.example.com).
CLIENT_URL=http://localhost:5173
# "production" enables HTTPS-only secure SameSite=none auth cookies.
NODE_ENV=development

RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxx
EMAIL=your-gmail-address@gmail.com
PASS=gmail-app-password

CLOUD_NAME=cloudinary-cloud-name
# CLOUDINARY_CLOUD_NAME is also recognised by the vendor controller.
CLOUDINARY_API_KEY=xxxxxxxxxx
CLOUDINARY_API_SECRET=xxxxxxxxxx
GEMINI_API_KEY=xxxxxxxxxx
# Uses Google's rotating alias to avoid deprecated model-name failures.
GEMINI_MODEL=gemini-flash-latest
GOOGLE_TRANSLATE_API_KEY=xxxxxxxxxx

TWILIO_ACCOUNT_SID=xxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+1415xxxxxxx
WHATSAPP_WEBHOOK_SECRET=replace-with-a-secret
```

Create `Frontend/vite-project/.env.local`:

```dotenv
VITE_FIREBASE_API_KEY=xxxxxxxxxx
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
VITE_GEOAPIKEY=xxxxxxxxxx
# API base URL. Defaults to http://localhost:8000 when unset; set to the
# deployed API origin for a hosted build.
VITE_API_URL=http://localhost:8000
```

The translation endpoint can fall back to an unofficial Google endpoint when `GOOGLE_TRANSLATE_API_KEY` is absent, but production should use an official key.

## Run locally

In one terminal:

```powershell
cd Backend
npm install
npm run dev
```

In another:

```powershell
cd Frontend/vite-project
npm install
npm run dev
```

Open Vite's local URL (normally `http://localhost:5173`). Permit geolocation for nearby content/delivery tracking and microphone access for voice features.

### Port, CORS and deployment note

Hosts are configuration, not code. The client resolves its API base from `VITE_API_URL` (default `http://localhost:8000`), and `Backend/index.js` allows localhost plus any origins listed in `CLIENT_URL` / `FRONTEND_URL`. Auth cookies switch to `secure` + `SameSite=none` only when `NODE_ENV=production`, so localhost keeps working while a hosted build just needs its env vars set. Point `VITE_API_URL` at the deployed API and set `CLIENT_URL` to the deployed frontend origin, then the same code runs locally and in production.

## Scripts

| Directory | Command | Description |
| --- | --- | --- |
| `Backend` | `npm run dev` | Starts `nodemon index.js`. |
| `Frontend/vite-project` | `npm run dev` | Starts Vite. |
| `Frontend/vite-project` | `npm run build` | Builds the production client. |
| `Frontend/vite-project` | `npm run preview` | Previews the production build. |
| `Frontend/vite-project` | `npm run lint` | Runs ESLint. |

## Security and operational notes

- Auth writes a 7-day HTTP-only `token` cookie. Local cookies use `secure: false` and `sameSite: "strict"`; production needs HTTPS and appropriate cookie/CORS values.
- Restaurant/item/trust uploads use Multer disk storage in `Backend/public`; vendor photo analysis uses an in-memory upload and Cloudinary.
- No automated test scripts are currently defined. Run frontend lint/build and manually exercise affected role flows.
- The group-order scheduler is an in-process one-minute `setInterval`; use a durable queue/cron solution for multi-instance production deployments.
- Keep secrets in environment files and rotate any key ever committed or exposed.

## Technology

Frontend: React 19, Vite, React Router, Redux Toolkit, Axios, Tailwind CSS 4, React Leaflet, Recharts, Socket.IO Client, i18next, react-icons, Firebase Auth and Razorpay Checkout.

Backend: Node.js, Express 5, Socket.IO, Mongoose/MongoDB, JWT, bcrypt, Multer, Nodemailer, Razorpay, Cloudinary, Google Generative AI and Twilio.

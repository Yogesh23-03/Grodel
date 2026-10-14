# GroDel Deployment Checklist

Backend → **Render** · Frontend → **Vercel**

Everything here is written against this repository. The code already handles
cookies, CORS, proxy trust and security headers; the checklist is about wiring
origins and secrets correctly.

---

## Before deploying

- [ ] Every variable from [Backend/.env.example](Backend/.env.example) is set in the Render dashboard
- [ ] `NODE_ENV=production` is set on Render (this is what turns on `secure` + `sameSite=none` cookies)
- [ ] `FRONTEND_URL` is the **exact** Vercel origin, e.g. `https://grodel.vercel.app` — no trailing slash
- [ ] `MONGODB_URL` points at the production database (not the dev one)
- [ ] `JWT_SECRET` is a fresh, long random value — not the local one
- [ ] `VITE_SERVER_URL` is set in Vercel to the Render URL, no trailing slash
- [ ] `VITE_RAZORPAY_KEY_ID` is set in Vercel; the **secret** key is only on Render
- [ ] `VITE_FIREBASE_API_KEY` and `VITE_GEOAPIKEY` are set in Vercel (see the frontend table below)
- [ ] MongoDB Atlas → Network Access allows Render (`0.0.0.0/0`, or Render's egress IPs)
- [ ] Cloudinary → allowed origins includes the Vercel domain
- [ ] Razorpay → webhook URL points at the Render URL
- [ ] Twilio → WhatsApp webhook URL points at `https://<render-url>/api/vendor/whatsapp-webhook`
- [ ] Cookies: `sameSite=none` + `secure=true` in production — **already handled in code**, just confirm `NODE_ENV`

---

## Render setup

| Setting | Value |
|---------|-------|
| Root Directory | `Backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/` |
| Node version | `>= 20` (declared in `package.json` → `engines`) |

`Backend/render.yaml` is a blueprint that encodes the above, with `sync: false`
on every secret so values are only ever entered in the dashboard.

---

## Vercel setup

| Setting | Value |
|---------|-------|
| Root Directory | `Frontend/vite-project` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

`Frontend/vite-project/vercel.json` supplies the SPA rewrite (so a deep link
like `/track-order/123` doesn't 404) and the security headers.

`Frontend/vite-project/.env.production` is **git-ignored**, so it will not exist
in the Vercel build. Vite gives real environment variables precedence over `.env`
files anyway — set the values in the Vercel dashboard and treat that as the
source of truth.

### Frontend environment variables

Every one of these is inlined at build time, so changing a value needs a
redeploy, not a restart.

| Variable | Set it to | Why it matters |
|----------|-----------|----------------|
| `VITE_SERVER_URL` | the Render origin, no trailing slash | Every API and socket call. `VITE_API_URL` is honoured as an alias |
| `VITE_FIREBASE_API_KEY` | the Firebase web API key | `src/firebase.js` calls `initializeApp` at import time — without it the auth screens throw |
| `VITE_RAZORPAY_KEY_ID` | the public key id | Checkout. The matching secret stays on Render only |
| `VITE_GEOAPIKEY` | a geocoding key | Address lookup and city detection |

The remaining Firebase values (`authDomain`, `projectId`, `storageBucket`,
`messagingSenderId`, `appId`) are public client config and are committed in
`src/firebase.js` on purpose — they are not secrets.

---

## Common deployment errors and fixes

**CORS error: "Origin not allowed"**
The browser origin is not in the allow-list. `allowedOrigins` is built from
`http://localhost:5173`, `http://127.0.0.1:5173`, plus `FRONTEND_URL` and
`CLIENT_URL`. Set `FRONTEND_URL` to the Vercel origin **character for
character** — a trailing slash or a `www.` mismatch is enough to fail.

**Signed in, then immediately signed out (cookie not stored)**
Production cookies need `secure=true` and `sameSite=none`, which requires HTTPS
on both ends. Those flags are derived from `NODE_ENV`, so the usual cause is
`NODE_ENV` not being `production` on Render. Also confirm the frontend calls the
API over `https://`, not `http://`.

**Socket.IO connects then drops, or never connects**
Socket.IO shares the same origin allow-list as CORS. If HTTP requests work but
the socket does not, the deployed origin is still missing from `FRONTEND_URL` /
`CLIENT_URL`.

**Every API call 429s after a burst of activity**
Rate limiting is on by default (1000 requests / 15 min per IP on `/api` with CORS
preflights excluded, 10 auth attempts / hour). The app fires several API reads per
navigation, so do not lower `RATE_LIMIT_MAX` — a tight ceiling makes pages render
"Too many requests". Raise it further for load testing via `RATE_LIMIT_MAX` and
`AUTH_RATE_LIMIT_MAX` on Render. `app.set('trust proxy', 1)` is already set so
the real client IP is used rather than Render's proxy address.

**MongoDB connection timeout**
Atlas is refusing Render's IP. Add `0.0.0.0/0` to Network Access (or Render's
static egress IPs on a paid plan).

**Images break on the deployed frontend but load locally**
Helmet's `crossOriginResourcePolicy` is set to `cross-origin` for this reason; if
images are still blocked, the cause is almost always a `http://` `VITE_SERVER_URL`
on an `https://` page (mixed content).

**Build fails on Vercel**
Check that `vite.config.js` still has `build.outDir: 'dist'` and that the Vercel
output directory matches. Also confirm the build is running in
`Frontend/vite-project` — the repo root has no `package.json`.

**Changing `VITE_*` has no effect**
`VITE_*` variables are inlined at build time. After editing one in Vercel you
must **redeploy**; a restart is not enough.

**AI features return 503 "AI is not configured"**
`GROQ_API_KEY` is missing on the server. `utils/groq.js` throws a typed
`AI_NOT_CONFIGURED` error and each controller maps it to a 503 rather than a 500.

---

## Known limitations

**Scheduled work only runs while the service is awake.** Group-order and
meal-schedule processing is driven by a `setInterval` in `Backend/index.js`
(every 60s). On Render's free plan the service sleeps after inactivity, so
nothing is processed until the next request wakes it. Move those two calls to a
Render cron job, or run on an always-on plan, if that timing matters.

## Post-deploy smoke test

Run these against the deployed origins, not localhost.

1. `GET https://<render-url>/` → `hello world`
2. Sign in on the Vercel site, then reload → still signed in (proves cookies)
3. `GET https://<render-url>/api/engagement/leaderboard` → 200 JSON (no auth)
4. Open an order's tracking page → the wait-engagement tabs render
5. Owner dashboard → apply a discount → the home page shows the sale badge
6. `GET https://<render-url>/api/analysis/owner` while signed in as an owner → JSON
7. Trigger any AI feature (nutrition, chatbot, AI description) → a real answer, not a 503
8. Watch the browser console and network tab for CORS or mixed-content errors

---

## Rollback

Render keeps previous deploys — use **Rollback** on the service. Vercel keeps
every deployment as an immutable URL — use **Promote to Production** on the last
good one.

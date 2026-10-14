# GroDel — Frontend

React 19 + Vite 7 + Tailwind CSS v4 single-page app.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

The app expects the API at `http://localhost:8000` unless `VITE_SERVER_URL`
(or its alias `VITE_API_URL`) points somewhere else. See
[Backend/.env.example](../../Backend/.env.example) for the server side.

```bash
npm run build    # → dist/
npm run preview  # serve the built output
npm run lint
```

## Environment

Vite inlines `VITE_*` variables at **build** time, so a change needs a rebuild,
not a restart. The full table is in [DEPLOYMENT.md](../../DEPLOYMENT.md).

| Variable | Purpose |
|----------|---------|
| `VITE_SERVER_URL` | API origin (falls back to localhost:8000) |
| `VITE_API_URL` | Alias of the above, kept for existing deploys |
| `VITE_FIREBASE_API_KEY` | Firebase web API key (rest of the config is public, in `src/firebase.js`) |
| `VITE_RAZORPAY_KEY_ID` | Public Razorpay key id — the secret lives on the server |
| `VITE_GEOAPIKEY` | Geocoding for address / city lookup |

## Architecture

```
src/
  App.jsx                    routes, socket wiring, and the three root layers
  components/
    AuroraBg.jsx             the ambient orbs + the pointer-parallax publisher
    FloatingFoodBackground.jsx   the drifting food field (see its tuning CONFIG)
    MarketNav.jsx            floating rail + mobile dock
    ui/                      the design system: TiltCard, GlowingButton,
                             GlowSkeleton, GlowSpinner, GlobalTilt
  styles/theme.css           design-system vocabulary (glass, tilt, float, g-*)
  index.css                  tokens, Tailwind v4 @theme, nav shell
  pages/                     one file per route
```

## Design system

The theme is **Neon Midnight Bistro**: midnight `#0B0E14`, surfaces `#151A25`,
mango `#FF6B35` for actions, neon mint `#00FF94` for positive metrics, electric
cyan `#00E5FF` for links/active/focus.

- **Tokens** live in `src/index.css` (`:root`, plus the light-theme override).
- **Utilities** live in `src/styles/theme.css` — prefer `glass-soft`,
  `g-card`, `g-btn`, `g-input`, `tilt`, `float-card` over ad-hoc Tailwind.
- **Tailwind v4 is CSS-first**: the config *is* the `@theme` block in
  `index.css`. A `tailwind.config.js` would be ignored unless opted into with
  `@config`, so don't add one.
- **3D tilt** is one window listener (`GlobalTilt.jsx`) writing `--rx`/`--ry`;
  any element with `.tilt`, `.card-3d` or `.tile` picks it up. Wrap new cards in
  `<TiltCard>` for the same effect plus the depth/glow props.
- **Motion** respects `prefers-reduced-motion` throughout; the background field
  additionally thins itself on small screens.

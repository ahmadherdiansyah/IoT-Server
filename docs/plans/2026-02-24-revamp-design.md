# IoT Smart Home Panel — Full Revamp Design

**Date:** 2026-02-24
**Author:** Ahmad Herdiansyah
**Status:** Approved

---

## Overview

Full revamp of the IoT Smart Home Panel dashboard. Goals:
- Modern dark glassmorphism UI replacing Bootstrap 3 + AdminLTE v2
- Bootstrap 5 upgrade
- Backend modernization: async/await, env vars, security packages
- Bug fixes: undefined callback, session logout ID, global variable leaks
- Auth middleware extracted as shared helper

---

## Architecture

**Stack (unchanged):** Express.js + EJS + MongoDB (Mongoose) + MQTT
**Frontend:** Bootstrap 5 + custom dark glassmorphism CSS + Chart.js + jQuery

### New Dependencies

| Package | Purpose |
|---|---|
| `dotenv` | Environment variables (DB URI, session secret, MQTT host) |
| `helmet` | HTTP security headers |
| `express-rate-limit` | Brute-force protection on login endpoint |
| `express-validator` | Input validation on forms and API routes |

### Removed Dependencies

| Package | Reason |
|---|---|
| `popper.js` | Bundled inside Bootstrap 5 |
| AdminLTE CSS/JS | Replaced by custom glassmorphism CSS |

### Upgraded Dependencies

| Package | From | To |
|---|---|---|
| `bootstrap` | 3.4.1 | 5.x |
| `mongoose` | 5.7.5 | 8.x |

---

## UI Design System (Dark Glassmorphism)

### Colors
- **Background:** `#0a0f1e` deep dark with subtle radial gradient overlays
- **Glass card:** `background: rgba(255,255,255,0.05); backdrop-filter: blur(12px)`
- **Border:** `1px solid rgba(255,255,255,0.1)`
- **Primary accent:** Cyan `#00d4ff` / `#00bcd4`
- **Secondary accent:** Purple `#7c3aed` (gradient highlights)
- **Text primary:** `#e2e8f0`
- **Text muted:** `#64748b`

### Typography
- **Font:** Inter (Google Fonts) — weights 300, 400, 600, 700

### Component Styles

**Sidebar:**
- Dark glass panel, icon + label nav items
- Active item: cyan left border + subtle cyan glow background
- User avatar section at top

**Header/Topbar:**
- Transparent with backdrop-filter blur
- Hamburger toggle for sidebar collapse

**Dashboard Metric Cards:**
- Glass cards with large metric number
- Animated gradient border on hover
- Colored icon indicator (temperature=red, humidity=blue, gas=orange)
- Real-time pulse dot indicator

**Charts:**
- Dark-themed Chart.js — cyan/purple lines, minimal gridlines
- Smooth curves, gradient fill under lines

**Controls Page:**
- CSS toggle switches replacing ON/OFF button pairs
- Status indicator (online/offline dot) per device
- Device name + current status displayed

**Login Page:**
- Centered glass card on animated gradient dark background
- Logo at top, username/password fields with glass styling
- Error alert displayed inline

**User Management:**
- Glass card wrapping data table (Bootstrap 5 table)
- Action buttons with icon-only on mobile, icon+text on desktop
- Modal dialogs with glass styling

---

## Backend Modernization

### 1. Environment Variables (`app.js` + `.env`)

Move hardcoded values to `.env`:
```
MONGO_URI=mongodb://103.115.164.134:27017/mqtt
SESSION_SECRET=your-strong-secret-here
MQTT_HOST=mqtt.flexiot.xl.co.id
PORT=3000
```

### 2. Security Middleware (`app.js`)

```js
app.use(helmet());
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/login', loginLimiter);
```

### 3. Auth Middleware (`middleware/auth.js`)

Extract repeated auth check from all routes into a single middleware:
```js
async function requireAuth(req, res, next) {
  const user = await User.findById(req.session.userId);
  if (!user) return res.redirect('/');
  res.locals.user = user;
  next();
}
```

### 4. Route Modernization

All routes converted from callback-style to `async/await`:

**`routes/login.js` fixes:**
- `callback` undefined bug → proper error return
- Logout: `req.session.id` → `req.session.userId` (was always wrong)
- Add `express-validator` on POST body

**`routes/api.js` fixes:**
- Global variable leaks (`limit`, `alat`, `nomor`, `aksi`) → `const`/`let`
- Remove broken MQTT publish string in webhook (malformed JSON)
- Remove debug `console.log()` calls
- Async/await for DB queries

**`routes/user-management.js`:**
- Wire up the Delete button (currently no-op in UI)
- Add validation on create/edit

### 5. Models (unchanged)
`models/user.js` and `models/mqtt_data.js` work correctly — no changes needed.

---

## Frontend JS Fixes (in EJS files)

- **Deduplicate AJAX calls** in `home.ejs`: two identical calls to the same topic → one combined call
- **`var` → `const`/`let`** throughout all inline scripts
- **Remove hardcoded external URL** in `controls.ejs` (`https://server1.stmiot-tech.xyz/`) → use relative `/api/mqtt/publish`
- **Toggle switch JS**: `kirim()` updated to send ON/OFF state from switch input

---

## Files Changed

### New Files
- `middleware/auth.js` — shared auth guard
- `public/css/theme.css` — custom dark glassmorphism stylesheet
- `.env.example` — template for environment variables
- `docs/plans/2026-02-24-revamp-design.md` — this file

### Modified Files
- `app.js` — dotenv, helmet, rate limiter, env vars
- `package.json` — new + upgraded dependencies
- `views/index.ejs` — login page redesign
- `views/home.ejs` — dashboard redesign
- `views/sensor.ejs` — sensors page redesign
- `views/controls.ejs` — controls page with toggle switches
- `views/user-management.ejs` — user management redesign
- `views/partials/head.ejs` — Bootstrap 5, Inter font, theme.css
- `views/partials/header.ejs` — Bootstrap 5 navbar
- `views/partials/sidebar.ejs` — new sidebar structure
- `views/partials/script.ejs` — Bootstrap 5 bundle
- `views/partials/footer.ejs` — minimal footer
- `routes/login.js` — async/await, bug fixes, validation
- `routes/api.js` — fix global leaks, async/await
- `routes/users.js` — use auth middleware
- `routes/sensors.js` — use auth middleware
- `routes/control.js` — use auth middleware
- `routes/user-management.js` — use auth middleware, wire delete

### Unchanged Files
- `models/user.js`
- `models/mqtt_data.js`
- `routes/mqttapi.js`
- `routes/cctv.js`
- `views/cctv.ejs`
- `views/admin_create.ejs`
- `views/error.ejs`

---

## Success Criteria

- [ ] All pages render correctly with new dark glassmorphism design
- [ ] Login works, session persists, logout destroys session correctly
- [ ] Sensor data updates live every 6 seconds on dashboard
- [ ] Controls toggle switches send MQTT publish correctly
- [ ] User management CRUD operations work (including delete)
- [ ] No hardcoded secrets in committed code
- [ ] No global variable leaks in route files
- [ ] Helmet security headers present on all responses

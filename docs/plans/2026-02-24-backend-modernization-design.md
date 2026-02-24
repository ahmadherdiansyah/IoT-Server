# Backend Modernization Design

**Date:** 2026-02-24
**Author:** Ahmad Herdiansyah
**Status:** Approved

---

## Overview

Full backend restructure of the IoT Smart Home Panel using a standard MVC pattern:
Routes → Controllers → Services → Models. Goals:
- Eliminate all `var`, callbacks, and bad patterns remaining after the initial revamp
- Separate concerns: routes are thin, controllers handle HTTP, services handle logic
- Fix MQTT: singleton client, env-var host, JSON.stringify instead of string concat
- Fix models: async `authenticate`, proper bcrypt salt rounds, `isModified` guard
- Add centralized error handler middleware

**Stack (unchanged):** Express.js + EJS + MongoDB (Mongoose) + MQTT

---

## Project Structure

### New Files
- `services/userService.js` — user CRUD and auth logic
- `services/mqttService.js` — MQTT singleton client with env-var host
- `controllers/authController.js` — login/logout/admin-create handlers
- `controllers/userManagementController.js` — user CRUD handlers
- `controllers/apiController.js` — REST API data and login handlers
- `controllers/mqttController.js` — MQTT publish/subscribe endpoint handlers
- `middleware/errorHandler.js` — centralized JSON/HTML error formatting

### Modified Files
- `models/user.js` — async `authenticate`, proper bcrypt, `isModified` pre-save guard
- `models/mqtt_data.js` — add `timestamps: true`, use `const`
- `routes/login.js` — thin: delegates to authController
- `routes/api.js` — thin: delegates to apiController
- `routes/mqttapi.js` — thin: delegates to mqttController, fix `/subscibe` typo, remove dead GET /
- `routes/user-management.js` — thin: delegates to userManagementController
- `routes/cctv.js` — add `requireAuth`, remove callback style
- `app.js` — use centralized errorHandler, move MQTT_HOST guard

### Unchanged Files
- `routes/users.js`, `routes/sensors.js`, `routes/control.js` — already clean
- `middleware/auth.js` — already clean
- `views/`, `public/`, `.env`, `package.json`

---

## Layer Design

### Models

**`models/user.js`**

Problems fixed:
- `var` → `const`
- `authenticate` static converted from callback to `async` — eliminates `new Promise(...)` wrappers at call sites
- `bcrypt.hash(pwd, null, null, cb)` → `bcrypt.hash(pwd, SALT_ROUNDS)` with explicit `SALT_ROUNDS = 10`
- Pre-save hook: add `if (!this.isModified('password')) return` to avoid re-hashing on every save
- Variable shadowing: `var err` inside nested callback removed

**`models/mqtt_data.js`**

- `var` → `const`
- Add `{ timestamps: true }` to schema so records get `createdAt`/`updatedAt`

---

### Services

**`services/userService.js`**

```js
async function authenticate(username, password) // calls User.authenticate
async function findById(id)
async function findAll()
async function create(data)
async function deleteById(id)
```

All functions are async, throw on error, return null on not-found.

**`services/mqttService.js`**

- MQTT client created once as a singleton (no recreation on each request)
- Host from `process.env.MQTT_HOST` (already in `.env`)
- `publish(topic, event, payload, mac)` — builds JSON with `JSON.stringify`, not string concat
- Logs connect/error/reconnect events
- Exported as module-level singleton

---

### Controllers

Each controller is a plain object of async handler functions. No class syntax needed.

**`controllers/authController.js`**
- `showLogin(req, res, next)` — check admin exists, render login or admin_create
- `login(req, res, next)` — validate, call userService.authenticate, set session
- `logout(req, res, next)` — destroy session, redirect
- `createAdmin(req, res, next)` — create first admin, set session

**`controllers/userManagementController.js`**
- `index(req, res, next)` — fetch all users, render
- `create(req, res, next)` — validate, call userService.create, redirect
- `deleteUser(req, res, next)` — validate ObjectId, self-delete guard, call userService.deleteById

**`controllers/apiController.js`**
- `info(req, res)` — returns API info object
- `getData(req, res, next)` — unified handler for GET + POST /data (reads from req.body or req.query)
- `login(req, res, next)` — API login, returns `{ message, success }` with proper HTTP status

**`controllers/mqttController.js`**
- `publish(req, res, next)` — unified handler for GET + POST /publish: validates params, calls mqttService.publish
- `subscribe(req, res, next)` — validates topic + authtoken, calls mqttService client directly

---

### Routes (Thin)

```js
// routes/login.js
router.get('/',      authController.showLogin);
router.post('/',     validators.login, authController.login);
router.get('/logout', authController.logout);
router.post('/create', validators.create, authController.createAdmin);

// routes/api.js
router.get('/',       apiController.info);
router.get('/data',   apiController.getData);
router.post('/data',  apiController.getData);
router.post('/login', apiController.login);

// routes/mqttapi.js
router.get('/publish',  mqttController.publish);
router.post('/publish', mqttController.publish);
router.post('/subscribe', mqttController.subscribe);  // typo fixed

// routes/user-management.js
router.get('/',            requireAuth, userManagementController.index);
router.post('/create',     requireAuth, validators.createUser, userManagementController.create);
router.post('/delete/:id', requireAuth, userManagementController.deleteUser);

// routes/cctv.js
router.get('/', requireAuth, (req, res) => res.render('cctv', { data: req.user }));
```

---

### Middleware

**`middleware/errorHandler.js`**

```js
// Replaces the inline error handler in app.js
// API paths (/api/*): return JSON { error, status }
// Browser paths: render 'error' view
// In development: include stack trace
```

---

## API Response Format

All `/api/*` responses standardized:

| Scenario | Status | Body |
|---|---|---|
| Success with data | 200 | `{ data: [...] }` |
| Success no content | 200 | `{ message: "success" }` |
| Auth failure | 401 | `{ error: "Invalid credentials" }` |
| Bad request | 400 | `{ error: "..." }` |
| Not found | 404 | `{ error: "Not found" }` |

Previously: arrays `[{ Pesan: 'sukses' }]` with mixed Indonesian/English — cleaned up.

---

## MQTT Changes

- `MQTT_HOST` env var already exists in `.env` — `mqttapi.js` now reads it
- JSON payload built with `JSON.stringify` — eliminates injection risk from string concat
- Singleton client shared across routes — no reconnection issues
- `/subscibe` → `/subscribe` typo fixed
- Dead `GET /` route (rendered login page) removed from mqttapi.js

---

## Success Criteria

- [ ] All files use `const`/`let`, no `var`
- [ ] No callbacks — all async/await
- [ ] `User.authenticate` is async, no Promise wrappers at call sites
- [ ] bcrypt uses explicit `SALT_ROUNDS = 10`, not `null, null`
- [ ] Pre-save hook checks `isModified('password')`
- [ ] MQTT host from `process.env.MQTT_HOST`
- [ ] MQTT JSON built with `JSON.stringify` not string concat
- [ ] Routes have zero business logic (only routing + middleware composition)
- [ ] `/api/*` responses use consistent format with proper HTTP status codes
- [ ] `/subscibe` typo fixed to `/subscribe`
- [ ] `routes/cctv.js` uses `requireAuth`
- [ ] Centralized error handler in `middleware/errorHandler.js`
- [ ] `models/mqtt_data.js` has timestamps

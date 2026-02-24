# IoT Smart Home Panel — Full Revamp Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Revamp the IoT Smart Home Panel with a dark glassmorphism UI (Bootstrap 5), fix all backend bugs, add security middleware, and modernize code to async/await with env vars.

**Architecture:** Express.js + EJS templates + MongoDB/Mongoose + MQTT. All pages use shared EJS partials (head, header, sidebar, script, footer). A new `middleware/auth.js` replaces the repeated `User.findById(session.userId)` pattern in every route. Custom `public/css/theme.css` replaces the entire AdminLTE theme.

**Tech Stack:** Node.js, Express 4, EJS, Mongoose 8, Bootstrap 5, Chart.js, jQuery, MQTT, dotenv, helmet, express-rate-limit, express-validator

---

## Context: What's Wrong Right Now

**Critical bugs:**
- `routes/login.js:13` — `callback` is undefined, will crash on DB error
- `routes/login.js:99` — logout uses `req.session.id` instead of `req.session.userId` (destroys wrong session)
- `routes/api.js:150` — `callback` also undefined in GET `/login`
- `routes/api.js:31,127` — `limit` is a global variable (no `let`/`const`)

**Security issues:**
- Hardcoded `MONGO_URI` and `SESSION_SECRET` in `app.js`
- No rate limiting on login — brute-force trivial
- No helmet security headers
- Password shown in plaintext in edit form (`user-management.ejs:94`)

**UI issues:**
- Bootstrap 3 + AdminLTE v2 (end-of-life) — dated look
- Duplicate AJAX calls in `home.ejs` (lines 182–260, same topic fetched twice)
- Hardcoded external URL `https://server1.stmiot-tech.xyz/` in `controls.ejs`
- All JS uses `var`, not `const`/`let`

---

## Task 1: Install New Dependencies

**Files:**
- Modify: `package.json`
- Run: `npm install`

**Step 1: Install new packages**

```bash
cd /Users/ahmadherdiansyah/work/personal/IoT-Server
npm install dotenv helmet express-rate-limit express-validator
npm install mongoose@8
```

**Step 2: Install Bootstrap 5 and remove old popper.js**

```bash
npm install bootstrap@5
npm uninstall popper.js
```

**Step 3: Verify package.json has correct versions**

Check that `package.json` now shows:
- `"bootstrap": "^5.x.x"`
- `"dotenv": "^16.x.x"`
- `"helmet": "^8.x.x"`
- `"express-rate-limit": "^7.x.x"`
- `"express-validator": "^7.x.x"`
- `"mongoose": "^8.x.x"`

**Step 4: Copy Bootstrap 5 files to public**

```bash
cp node_modules/bootstrap/dist/css/bootstrap.min.css public/css/bootstrap.min.css
cp node_modules/bootstrap/dist/js/bootstrap.bundle.min.js public/js/bootstrap.bundle.min.js
```

**Step 5: Commit**

```bash
git add package.json package-lock.json public/css/bootstrap.min.css public/js/bootstrap.bundle.min.js
git commit -m "chore: upgrade to Bootstrap 5, add dotenv/helmet/rate-limit/validator"
```

---

## Task 2: Environment Variables + Security Middleware in app.js

**Files:**
- Create: `.env`
- Create: `.env.example`
- Modify: `app.js`
- Modify: `.gitignore` (if it exists, otherwise create)

**Step 1: Create `.env` file**

```
MONGO_URI=mongodb://103.115.164.134:27017/mqtt
SESSION_SECRET=replace-this-with-a-strong-random-secret-32chars
PORT=3000
```

> **Note:** Replace `SESSION_SECRET` with a strong random string before running in production. Use `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` to generate one.

**Step 2: Create `.env.example`**

```
MONGO_URI=mongodb://localhost:27017/mqtt
SESSION_SECRET=your-strong-secret-here
PORT=3000
```

**Step 3: Add `.env` to `.gitignore`**

Create or append to `.gitignore`:
```
node_modules/
.env
```

**Step 4: Rewrite `app.js`**

Replace the entire `app.js` with:

```js
require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hidePoweredBy = require('hide-powered-by');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const apiRouter = require('./routes/api');
const mqttapi = require('./routes/mqttapi');
const login = require('./routes/login');
const sensors = require('./routes/sensors');
const controls = require('./routes/control');
const cctv = require('./routes/cctv');
const userManagement = require('./routes/user-management');
const proxy = require('express-http-proxy');

const app = express();

mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('MongoDB connected'));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(hidePoweredBy({ setTo: 'X-Force' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-dev-secret',
  resave: false,
  saveUninitialized: false,
  store: new MongoStore({ mongooseConnection: db }),
  cookie: { httpOnly: true, sameSite: 'lax' }
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts, please try again later.'
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', login);
app.use('/login', loginLimiter, login);
app.use('/users', usersRouter);
app.use('/api', apiRouter);
app.use('/api/mqtt', mqttapi);
app.use('/sensors', sensors);
app.use('/controls', controls);
app.use('/cctv', cctv);
app.use('/user-management', userManagement);
app.use('/cctv/api', proxy('http://192.168.46.3:8080'));

app.use((req, res, next) => next(createError(404)));

app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
```

**Step 5: Verify server starts**

```bash
node bin/www
```

Expected: `MongoDB connected` in terminal, server listening on port 3000. No crash.

**Step 6: Commit**

```bash
git add app.js .env.example .gitignore
git commit -m "feat: add dotenv, helmet, rate limiting; move secrets to env vars"
```

---

## Task 3: Create Auth Middleware

**Files:**
- Create: `middleware/auth.js`

**Step 1: Create `middleware/` directory and `auth.js`**

```bash
mkdir -p middleware
```

Create `middleware/auth.js`:

```js
const User = require('../models/user');

async function requireAuth(req, res, next) {
  try {
    if (!req.session.userId) {
      return res.redirect('/');
    }
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.redirect('/');
    }
    res.locals.user = user;
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireAuth;
```

**Step 2: Verify the file exists**

```bash
ls middleware/auth.js
```

Expected: file shown

**Step 3: Commit**

```bash
git add middleware/auth.js
git commit -m "feat: add requireAuth middleware to replace repeated session checks"
```

---

## Task 4: Fix Backend Routes

**Files:**
- Modify: `routes/login.js`
- Modify: `routes/users.js`
- Modify: `routes/sensors.js`
- Modify: `routes/control.js`
- Modify: `routes/user-management.js`
- Modify: `routes/api.js`

### 4a: Fix `routes/login.js`

Replace the entire file:

```js
const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');

const router = express.Router();

// Show login or admin create page
router.get('/', async (req, res, next) => {
  try {
    const admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      return res.render('admin_create', { title: 'Admin Setup', data: 'clean' });
    }
    res.render('index', { title: 'Login', data: 'clean' });
  } catch (err) {
    next(err);
  }
});

// Login POST
router.post('/',
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('index', { title: 'Login', data: errors.array()[0].msg });
    }
    try {
      User.authenticate(req.body.username, req.body.password, (err, user) => {
        if (err || !user) {
          return res.render('index', { title: 'Login', data: 'Username atau password salah!' });
        }
        req.session.userId = user._id;
        return res.redirect('/users');
      });
    } catch (err) {
      next(err);
    }
  }
);

// Create first admin account
router.post('/create',
  body('username').trim().notEmpty(),
  body('password').notEmpty(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('admin_create', { title: 'Admin Setup', data: errors.array()[0].msg });
    }
    try {
      const userData = {
        name: req.body.name || req.body.username,
        username: req.body.username,
        password: req.body.password,
        card: req.body.cardkey || '-',
        mac: req.body.mac || '-',
        is_superuser: true,
      };
      const user = await User.create(userData);
      req.session.userId = user._id;
      return res.redirect('/users');
    } catch (err) {
      res.render('admin_create', { title: 'Admin Setup', data: err.message });
    }
  }
);

// Logout
router.get('/logout', (req, res, next) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) return next(err);
      return res.redirect('/');
    });
  } else {
    res.redirect('/');
  }
});

module.exports = router;
```

### 4b: Simplify `routes/users.js`

```js
const express = require('express');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  res.render('home', { data: req.user });
});

module.exports = router;
```

### 4c: Simplify `routes/sensors.js`

```js
const express = require('express');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  res.render('sensor', { data: req.user });
});

module.exports = router;
```

### 4d: Simplify `routes/control.js`

```js
const express = require('express');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  res.render('controls', { data: req.user });
});

module.exports = router;
```

### 4e: Fix `routes/user-management.js`

```js
const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const users = await User.find({});
    res.render('user-management', { data: req.user, semua: users });
  } catch (err) {
    next(err);
  }
});

router.post('/create', requireAuth,
  body('username').trim().notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required'),
  body('name').trim().notEmpty().withMessage('Name required'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect('/user-management');
    }
    try {
      const userData = {
        name: req.body.name,
        username: req.body.username,
        password: req.body.password,
        is_superuser: req.body.superuser === 'true',
        card: req.body.cardkey || '-',
        mac: req.body.mac || '-',
      };
      await User.create(userData);
      res.redirect('/user-management');
    } catch (err) {
      next(err);
    }
  }
);

router.post('/delete/:id', requireAuth, async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/user-management');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

### 4f: Fix `routes/api.js`

Fix the two key issues: global variable leaks (`limit` without `let`/`const`) and the undefined `callback` variable. Also remove the broken webhook (malformed JSON in MQTT publish):

```js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const data = require('../models/mqtt_data');

router.get('/', (req, res) => {
  res.json([{
    title: 'Smart Home API',
    copyright: 'Ahmad Herdiansyah',
    endpoints: {
      data: 'POST /api/data { topic, limit }',
      login: 'POST /api/login { username, password }'
    }
  }]);
});

router.post('/data', async (req, res, next) => {
  try {
    const limit = parseInt(req.body.limit) || 10;
    const results = await data.find({ topic: req.body.topic })
      .limit(limit)
      .sort({ timestamp: -1 });
    res.json(results);
  } catch (err) {
    next(err);
  }
});

router.get('/data', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const results = await data.find({ topic: req.query.topic })
      .limit(limit)
      .sort({ timestamp: -1 });
    res.json(results);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ message: 'All fields required' });
  }
  try {
    User.authenticate(req.body.username, req.body.password, (err, user) => {
      if (err || !user) {
        return res.json([{ Pesan: 'Username atau password salah' }]);
      }
      res.json([{ Pesan: 'sukses' }]);
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

**Step: Verify server still starts after all route changes**

```bash
node bin/www
```

Expected: No crash, `MongoDB connected` shown.

**Step: Commit**

```bash
git add routes/login.js routes/users.js routes/sensors.js routes/control.js routes/user-management.js routes/api.js
git commit -m "fix: async/await routes, auth middleware, undefined callback bug, logout session bug"
```

---

## Task 5: Create Custom Glassmorphism CSS Theme

**Files:**
- Create: `public/css/theme.css`

This is the core design file. Create `public/css/theme.css` with the complete dark glassmorphism theme:

```css
/* ===== RESET & BASE ===== */
*, *::before, *::after { box-sizing: border-box; }

:root {
  --bg-deep: #0a0f1e;
  --bg-mid: #0d1424;
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.10);
  --glass-hover: rgba(255, 255, 255, 0.08);
  --accent-cyan: #00d4ff;
  --accent-cyan-dim: rgba(0, 212, 255, 0.15);
  --accent-purple: #7c3aed;
  --accent-purple-dim: rgba(124, 58, 237, 0.15);
  --accent-red: #ef4444;
  --accent-orange: #f97316;
  --accent-green: #22c55e;
  --text-primary: #e2e8f0;
  --text-muted: #64748b;
  --text-dim: #94a3b8;
  --sidebar-width: 260px;
  --header-height: 60px;
  --radius: 12px;
  --radius-sm: 8px;
  --shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  --transition: all 0.2s ease;
}

html, body {
  margin: 0; padding: 0;
  min-height: 100vh;
  background: var(--bg-deep);
  color: var(--text-primary);
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 14px;
  line-height: 1.6;
}

/* ===== LAYOUT WRAPPER ===== */
.wrapper {
  display: flex;
  min-height: 100vh;
}

/* ===== BACKGROUND GRADIENT ===== */
body::before {
  content: '';
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background:
    radial-gradient(ellipse at 10% 20%, rgba(0, 212, 255, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 90% 80%, rgba(124, 58, 237, 0.06) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

/* ===== GLASS CARD ===== */
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: var(--shadow);
  position: relative;
  z-index: 1;
}

/* ===== SIDEBAR ===== */
.main-sidebar {
  width: var(--sidebar-width);
  min-height: 100vh;
  background: rgba(10, 15, 30, 0.95);
  border-right: 1px solid var(--glass-border);
  backdrop-filter: blur(20px);
  position: fixed;
  top: 0; left: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
}

.sidebar-brand {
  padding: 20px 24px;
  border-bottom: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.sidebar-brand-icon {
  width: 36px; height: 36px;
  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
}

.sidebar-brand-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.sidebar-brand-text span { color: var(--accent-cyan); }

.sidebar-user {
  padding: 16px 24px;
  border-bottom: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar-user-avatar {
  width: 36px; height: 36px;
  background: linear-gradient(135deg, var(--accent-cyan-dim), var(--accent-purple-dim));
  border: 1px solid var(--glass-border);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
}

.sidebar-user-info .name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.sidebar-user-info .status {
  font-size: 11px;
  color: var(--accent-green);
}

.sidebar-nav {
  flex: 1;
  padding: 12px 0;
  list-style: none;
  margin: 0;
}

.sidebar-nav .nav-header {
  padding: 8px 24px 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--text-muted);
}

.sidebar-nav li a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 24px;
  color: var(--text-dim);
  text-decoration: none;
  border-left: 3px solid transparent;
  transition: var(--transition);
  font-size: 13px;
  font-weight: 500;
}

.sidebar-nav li a:hover {
  color: var(--text-primary);
  background: var(--glass-hover);
  border-left-color: rgba(0, 212, 255, 0.5);
}

.sidebar-nav li.active > a {
  color: var(--accent-cyan);
  background: var(--accent-cyan-dim);
  border-left-color: var(--accent-cyan);
}

.sidebar-nav li a .nav-icon {
  width: 20px;
  font-size: 15px;
  text-align: center;
  flex-shrink: 0;
}

.sidebar-nav .logout-item a {
  color: var(--accent-red);
  opacity: 0.7;
}

.sidebar-nav .logout-item a:hover {
  opacity: 1;
  background: rgba(239, 68, 68, 0.1);
  border-left-color: var(--accent-red);
}

/* ===== MAIN CONTENT AREA ===== */
.content-area {
  margin-left: var(--sidebar-width);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;
  z-index: 1;
}

/* ===== TOPBAR / HEADER ===== */
.main-header {
  height: var(--header-height);
  background: rgba(10, 15, 30, 0.8);
  border-bottom: 1px solid var(--glass-border);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sidebar-toggle {
  background: none;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  color: var(--text-dim);
  padding: 6px 10px;
  cursor: pointer;
  transition: var(--transition);
}

.sidebar-toggle:hover {
  color: var(--text-primary);
  background: var(--glass-hover);
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-dim);
  font-size: 13px;
  text-decoration: none;
  transition: var(--transition);
}

.header-user:hover {
  color: var(--text-primary);
  background: var(--glass-hover);
}

/* ===== PAGE CONTENT ===== */
.page-content {
  flex: 1;
  padding: 24px;
}

/* ===== BREADCRUMB ===== */
.breadcrumb-area {
  margin-bottom: 24px;
}

.breadcrumb-area h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.breadcrumb {
  background: none;
  padding: 0;
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.breadcrumb-item a { color: var(--accent-cyan); text-decoration: none; }
.breadcrumb-item.active { color: var(--text-muted); }
.breadcrumb-item + .breadcrumb-item::before { color: var(--text-muted); }

/* ===== METRIC CARDS (Dashboard) ===== */
.metric-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  backdrop-filter: blur(12px);
  padding: 20px;
  transition: var(--transition);
  position: relative;
  overflow: hidden;
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.metric-card:hover { border-color: rgba(255,255,255,0.2); transform: translateY(-2px); }
.metric-card:hover::before { opacity: 1; }

.metric-card.temp::before { background: linear-gradient(90deg, var(--accent-red), #ff6b35); }
.metric-card.humidity::before { background: linear-gradient(90deg, var(--accent-cyan), #0ea5e9); }
.metric-card.gas::before { background: linear-gradient(90deg, var(--accent-orange), #fbbf24); }

.metric-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.metric-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
}

.metric-icon {
  width: 36px; height: 36px;
  border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
}

.metric-icon.temp { background: rgba(239, 68, 68, 0.15); color: var(--accent-red); }
.metric-icon.humidity { background: rgba(0, 212, 255, 0.15); color: var(--accent-cyan); }
.metric-icon.gas { background: rgba(249, 115, 22, 0.15); color: var(--accent-orange); }

.metric-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
  margin-bottom: 12px;
}

.metric-bar {
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
}

.metric-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.metric-bar-fill.temp { background: var(--accent-red); }
.metric-bar-fill.humidity { background: var(--accent-cyan); }
.metric-bar-fill.gas { background: var(--accent-orange); }

.metric-pulse {
  display: inline-block;
  width: 8px; height: 8px;
  background: var(--accent-green);
  border-radius: 50%;
  margin-right: 6px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

/* ===== CHART CARD ===== */
.chart-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  backdrop-filter: blur(12px);
  padding: 20px;
}

.chart-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 16px;
}

/* ===== CONTROL CARDS (Toggle Switches) ===== */
.device-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  backdrop-filter: blur(12px);
  padding: 20px;
  transition: var(--transition);
}

.device-card:hover {
  border-color: rgba(255,255,255,0.15);
}

.device-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.device-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.device-icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.2);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  color: var(--accent-cyan);
}

.device-status {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.device-status .status-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}

.device-status .status-dot.on { background: var(--accent-green); box-shadow: 0 0 6px var(--accent-green); }
.device-status .status-dot.off { background: var(--text-muted); }
.device-status .status-dot.unknown { background: var(--accent-orange); }

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 56px;
  height: 28px;
}

.toggle-switch input {
  opacity: 0;
  width: 0; height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.1);
  border: 1px solid var(--glass-border);
  border-radius: 28px;
  transition: 0.3s;
}

.toggle-slider:before {
  position: absolute;
  content: '';
  height: 20px; width: 20px;
  left: 3px; bottom: 3px;
  background: var(--text-muted);
  border-radius: 50%;
  transition: 0.3s;
}

input:checked + .toggle-slider {
  background: rgba(0, 212, 255, 0.2);
  border-color: var(--accent-cyan);
}

input:checked + .toggle-slider:before {
  transform: translateX(28px);
  background: var(--accent-cyan);
  box-shadow: 0 0 8px var(--accent-cyan);
}

.device-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toggle-label {
  font-size: 12px;
  color: var(--text-muted);
}

/* ===== SENSOR PAGE ===== */
.sensor-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  backdrop-filter: blur(12px);
  padding: 24px;
}

.sensor-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.sensor-topic {
  font-size: 11px;
  font-family: 'Courier New', monospace;
  color: var(--accent-cyan);
  background: var(--accent-cyan-dim);
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid rgba(0, 212, 255, 0.2);
  margin-bottom: 16px;
  display: inline-block;
}

.sensor-value-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sensor-value-label {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

.sensor-bar {
  flex: 1;
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  overflow: hidden;
}

.sensor-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.sensor-bar-fill.temp { background: linear-gradient(90deg, #f97316, #ef4444); }
.sensor-bar-fill.humidity { background: linear-gradient(90deg, #0ea5e9, #00d4ff); }
.sensor-bar-fill.gas { background: linear-gradient(90deg, #fbbf24, #f97316); }

/* ===== TABLE ===== */
.glass-table {
  width: 100%;
  border-collapse: collapse;
}

.glass-table th {
  background: rgba(255,255,255,0.05);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--glass-border);
  text-align: left;
}

.glass-table td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  color: var(--text-primary);
  font-size: 13px;
  vertical-align: middle;
}

.glass-table tr:last-child td { border-bottom: none; }

.glass-table tr:hover td {
  background: var(--glass-hover);
}

/* ===== BADGES ===== */
.badge-registered {
  background: rgba(34, 197, 94, 0.15);
  color: var(--accent-green);
  border: 1px solid rgba(34, 197, 94, 0.3);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.badge-not-registered {
  background: rgba(100, 116, 139, 0.15);
  color: var(--text-muted);
  border: 1px solid rgba(100, 116, 139, 0.3);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

/* ===== BUTTONS ===== */
.btn-glass {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
}

.btn-glass:hover { background: var(--glass-hover); color: var(--text-primary); }

.btn-glass-primary {
  background: var(--accent-cyan-dim);
  border-color: rgba(0, 212, 255, 0.3);
  color: var(--accent-cyan);
}

.btn-glass-primary:hover {
  background: rgba(0, 212, 255, 0.2);
  color: var(--accent-cyan);
}

.btn-glass-danger {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: var(--accent-red);
}

.btn-glass-danger:hover {
  background: rgba(239, 68, 68, 0.2);
  color: var(--accent-red);
}

.btn-glass-success {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
  color: var(--accent-green);
}

.btn-glass-success:hover {
  background: rgba(34, 197, 94, 0.2);
  color: var(--accent-green);
}

/* ===== FORMS (modals / login) ===== */
.form-control-glass {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: 10px 14px;
  font-size: 13px;
  width: 100%;
  transition: var(--transition);
}

.form-control-glass::placeholder { color: var(--text-muted); }

.form-control-glass:focus {
  outline: none;
  border-color: rgba(0, 212, 255, 0.5);
  background: rgba(0, 212, 255, 0.05);
  box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
}

.form-label-glass {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  display: block;
}

/* ===== MODAL GLASS ===== */
.modal-glass .modal-content {
  background: rgba(13, 20, 36, 0.95);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  backdrop-filter: blur(20px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

.modal-glass .modal-header {
  border-bottom: 1px solid var(--glass-border);
  padding: 16px 20px;
}

.modal-glass .modal-title {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 600;
}

.modal-glass .btn-close {
  filter: invert(1) opacity(0.5);
}

.modal-glass .modal-body { padding: 20px; }

.modal-glass .modal-footer {
  border-top: 1px solid var(--glass-border);
  padding: 12px 20px;
}

/* ===== LOGIN PAGE ===== */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-deep);
}

.login-page::before {
  content: '';
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background:
    radial-gradient(ellipse at 30% 30%, rgba(0, 212, 255, 0.1) 0%, transparent 60%),
    radial-gradient(ellipse at 70% 70%, rgba(124, 58, 237, 0.1) 0%, transparent 60%);
  animation: bg-shift 8s ease infinite alternate;
}

@keyframes bg-shift {
  0% { opacity: 0.6; }
  100% { opacity: 1; }
}

.login-card {
  width: 100%;
  max-width: 380px;
  background: rgba(13, 20, 36, 0.9);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  backdrop-filter: blur(20px);
  padding: 36px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  position: relative;
  z-index: 1;
}

.login-logo {
  text-align: center;
  margin-bottom: 28px;
}

.login-logo-icon {
  width: 52px; height: 52px;
  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px;
  margin: 0 auto 12px;
}

.login-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.login-subtitle {
  font-size: 13px;
  color: var(--text-muted);
}

.login-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, var(--accent-cyan), #0ea5e9);
  border: none;
  border-radius: var(--radius-sm);
  color: #0a0f1e;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: var(--transition);
  margin-top: 8px;
}

.login-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 212, 255, 0.3);
}

.alert-glass {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-sm);
  color: #fca5a5;
  padding: 10px 14px;
  font-size: 13px;
  margin-top: 16px;
}

/* ===== FOOTER ===== */
.main-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--glass-border);
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-left: var(--sidebar-width);
}

.main-footer a { color: var(--accent-cyan); text-decoration: none; }

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
  .main-sidebar {
    transform: translateX(-100%);
  }
  .main-sidebar.open {
    transform: translateX(0);
  }
  .content-area, .main-footer {
    margin-left: 0;
  }
  .metric-value { font-size: 24px; }
}

/* ===== SCROLLBAR ===== */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
```

**Step: Commit**

```bash
git add public/css/theme.css
git commit -m "feat: add dark glassmorphism CSS theme"
```

---

## Task 6: Update EJS Partials

**Files:**
- Modify: `views/partials/head.ejs`
- Modify: `views/partials/script.ejs`
- Modify: `views/partials/header.ejs`
- Modify: `views/partials/sidebar.ejs`
- Modify: `views/partials/footer.ejs`

### 6a: `views/partials/head.ejs`

```html
<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Smart Home Panel</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="/css/bootstrap.min.css">
<link rel="stylesheet" href="/css/theme.css">
```

### 6b: `views/partials/script.ejs`

```html
<script src="/js/jquery.min.js"></script>
<script src="/js/bootstrap.bundle.min.js"></script>
<script src="/js/Chart.bundle.min.js"></script>
<script>
  // Sidebar toggle for mobile
  document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.main-sidebar');
    if (toggle && sidebar) {
      toggle.addEventListener('click', function() {
        sidebar.classList.toggle('open');
      });
    }
  });
</script>
```

### 6c: `views/partials/header.ejs`

```html
<header class="main-header">
  <div class="header-left">
    <button class="sidebar-toggle" id="sidebarToggle" aria-label="Toggle sidebar">
      <i class="fa fa-bars"></i>
    </button>
    <span class="page-title"><%= typeof pageTitle !== 'undefined' ? pageTitle : 'Dashboard' %></span>
  </div>
  <div class="header-right">
    <a href="/login/logout" class="header-user" title="Logout">
      <i class="fa fa-circle" style="color: var(--accent-green); font-size: 8px;"></i>
      <span><%= data.username %></span>
      <i class="fa fa-sign-out-alt" style="font-size: 12px; opacity: 0.6;"></i>
    </a>
  </div>
</header>
```

### 6d: `views/partials/sidebar.ejs`

```html
<aside class="main-sidebar">
  <a href="/users" class="sidebar-brand">
    <div class="sidebar-brand-icon">🏠</div>
    <div class="sidebar-brand-text">Smart<span>Home</span></div>
  </a>
  <div class="sidebar-user">
    <div class="sidebar-user-avatar">👤</div>
    <div class="sidebar-user-info">
      <div class="name"><%= data.username %></div>
      <div class="status">● Online</div>
    </div>
  </div>
  <ul class="sidebar-nav">
    <li class="nav-header">Main Navigation</li>
    <li class="<%= typeof activePage !== 'undefined' && activePage === 'dashboard' ? 'active' : '' %>">
      <a href="/users">
        <i class="fa fa-tachometer-alt nav-icon"></i>
        <span>Dashboard</span>
      </a>
    </li>
    <li class="<%= typeof activePage !== 'undefined' && activePage === 'sensors' ? 'active' : '' %>">
      <a href="/sensors">
        <i class="fa fa-microchip nav-icon"></i>
        <span>Sensors</span>
      </a>
    </li>
    <li class="<%= typeof activePage !== 'undefined' && activePage === 'controls' ? 'active' : '' %>">
      <a href="/controls">
        <i class="fa fa-sliders-h nav-icon"></i>
        <span>Controls</span>
      </a>
    </li>
    <li class="<%= typeof activePage !== 'undefined' && activePage === 'cctv' ? 'active' : '' %>">
      <a href="/cctv">
        <i class="fa fa-video nav-icon"></i>
        <span>CCTV</span>
      </a>
    </li>
    <li class="<%= typeof activePage !== 'undefined' && activePage === 'users' ? 'active' : '' %>">
      <a href="/user-management">
        <i class="fa fa-users nav-icon"></i>
        <span>User Management</span>
      </a>
    </li>
    <li class="logout-item">
      <a href="/login/logout">
        <i class="fa fa-sign-out-alt nav-icon"></i>
        <span>Logout</span>
      </a>
    </li>
  </ul>
</aside>
```

### 6e: `views/partials/footer.ejs`

```html
<footer class="main-footer">
  <span>&copy; 2026 Smart Home Panel</span>
  <span style="color: var(--text-muted); font-size: 11px;">IoT Dashboard v3.0</span>
</footer>
```

**Step: Commit**

```bash
git add views/partials/
git commit -m "feat: update all EJS partials for Bootstrap 5 and glassmorphism theme"
```

---

## Task 7: Redesign Login Page

**Files:**
- Modify: `views/index.ejs`
- Modify: `views/admin_create.ejs`

### 7a: `views/index.ejs` (Login)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %> — Smart Home Panel</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link rel="stylesheet" href="/css/bootstrap.min.css">
  <link rel="stylesheet" href="/css/theme.css">
</head>
<body class="login-page">
  <div class="login-card">
    <div class="login-logo">
      <div class="login-logo-icon">🏠</div>
      <h1 class="login-title">Smart Home Panel</h1>
      <p class="login-subtitle">Sign in to your account</p>
    </div>
    <form action="/login" method="post">
      <div class="mb-3">
        <label class="form-label-glass">Username</label>
        <input type="text" class="form-control-glass" name="username" placeholder="Enter your username" required autocomplete="username">
      </div>
      <div class="mb-3">
        <label class="form-label-glass">Password</label>
        <input type="password" class="form-control-glass" name="password" placeholder="Enter your password" required autocomplete="current-password">
      </div>
      <button type="submit" class="login-btn">
        <i class="fa fa-sign-in-alt me-2"></i>Sign In
      </button>
    </form>
    <% if(data !== 'clean') { %>
    <div class="alert-glass mt-3">
      <i class="fa fa-exclamation-circle me-2"></i><%= data %>
    </div>
    <% } %>
  </div>
  <script src="/js/bootstrap.bundle.min.js"></script>
</body>
</html>
```

### 7b: `views/admin_create.ejs` (Admin Setup)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Setup — Smart Home Panel</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link rel="stylesheet" href="/css/bootstrap.min.css">
  <link rel="stylesheet" href="/css/theme.css">
</head>
<body class="login-page">
  <div class="login-card" style="max-width: 420px;">
    <div class="login-logo">
      <div class="login-logo-icon">⚙️</div>
      <h1 class="login-title">Initial Setup</h1>
      <p class="login-subtitle">Create your admin account</p>
    </div>
    <form action="/login/create" method="post">
      <div class="mb-3">
        <label class="form-label-glass">Full Name</label>
        <input type="text" class="form-control-glass" name="name" placeholder="John Doe" required>
      </div>
      <div class="mb-3">
        <label class="form-label-glass">Username</label>
        <input type="text" class="form-control-glass" name="username" placeholder="admin" required autocomplete="username">
      </div>
      <div class="mb-3">
        <label class="form-label-glass">Password</label>
        <input type="password" class="form-control-glass" name="password" placeholder="Strong password" required autocomplete="new-password">
      </div>
      <div class="mb-3">
        <label class="form-label-glass">Card Key (Optional)</label>
        <input type="text" class="form-control-glass" name="cardkey" placeholder="RFID card key">
      </div>
      <div class="mb-3">
        <label class="form-label-glass">MAC Address (Optional)</label>
        <input type="text" class="form-control-glass" name="mac" placeholder="AA:BB:CC:DD:EE:FF">
      </div>
      <button type="submit" class="login-btn">
        <i class="fa fa-user-plus me-2"></i>Create Admin Account
      </button>
    </form>
    <% if(data !== 'clean') { %>
    <div class="alert-glass mt-3">
      <i class="fa fa-exclamation-circle me-2"></i><%= data %>
    </div>
    <% } %>
  </div>
  <script src="/js/bootstrap.bundle.min.js"></script>
</body>
</html>
```

**Step: Test login**

Start server, navigate to `http://localhost:3000/`. Verify:
- Dark glassmorphism card centered on dark background
- Form submits and redirects to dashboard on valid login
- Error message shows inline on wrong credentials

**Step: Commit**

```bash
git add views/index.ejs views/admin_create.ejs
git commit -m "feat: redesign login and admin setup pages with glassmorphism"
```

---

## Task 8: Redesign Dashboard (home.ejs)

**Files:**
- Modify: `views/home.ejs`

Key fixes in this file:
1. Remove duplicate AJAX calls (lines 182–260 call same topic twice — merge into one)
2. `var` → `const`/`let`
3. Dark-themed Chart.js config

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <% include partials/head %>
</head>
<body>
<div class="wrapper">
  <% include partials/sidebar %>
  <div class="content-area">
    <% include partials/header %>
    <main class="page-content">
      <div class="breadcrumb-area">
        <h1>Dashboard</h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item active">
              <i class="fa fa-tachometer-alt me-1"></i>Home
            </li>
          </ol>
        </nav>
      </div>

      <!-- Metric Cards -->
      <div class="row g-3 mb-4">
        <div class="col-lg-4 col-md-6">
          <div class="metric-card temp">
            <div class="metric-card-header">
              <div>
                <div class="metric-label">Temperature</div>
                <div style="font-size:11px; color: var(--text-muted);">
                  <span class="metric-pulse"></span>Live
                </div>
              </div>
              <div class="metric-icon temp"><i class="fa fa-thermometer-half"></i></div>
            </div>
            <div class="metric-value" id="suhu">--°C</div>
            <div class="metric-bar">
              <div class="metric-bar-fill temp" id="suhuBar" style="width: 0%"></div>
            </div>
          </div>
        </div>
        <div class="col-lg-4 col-md-6">
          <div class="metric-card humidity">
            <div class="metric-card-header">
              <div>
                <div class="metric-label">Humidity</div>
                <div style="font-size:11px; color: var(--text-muted);">
                  <span class="metric-pulse"></span>Live
                </div>
              </div>
              <div class="metric-icon humidity"><i class="fa fa-tint"></i></div>
            </div>
            <div class="metric-value" id="kelembaban">--%</div>
            <div class="metric-bar">
              <div class="metric-bar-fill humidity" id="kelembabanbar" style="width: 0%"></div>
            </div>
          </div>
        </div>
        <div class="col-lg-4 col-md-6">
          <div class="metric-card gas">
            <div class="metric-card-header">
              <div>
                <div class="metric-label">Gas Sensor</div>
                <div style="font-size:11px; color: var(--text-muted);">
                  <span class="metric-pulse"></span>Live
                </div>
              </div>
              <div class="metric-icon gas"><i class="fa fa-wind"></i></div>
            </div>
            <div class="metric-value" id="asaps">--</div>
            <div class="metric-bar">
              <div class="metric-bar-fill gas" id="gasBar" style="width: 0%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="row g-3">
        <div class="col-lg-6">
          <div class="chart-card">
            <div class="chart-card-title">Temperature & Humidity</div>
            <canvas id="myChart1" height="120"></canvas>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="chart-card">
            <div class="chart-card-title">Gas Level</div>
            <canvas id="asap" height="120"></canvas>
          </div>
        </div>
      </div>
    </main>
    <% include partials/footer %>
  </div>
</div>
<% include partials/script %>
<script>
$(document).ready(function () {
  // Chart config
  const chartDefaults = {
    showLines: true,
    animation: { duration: 300 },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.04)' }
      },
      y: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
        min: 0, max: 100
      }
    },
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 11 } } }
    }
  };

  const emptyLabels = ['', '', '', '', '', '', ''];
  const emptyData = [null, null, null, null, null, null, null];

  const ctx1 = document.getElementById('myChart1').getContext('2d');
  const ctx2 = document.getElementById('asap').getContext('2d');

  const myLineChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: [...emptyLabels],
      datasets: [
        {
          label: 'Temperature (°C)',
          data: [...emptyData],
          borderColor: 'rgba(239,68,68,0.9)',
          backgroundColor: 'rgba(239,68,68,0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgba(239,68,68,1)',
          pointRadius: 3,
        },
        {
          label: 'Humidity (%)',
          data: [...emptyData],
          borderColor: 'rgba(0,212,255,0.9)',
          backgroundColor: 'rgba(0,212,255,0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgba(0,212,255,1)',
          pointRadius: 3,
        }
      ]
    },
    options: chartDefaults
  });

  const gasChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: [...emptyLabels],
      datasets: [{
        label: 'Gas Level',
        data: [...emptyData],
        borderColor: 'rgba(249,115,22,0.9)',
        backgroundColor: 'rgba(249,115,22,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(249,115,22,1)',
        pointRadius: 3,
      }]
    },
    options: {
      ...chartDefaults,
      scales: {
        ...chartDefaults.scales,
        y: { ...chartDefaults.scales.y, max: 800 }
      }
    }
  });

  function addData() {
    // Single call for temp + humidity (same topic)
    $.ajax({
      url: '/api/data',
      method: 'POST',
      data: { topic: 'generic_brand_810/generic_device/v1/common', limit: '1' },
      success: function(data) {
        if (!data || !data[0]) return;
        let msg = data[0].message
          .replace(',{', ',')
          .replace('},', ',');
        try {
          const parsed = JSON.parse(msg);
          const timestamp = data[0].date;

          // Temperature
          const temp = parsed.suhu;
          $('#suhu').text(temp + '°C');
          myLineChart.data.labels.push(timestamp);
          myLineChart.data.labels.shift();
          myLineChart.data.datasets[0].data.push(temp);
          myLineChart.data.datasets[0].data.shift();
          const tempPct = Math.min(Math.max((temp / 50) * 100, 0), 100);
          $('#suhuBar').css('width', tempPct + '%');

          // Humidity
          const hum = parsed.kelembaban;
          $('#kelembaban').text(hum + '%');
          myLineChart.data.datasets[1].data.push(hum);
          myLineChart.data.datasets[1].data.shift();
          $('#kelembabanbar').css('width', Math.min(hum, 100) + '%');

          myLineChart.update();
        } catch(e) { console.warn('Parse error:', e); }
      }
    });

    // Gas sensor
    $.ajax({
      url: '/api/data',
      method: 'POST',
      data: { topic: '/sensor/gas', limit: '1' },
      success: function(data) {
        if (!data || !data[0]) return;
        const val = parseFloat(data[0].message);
        gasChart.data.labels.push(data[0].date);
        gasChart.data.labels.shift();
        gasChart.data.datasets[0].data.push(val);
        gasChart.data.datasets[0].data.shift();
        gasChart.update();

        $('#asaps').text(val <= 100 ? 'Normal' : 'Gas Detected!');
        const gasPct = Math.min((val / 800) * 100, 100);
        $('#gasBar').css('width', gasPct + '%');
      }
    });
  }

  addData();
  setInterval(addData, 6000);
});
</script>
</body>
</html>
```

**Step: Test dashboard**

Navigate to `http://localhost:3000/users` after login. Verify:
- Three metric cards render with correct colors
- Charts render in dark theme
- Live pulse dots animate
- No duplicate network requests in DevTools (only 2 AJAX calls per interval, not 3)

**Step: Commit**

```bash
git add views/home.ejs
git commit -m "feat: redesign dashboard with glassmorphism, fix duplicate AJAX calls"
```

---

## Task 9: Redesign Sensors Page

**Files:**
- Modify: `views/sensor.ejs`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <% include partials/head %>
</head>
<body>
<div class="wrapper">
  <% include partials/sidebar %>
  <div class="content-area">
    <% include partials/header %>
    <main class="page-content">
      <div class="breadcrumb-area">
        <h1>Sensors</h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><a href="/users">Home</a></li>
            <li class="breadcrumb-item active">Sensors</li>
          </ol>
        </nav>
      </div>

      <div class="row g-3">
        <div class="col-lg-4 col-md-6">
          <div class="sensor-card glass-card">
            <div class="sensor-card-header">
              <div class="metric-icon temp" style="width:40px;height:40px;">
                <i class="fa fa-thermometer-half"></i>
              </div>
              <div>
                <div style="font-size:15px;font-weight:600;color:var(--text-primary)">Temperature</div>
              </div>
            </div>
            <div class="sensor-topic">/sensor/suhu</div>
            <div class="sensor-value-row">
              <span class="sensor-value-label">Value:</span>
              <div class="sensor-bar">
                <div class="sensor-bar-fill temp" id="suhu-bar" style="width:0%"></div>
              </div>
              <span id="suhu" style="font-size:13px;font-weight:600;color:var(--accent-red);white-space:nowrap">--°C</span>
            </div>
          </div>
        </div>
        <div class="col-lg-4 col-md-6">
          <div class="sensor-card glass-card">
            <div class="sensor-card-header">
              <div class="metric-icon humidity" style="width:40px;height:40px;">
                <i class="fa fa-tint"></i>
              </div>
              <div>
                <div style="font-size:15px;font-weight:600;color:var(--text-primary)">Humidity</div>
              </div>
            </div>
            <div class="sensor-topic">/sensor/kelembaban</div>
            <div class="sensor-value-row">
              <span class="sensor-value-label">Value:</span>
              <div class="sensor-bar">
                <div class="sensor-bar-fill humidity" id="kelembaban-bar" style="width:0%"></div>
              </div>
              <span id="kelembaban" style="font-size:13px;font-weight:600;color:var(--accent-cyan);white-space:nowrap">--%</span>
            </div>
          </div>
        </div>
        <div class="col-lg-4 col-md-6">
          <div class="sensor-card glass-card">
            <div class="sensor-card-header">
              <div class="metric-icon gas" style="width:40px;height:40px;">
                <i class="fa fa-wind"></i>
              </div>
              <div>
                <div style="font-size:15px;font-weight:600;color:var(--text-primary)">Gas Sensor</div>
              </div>
            </div>
            <div class="sensor-topic">/sensor/gas</div>
            <div class="sensor-value-row">
              <span class="sensor-value-label">Value:</span>
              <div class="sensor-bar">
                <div class="sensor-bar-fill gas" id="gas-bar" style="width:0%"></div>
              </div>
              <span id="gas" style="font-size:13px;font-weight:600;color:var(--accent-orange);white-space:nowrap">--</span>
            </div>
          </div>
        </div>
      </div>
    </main>
    <% include partials/footer %>
  </div>
</div>
<% include partials/script %>
<script>
function cekdata(sensor) {
  $.ajax({
    url: '/api/data',
    method: 'POST',
    data: { topic: '/sensor/' + sensor, limit: '1' },
    success: function(data) {
      if (!data || !data[0]) return;
      const val = parseFloat(data[0].message);
      if (sensor === 'suhu') {
        $('#suhu').text(val + '°C');
        $('#suhu-bar').css('width', Math.min((val / 50) * 100, 100) + '%');
      } else if (sensor === 'kelembaban') {
        $('#kelembaban').text(val + '%');
        $('#kelembaban-bar').css('width', Math.min(val, 100) + '%');
      } else if (sensor === 'gas') {
        $('#gas').text(val);
        $('#gas-bar').css('width', Math.min((val / 800) * 100, 100) + '%');
      }
    }
  });
}

$(document).ready(function() {
  cekdata('suhu');
  cekdata('kelembaban');
  cekdata('gas');
  setInterval(function() {
    cekdata('suhu');
    cekdata('kelembaban');
    cekdata('gas');
  }, 3000);
});
</script>
</body>
</html>
```

**Step: Commit**

```bash
git add views/sensor.ejs
git commit -m "feat: redesign sensors page with glassmorphism and live bars"
```

---

## Task 10: Redesign Controls Page (Toggle Switches)

**Files:**
- Modify: `views/controls.ejs`

Key fix: remove hardcoded `https://server1.stmiot-tech.xyz/` — use relative `/api/mqtt/publish`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <% include partials/head %>
</head>
<body>
<div class="wrapper">
  <% include partials/sidebar %>
  <div class="content-area">
    <% include partials/header %>
    <main class="page-content">
      <div class="breadcrumb-area">
        <h1>Controls</h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><a href="/users">Home</a></li>
            <li class="breadcrumb-item active">Controls</li>
          </ol>
        </nav>
      </div>

      <div class="row g-3">
        <% [1,2,3,4].forEach(function(n) { %>
        <div class="col-lg-3 col-md-6">
          <div class="device-card">
            <div class="device-card-header">
              <div class="device-name">Light <%= n %></div>
              <div class="device-icon"><i class="fa fa-lightbulb"></i></div>
            </div>
            <div class="device-status">
              <span class="status-dot unknown" id="dot<%= n %>"></span>
              Status: <span id="lampu<%= n %>">Unknown</span>
            </div>
            <div class="device-toggle-row">
              <span class="toggle-label">OFF</span>
              <label class="toggle-switch">
                <input type="checkbox" id="switch<%= n %>" onchange="toggleDevice(<%= n %>, this.checked)">
                <span class="toggle-slider"></span>
              </label>
              <span class="toggle-label">ON</span>
            </div>
          </div>
        </div>
        <% }); %>
      </div>
    </main>
    <% include partials/footer %>
  </div>
</div>
<% include partials/script %>
<script>
function toggleDevice(num, isOn) {
  const msg = (isOn ? 'ON' : 'OFF') + num;
  $.ajax({
    url: '/api/mqtt/publish',
    method: 'POST',
    data: { topic: '/controls', pesan: msg },
    error: function() {
      console.warn('MQTT publish failed for device', num);
    }
  });
}

function cekStatus(num) {
  $.ajax({
    url: '/api/data',
    method: 'POST',
    data: { topic: '/status/lampu' + num, limit: '1' },
    success: function(data) {
      if (!data || !data[0]) return;
      const status = data[0].message;
      const isOn = status === 'ON';
      $('#lampu' + num).text(status);
      $('#switch' + num).prop('checked', isOn);
      const dot = $('#dot' + num);
      dot.removeClass('on off unknown');
      dot.addClass(isOn ? 'on' : 'off');
    }
  });
}

$(document).ready(function() {
  [1,2,3,4].forEach(cekStatus);
  setInterval(function() {
    [1,2,3,4].forEach(cekStatus);
  }, 3000);
});
</script>
</body>
</html>
```

**Step: Test controls**

Navigate to `/controls`. Verify:
- 4 device cards render with toggle switches
- No network requests to `stmiot-tech.xyz` (check DevTools Network tab)
- Toggle switch animation works (click one)

**Step: Commit**

```bash
git add views/controls.ejs
git commit -m "feat: redesign controls with toggle switches, remove hardcoded external URL"
```

---

## Task 11: Redesign User Management Page

**Files:**
- Modify: `views/user-management.ejs`

Key fixes: wire up the Delete button (was a no-op), remove plaintext password in edit form, Bootstrap 5 modal syntax.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <% include partials/head %>
</head>
<body>
<div class="wrapper">
  <% include partials/sidebar %>
  <div class="content-area">
    <% include partials/header %>
    <main class="page-content">
      <div class="breadcrumb-area">
        <h1>User Management</h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><a href="/users">Home</a></li>
            <li class="breadcrumb-item active">User Management</li>
          </ol>
        </nav>
      </div>

      <div class="glass-card p-0">
        <div class="d-flex align-items-center justify-content-between p-3" style="border-bottom: 1px solid var(--glass-border);">
          <div style="font-size:15px;font-weight:600;color:var(--text-primary);">
            <i class="fa fa-users me-2" style="color:var(--accent-cyan)"></i>Users
            <span style="font-size:12px;color:var(--text-muted);margin-left:8px;">(<%= semua.length %> total)</span>
          </div>
          <button class="btn-glass btn-glass-primary" data-bs-toggle="modal" data-bs-target="#addUserModal">
            <i class="fa fa-plus"></i> Add User
          </button>
        </div>
        <div class="table-responsive">
          <table class="glass-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Username</th>
                <th class="text-center">Card</th>
                <th class="text-center">MAC</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <% for(let i = 0; i < semua.length; i++) { const u = semua[i]; %>
              <tr>
                <td style="color:var(--text-muted)"><%= i + 1 %></td>
                <td style="font-weight:500"><%= u.name %></td>
                <td><code style="color:var(--accent-cyan);background:var(--accent-cyan-dim);padding:2px 6px;border-radius:4px;font-size:12px;"><%= u.username %></code></td>
                <td class="text-center">
                  <% if(u.card && u.card !== '-' && u.card !== 'Not Registered') { %>
                    <span class="badge-registered">Registered</span>
                  <% } else { %>
                    <span class="badge-not-registered">Not Registered</span>
                  <% } %>
                </td>
                <td class="text-center">
                  <% if(u.mac && u.mac !== '-' && u.mac !== 'Not Registered') { %>
                    <span class="badge-registered">Registered</span>
                  <% } else { %>
                    <span class="badge-not-registered">Not Registered</span>
                  <% } %>
                </td>
                <td class="text-center">
                  <button class="btn-glass" data-bs-toggle="modal" data-bs-target="#detailModal<%= u._id %>" title="Detail">
                    <i class="fa fa-eye"></i>
                  </button>
                  <form action="/user-management/delete/<%= u._id %>" method="POST" style="display:inline;"
                        onsubmit="return confirm('Delete user <%= u.username %>?')">
                    <button type="submit" class="btn-glass btn-glass-danger" title="Delete">
                      <i class="fa fa-trash"></i>
                    </button>
                  </form>
                </td>
              </tr>

              <!-- Detail Modal -->
              <div class="modal fade modal-glass" id="detailModal<%= u._id %>" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-sm">
                  <div class="modal-content">
                    <div class="modal-header">
                      <h5 class="modal-title">User Detail</h5>
                      <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                      <div class="mb-2">
                        <span class="form-label-glass d-block">Username</span>
                        <code style="color:var(--accent-cyan)"><%= u.username %></code>
                      </div>
                      <div class="mb-2">
                        <span class="form-label-glass d-block">Name</span>
                        <span style="color:var(--text-primary)"><%= u.name %></span>
                      </div>
                      <div class="mb-2">
                        <span class="form-label-glass d-block">Card Key</span>
                        <span class="<%= (u.card && u.card !== '-') ? 'badge-registered' : 'badge-not-registered' %>">
                          <%= (u.card && u.card !== '-') ? 'Registered' : 'Not Registered' %>
                        </span>
                      </div>
                      <div class="mb-2">
                        <span class="form-label-glass d-block">MAC Address</span>
                        <span class="<%= (u.mac && u.mac !== '-') ? 'badge-registered' : 'badge-not-registered' %>">
                          <%= (u.mac && u.mac !== '-') ? 'Registered' : 'Not Registered' %>
                        </span>
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button type="button" class="btn-glass" data-bs-dismiss="modal">Close</button>
                    </div>
                  </div>
                </div>
              </div>
              <% } %>
            </tbody>
          </table>
        </div>
      </div>
    </main>
    <% include partials/footer %>
  </div>
</div>

<!-- Add User Modal -->
<div class="modal fade modal-glass" id="addUserModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title"><i class="fa fa-user-plus me-2" style="color:var(--accent-cyan)"></i>Add New User</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <form action="/user-management/create" method="POST">
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label-glass">Full Name</label>
            <input type="text" name="name" class="form-control-glass" placeholder="John Doe" required>
          </div>
          <div class="mb-3">
            <label class="form-label-glass">Username</label>
            <input type="text" name="username" class="form-control-glass" placeholder="johndoe" required>
          </div>
          <div class="mb-3">
            <label class="form-label-glass">Password</label>
            <input type="password" name="password" class="form-control-glass" placeholder="Password" required>
          </div>
          <div class="mb-3">
            <label class="form-label-glass">Role</label>
            <div style="display:flex;gap:16px;margin-top:6px;">
              <label style="color:var(--text-dim);font-size:13px;cursor:pointer;">
                <input type="radio" name="superuser" value="true" style="accent-color:var(--accent-cyan);margin-right:6px;">
                Superuser
              </label>
              <label style="color:var(--text-dim);font-size:13px;cursor:pointer;">
                <input type="radio" name="superuser" value="false" checked style="accent-color:var(--accent-cyan);margin-right:6px;">
                User
              </label>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label-glass">Card Key (Optional)</label>
            <input type="text" name="cardkey" class="form-control-glass" placeholder="RFID card key">
          </div>
          <div class="mb-3">
            <label class="form-label-glass">MAC Address (Optional)</label>
            <input type="text" name="mac" class="form-control-glass" placeholder="AA:BB:CC:DD:EE:FF">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-glass" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="btn-glass btn-glass-primary">
            <i class="fa fa-save me-1"></i>Save User
          </button>
        </div>
      </form>
    </div>
  </div>
</div>

<% include partials/script %>
</body>
</html>
```

**Step: Test user management**

Navigate to `/user-management`. Verify:
- Table renders with correct styling
- Add User modal opens and form submits
- Delete button shows confirmation dialog, then redirects back

**Step: Commit**

```bash
git add views/user-management.ejs
git commit -m "feat: redesign user management, wire delete button, fix Bootstrap 5 modals"
```

---

## Task 12: Final Verification

**Step 1: Full smoke test**

```bash
node bin/www
```

Visit each page and verify it renders:
- `http://localhost:3000/` → Login page (dark glass card)
- Login with valid credentials → Dashboard with metric cards + charts
- `/sensors` → Sensor cards with live bars
- `/controls` → 4 device toggle switch cards
- `/user-management` → User table with Add + Delete

**Step 2: Check security headers**

```bash
curl -I http://localhost:3000/
```

Expected: Response includes `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection` (helmet adds these).

**Step 3: Check no hardcoded secrets in source**

```bash
grep -r "work hard" app.js routes/
grep -r "103.115.164.134" app.js routes/ views/
grep -r "stmiot-tech.xyz" views/
```

Expected: No matches.

**Step 4: Check no global variable leaks**

```bash
grep -rn "^var " routes/api.js routes/login.js
grep -rn "^limit = " routes/
```

Expected: No matches (all variables now use `const`/`let`).

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete dark glassmorphism revamp with Bootstrap 5 and security hardening"
```

---

## Summary of All Changes

| File | Change |
|---|---|
| `app.js` | dotenv, helmet, rate limiting, env vars |
| `middleware/auth.js` | New: shared auth guard |
| `routes/login.js` | Fix undefined callback, fix logout, async/await, validation |
| `routes/users.js` | Use auth middleware |
| `routes/sensors.js` | Use auth middleware |
| `routes/control.js` | Use auth middleware |
| `routes/user-management.js` | Auth middleware, delete endpoint, async/await |
| `routes/api.js` | Fix global vars, async/await, remove debug logs |
| `public/css/theme.css` | New: full dark glassmorphism design system |
| `public/css/bootstrap.min.css` | Upgraded to Bootstrap 5 |
| `public/js/bootstrap.bundle.min.js` | New: Bootstrap 5 bundle (includes Popper) |
| `views/partials/head.ejs` | Bootstrap 5, Inter font, FA6, theme.css |
| `views/partials/script.ejs` | Bootstrap 5 bundle, sidebar toggle |
| `views/partials/header.ejs` | New glassmorphism topbar |
| `views/partials/sidebar.ejs` | New dark sidebar with active states |
| `views/partials/footer.ejs` | Minimal footer |
| `views/index.ejs` | Glass login card |
| `views/admin_create.ejs` | Glass admin setup card |
| `views/home.ejs` | Metric cards + dark charts + dedup AJAX |
| `views/sensor.ejs` | Glass sensor cards with live bars |
| `views/controls.ejs` | Toggle switch device cards, no hardcoded URL |
| `views/user-management.ejs` | Glass table, wired delete, BS5 modals |
| `.env` | New: local env vars (not committed) |
| `.env.example` | New: template committed |
| `.gitignore` | Add `.env` |

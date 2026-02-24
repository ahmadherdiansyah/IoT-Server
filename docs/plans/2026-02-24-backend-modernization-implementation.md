# Backend Modernization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the backend into a clean MVC pattern (Routes → Controllers → Services → Models) while eliminating all `var`, callbacks, and bad patterns.

**Architecture:** Services hold business logic (user CRUD, MQTT client). Controllers handle HTTP request/response and call services. Routes are thin wrappers that only define paths and middleware composition. A centralized error handler replaces the inline one in app.js.

**Tech Stack:** Express.js, EJS, Mongoose 8, MQTT (mqtt npm package), bcryptjs, express-validator

---

## Context

Project root: `/Users/ahmadherdiansyah/work/personal/IoT-Server`

**Current problems being fixed:**
- `models/user.js` — `var`, callback-based `authenticate` static (forces callers to wrap in `new Promise`), `bcrypt.hash(pwd, null, null, cb)` wrong API, pre-save never checks `isModified`
- `models/mqtt_data.js` — `var`, no timestamps
- `routes/mqttapi.js` — `var`, callbacks, MQTT host hardcoded, JSON built by string concat (fragile), `/subscibe` typo, dead `GET /` route, duplicate GET+POST logic
- `routes/cctv.js` — `var`, callbacks, not using `requireAuth` middleware
- `routes/user-management.js` — `require('mongoose')` inside a handler function
- `routes/api.js` — response format uses arrays `[{Pesan: 'sukses'}]` instead of objects
- No centralized error handler

**No test suite exists** — verification steps use `node -e "require('./app')"` to confirm the app loads, plus code review for correctness.

---

### Task 1: Modernize `models/user.js`

**Files:**
- Modify: `models/user.js`

**What to do:** Replace `var` with `const`, convert `authenticate` static from callback-based to `async`, fix bcrypt usage, add `isModified` guard to pre-save hook.

**Step 1: Replace entire file contents**

```js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  is_superuser: {
    type: Boolean,
    required: true,
  },
  card: {
    type: String,
    index: true,
  },
  mac: {
    type: String,
    index: true,
  },
});

// async static — callers can await directly, no Promise wrapping needed
UserSchema.statics.authenticate = async function (username, password) {
  const user = await this.findOne({ username });
  if (!user) return null;
  const match = await bcrypt.compare(password, user.password);
  return match ? user : null;
};

// only hash when password field actually changed
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

const User = mongoose.model('Mqtt_user', UserSchema);
module.exports = User;
```

**Step 2: Verify the file loads**

```bash
node -e "require('./models/user'); console.log('OK')"
```

Expected output: `OK`

**Step 3: Commit**

```bash
git add models/user.js
git commit -m "refactor: modernize User model — async authenticate, fix bcrypt, isModified guard"
```

---

### Task 2: Modernize `models/mqtt_data.js`

**Files:**
- Modify: `models/mqtt_data.js`

**What to do:** Replace `var` with `const`, add `{ timestamps: true }` to schema so records get `createdAt`/`updatedAt` automatically.

**Step 1: Replace entire file contents**

```js
const mongoose = require('mongoose');

const MqttSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
  },
  qos: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
}, { timestamps: true });

const MqttData = mongoose.model('Mqtt_data', MqttSchema);
module.exports = MqttData;
```

**Step 2: Verify the file loads**

```bash
node -e "require('./models/mqtt_data'); console.log('OK')"
```

Expected output: `OK`

**Step 3: Commit**

```bash
git add models/mqtt_data.js
git commit -m "refactor: modernize MqttData model — const, add timestamps"
```

---

### Task 3: Create `services/userService.js`

**Files:**
- Create: `services/userService.js`

**What to do:** Create the `services/` directory and a `userService.js` that wraps all User model operations. Controllers will call this instead of touching the model directly.

**Step 1: Create the directory and file**

```js
// services/userService.js
const User = require('../models/user');

async function authenticate(username, password) {
  return User.authenticate(username, password);
}

async function findById(id) {
  return User.findById(id);
}

async function findAll() {
  return User.find({});
}

async function create(data) {
  return User.create(data);
}

async function deleteById(id) {
  return User.findByIdAndDelete(id);
}

module.exports = { authenticate, findById, findAll, create, deleteById };
```

**Step 2: Verify the file loads**

```bash
node -e "require('./services/userService'); console.log('OK')"
```

Expected output: `OK`

**Step 3: Commit**

```bash
git add services/userService.js
git commit -m "feat: add userService — wraps User model operations"
```

---

### Task 4: Create `services/mqttService.js`

**Files:**
- Create: `services/mqttService.js`
- Modify: `.env.example` (add MQTT_HOST line)

**What to do:** Create an MQTT singleton service. The MQTT client connects once at module load using `process.env.MQTT_HOST`. Provides a `publish(topic, payload)` method that uses `JSON.stringify` — no more string concatenation. Also provide `publishRaw(topic, str)` for the IoT device endpoint that sends raw JSON fragments in the `pesan` field (backwards compatibility, cannot change the wire format without breaking firmware).

**Step 1: Create `services/mqttService.js`**

```js
// services/mqttService.js
const mqtt = require('mqtt');

const host = process.env.MQTT_HOST;
if (!host) {
  throw new Error('MQTT_HOST environment variable is required.');
}

const client = mqtt.connect({ port: 1883, host, keepalive: 60 });

client.on('connect', () => console.log('MQTT connected'));
client.on('error', (err) => console.error('MQTT error:', err.message));
client.on('reconnect', () => console.log('MQTT reconnecting...'));

/**
 * Publish a JSON-serializable payload to a topic.
 */
function publish(topic, payload) {
  return publishRaw(topic, JSON.stringify(payload));
}

/**
 * Publish a raw string payload. Used for IoT device endpoints
 * that send pre-formed JSON fragments (backwards compatibility).
 */
function publishRaw(topic, payloadStr) {
  return new Promise((resolve, reject) => {
    client.publish(topic, payloadStr, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = { client, publish, publishRaw };
```

**Step 2: Add MQTT_HOST to `.env.example`**

Current contents of `.env.example`:
```
MONGO_URI=mongodb://localhost:27017/mqtt
SESSION_SECRET=your-strong-secret-here
PORT=3000
```

Replace with:
```
MONGO_URI=mongodb://localhost:27017/mqtt
SESSION_SECRET=your-strong-secret-here
MQTT_HOST=mqtt.example.com
PORT=3000
```

**Step 3: Verify the file is syntactically correct** (skip actual connect — requires env vars)

```bash
node --check services/mqttService.js && echo "Syntax OK"
```

Expected output: `Syntax OK`

**Step 4: Commit**

```bash
git add services/mqttService.js .env.example
git commit -m "feat: add mqttService — singleton client, env-var host, JSON.stringify publish"
```

---

### Task 5: Create `controllers/authController.js`

**Files:**
- Create: `controllers/authController.js`

**What to do:** Create the `controllers/` directory and extract the handler functions from `routes/login.js` into `authController.js`. The route file will be thinned in Task 9.

**Step 1: Create `controllers/authController.js`**

```js
// controllers/authController.js
const { validationResult } = require('express-validator');
const User = require('../models/user');
const userService = require('../services/userService');

async function showLogin(req, res, next) {
  try {
    const admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      return res.render('admin_create', { title: 'Admin Setup', data: 'clean' });
    }
    res.render('index', { title: 'Login', data: 'clean' });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('index', { title: 'Login', data: errors.array()[0].msg });
  }
  try {
    const user = await userService.authenticate(req.body.username, req.body.password);
    if (!user) {
      return res.render('index', { title: 'Login', data: 'Username atau password salah!' });
    }
    req.session.userId = user._id;
    return res.redirect('/users');
  } catch (err) {
    next(err);
  }
}

function logout(req, res, next) {
  if (!req.session) return res.redirect('/');
  req.session.destroy((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
}

async function createAdmin(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('admin_create', { title: 'Admin Setup', data: errors.array()[0].msg });
  }
  try {
    const user = await userService.create({
      name: req.body.name || req.body.username,
      username: req.body.username,
      password: req.body.password,
      card: req.body.cardkey || '-',
      mac: req.body.mac || '-',
      is_superuser: true,
    });
    req.session.userId = user._id;
    return res.redirect('/users');
  } catch (err) {
    res.render('admin_create', { title: 'Admin Setup', data: err.message });
  }
}

module.exports = { showLogin, login, logout, createAdmin };
```

**Step 2: Verify the file loads**

```bash
node -e "require('./controllers/authController'); console.log('OK')"
```

Expected output: `OK`

**Step 3: Commit**

```bash
git add controllers/authController.js
git commit -m "feat: add authController — extracted from routes/login.js"
```

---

### Task 6: Create `controllers/apiController.js`

**Files:**
- Create: `controllers/apiController.js`

**What to do:** Extract handlers from `routes/api.js`. Fix response format: replace array responses `[{Pesan:'...'}]` with proper objects `{ message, error, data }` and correct HTTP status codes. Unify the GET/POST `/data` handlers into one function.

**Step 1: Create `controllers/apiController.js`**

```js
// controllers/apiController.js
const MqttData = require('../models/mqtt_data');
const userService = require('../services/userService');

function info(req, res) {
  res.json({
    title: 'Smart Home API',
    copyright: 'Ahmad Herdiansyah',
    endpoints: {
      data: 'POST /api/data { topic, limit }',
      login: 'POST /api/login { username, password }',
    },
  });
}

async function getData(req, res, next) {
  try {
    const params = req.method === 'GET' ? req.query : req.body;
    const { topic } = params;
    const limit = parseInt(params.limit) || 10;

    if (!topic) return res.json({ data: [] });

    const results = await MqttData.find({ topic })
      .limit(limit)
      .sort({ timestamp: -1 });

    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  try {
    const user = await userService.authenticate(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ message: 'success' });
  } catch (err) {
    next(err);
  }
}

module.exports = { info, getData, login };
```

**Step 2: Verify the file loads**

```bash
node -e "require('./controllers/apiController'); console.log('OK')"
```

Expected output: `OK`

**Step 3: Commit**

```bash
git add controllers/apiController.js
git commit -m "feat: add apiController — unified GET/POST data handler, clean response format"
```

---

### Task 7: Create `controllers/mqttController.js`

**Files:**
- Create: `controllers/mqttController.js`

**What to do:** Extract handlers from `routes/mqttapi.js`. Unify the duplicate GET+POST publish logic into one handler. Use `mqttService.publishRaw` to preserve the IoT device wire format (the `pesan` field is a raw JSON fragment — changing this would break existing device firmware). Use `JSON.stringify` for the string values we control (event name, mac) so they're properly escaped. Fix the `/subscribe` typo.

**Step 1: Create `controllers/mqttController.js`**

```js
// controllers/mqttController.js
const mqttService = require('../services/mqttService');

// Unified handler for both GET and POST /publish
// pesan is a raw JSON fragment (e.g. '"state":"on","pin":12') for IoT device
// backwards compatibility — do not change this wire format
async function publish(req, res, next) {
  const params = req.method === 'GET' ? req.query : req.body;
  const { topic, event, pesan, mac } = params;

  if (!topic || !event || !pesan || !mac) {
    return res.status(400).json({ error: 'All attributes required: topic, event, pesan, mac' });
  }

  try {
    // Use JSON.stringify for string values we control to prevent injection
    const payloadStr = `{"eventName":${JSON.stringify(event)},${pesan},"mac":${JSON.stringify(mac)}}`;
    await mqttService.publishRaw(topic, payloadStr);
    res.json({ status: 'success', topic });
  } catch (err) {
    next(err);
  }
}

async function subscribe(req, res, next) {
  const { topic, authtoken, pesan } = req.body;

  if (!topic || !authtoken) {
    return res.status(400).json({ error: 'topic and authtoken required' });
  }

  try {
    await mqttService.publishRaw(topic, pesan || '');
    res.json({ status: 'success', topic });
  } catch (err) {
    next(err);
  }
}

module.exports = { publish, subscribe };
```

**Step 2: Verify the file loads**

```bash
node -e "require('./controllers/mqttController'); console.log('OK')"
```

Expected output: `OK`

**Step 3: Commit**

```bash
git add controllers/mqttController.js
git commit -m "feat: add mqttController — unified publish handler, fix subscribe typo"
```

---

### Task 8: Create `controllers/userManagementController.js`

**Files:**
- Create: `controllers/userManagementController.js`

**What to do:** Extract handlers from `routes/user-management.js`. Move the `require('mongoose')` call to the top of the file (not inside a handler function).

**Step 1: Create `controllers/userManagementController.js`**

```js
// controllers/userManagementController.js
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const userService = require('../services/userService');

async function index(req, res, next) {
  try {
    const users = await userService.findAll();
    res.render('user-management', { data: req.user, semua: users });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.redirect('/user-management');
  }
  try {
    await userService.create({
      name: req.body.name,
      username: req.body.username,
      password: req.body.password,
      is_superuser: req.body.superuser === 'true',
      card: req.body.cardkey || '-',
      mac: req.body.mac || '-',
    });
    res.redirect('/user-management');
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.redirect('/user-management');
    }
    if (req.params.id === req.user._id.toString()) {
      return res.redirect('/user-management');
    }
    await userService.deleteById(req.params.id);
    res.redirect('/user-management');
  } catch (err) {
    next(err);
  }
}

module.exports = { index, create, deleteUser };
```

**Step 2: Verify the file loads**

```bash
node -e "require('./controllers/userManagementController'); console.log('OK')"
```

Expected output: `OK`

**Step 3: Commit**

```bash
git add controllers/userManagementController.js
git commit -m "feat: add userManagementController — extracted from routes/user-management.js"
```

---

### Task 9: Thin out `routes/login.js`

**Files:**
- Modify: `routes/login.js`

**What to do:** Replace all handler logic with calls to `authController`. The route file should only contain: imports, validator arrays, and `router.METHOD(path, ...middleware, handler)` lines.

**Step 1: Replace entire file contents**

```js
// routes/login.js
const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');

const router = express.Router();

const loginValidators = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const createValidators = [
  body('username').trim().notEmpty(),
  body('password').notEmpty(),
];

router.get('/', authController.showLogin);
router.post('/', loginValidators, authController.login);
router.get('/logout', authController.logout);
router.post('/create', createValidators, authController.createAdmin);

module.exports = router;
```

**Step 2: Verify the app still loads**

```bash
node -e "require('./app'); console.log('OK')" 2>&1 | grep -E "OK|Error|throw"
```

Expected: line containing `OK` (MongoDB/MQTT connection errors are expected and fine)

**Step 3: Commit**

```bash
git add routes/login.js
git commit -m "refactor: thin routes/login.js — delegates to authController"
```

---

### Task 10: Thin out `routes/api.js`

**Files:**
- Modify: `routes/api.js`

**What to do:** Replace all handler logic with calls to `apiController`.

**Step 1: Replace entire file contents**

```js
// routes/api.js
const express = require('express');
const apiController = require('../controllers/apiController');

const router = express.Router();

router.get('/', apiController.info);
router.get('/data', apiController.getData);
router.post('/data', apiController.getData);
router.post('/login', apiController.login);

module.exports = router;
```

**Step 2: Verify the app still loads**

```bash
node -e "require('./app'); console.log('OK')" 2>&1 | grep -E "OK|Error|throw"
```

Expected: line containing `OK`

**Step 3: Commit**

```bash
git add routes/api.js
git commit -m "refactor: thin routes/api.js — delegates to apiController"
```

---

### Task 11: Thin out `routes/mqttapi.js`

**Files:**
- Modify: `routes/mqttapi.js`

**What to do:** Replace all content with thin routing that calls `mqttController`. Remove the dead `GET /` route that was rendering the login page. Remove the hardcoded MQTT client. Fix the `/subscibe` typo to `/subscribe`.

**Step 1: Replace entire file contents**

```js
// routes/mqttapi.js
const express = require('express');
const mqttController = require('../controllers/mqttController');

const router = express.Router();

router.get('/publish', mqttController.publish);
router.post('/publish', mqttController.publish);
router.post('/subscribe', mqttController.subscribe);

module.exports = router;
```

**Step 2: Verify the app still loads**

```bash
node -e "require('./app'); console.log('OK')" 2>&1 | grep -E "OK|Error|throw"
```

Expected: line containing `OK`

**Step 3: Commit**

```bash
git add routes/mqttapi.js
git commit -m "refactor: thin routes/mqttapi.js — delegates to mqttController, fix subscribe typo, remove dead route"
```

---

### Task 12: Thin out `routes/user-management.js`

**Files:**
- Modify: `routes/user-management.js`

**What to do:** Replace all handler logic with calls to `userManagementController`. Remove the `require('mongoose')` that was inside a handler function.

**Step 1: Replace entire file contents**

```js
// routes/user-management.js
const express = require('express');
const { body } = require('express-validator');
const requireAuth = require('../middleware/auth');
const userManagementController = require('../controllers/userManagementController');

const router = express.Router();

const createUserValidators = [
  body('username').trim().notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required'),
  body('name').trim().notEmpty().withMessage('Name required'),
];

router.get('/', requireAuth, userManagementController.index);
router.post('/create', requireAuth, createUserValidators, userManagementController.create);
router.post('/delete/:id', requireAuth, userManagementController.deleteUser);

module.exports = router;
```

**Step 2: Verify the app still loads**

```bash
node -e "require('./app'); console.log('OK')" 2>&1 | grep -E "OK|Error|throw"
```

Expected: line containing `OK`

**Step 3: Commit**

```bash
git add routes/user-management.js
git commit -m "refactor: thin routes/user-management.js — delegates to userManagementController"
```

---

### Task 13: Fix `routes/cctv.js`

**Files:**
- Modify: `routes/cctv.js`

**What to do:** Replace the old callback-based auth check with `requireAuth` middleware. Remove all `var`. This route is too simple to need a controller.

**Step 1: Replace entire file contents**

```js
// routes/cctv.js
const express = require('express');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  res.render('cctv', { data: req.user });
});

module.exports = router;
```

**Step 2: Verify the app still loads**

```bash
node -e "require('./app'); console.log('OK')" 2>&1 | grep -E "OK|Error|throw"
```

Expected: line containing `OK`

**Step 3: Commit**

```bash
git add routes/cctv.js
git commit -m "fix: cctv route — use requireAuth middleware, remove var and callbacks"
```

---

### Task 14: Create `middleware/errorHandler.js`

**Files:**
- Create: `middleware/errorHandler.js`

**What to do:** Extract the inline error handler from `app.js` into a dedicated middleware file. API routes (`/api/*`) get JSON error responses. Browser routes get the rendered `error` view. In development, stack traces are included.

**Step 1: Create `middleware/errorHandler.js`**

```js
// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const isDev = req.app.get('env') === 'development';

  if (req.path.startsWith('/api')) {
    return res.status(status).json({
      error: err.message,
      ...(isDev && { stack: err.stack }),
    });
  }

  res.locals.message = err.message;
  res.locals.error = isDev ? err : {};
  res.status(status);
  res.render('error');
}

module.exports = errorHandler;
```

**Step 2: Verify the file loads**

```bash
node -e "require('./middleware/errorHandler'); console.log('OK')"
```

Expected output: `OK`

**Step 3: Commit**

```bash
git add middleware/errorHandler.js
git commit -m "feat: add centralized errorHandler middleware"
```

---

### Task 15: Update `app.js`

**Files:**
- Modify: `app.js`

**What to do:** Replace the inline error handler with `errorHandler` from `middleware/errorHandler.js`. Add `MQTT_HOST` startup guard (consistent with existing SESSION_SECRET and MONGO_URI guards). Remove the now-unused `createError` import from the 404 handler — keep the 404 handler using `createError` which IS still needed.

**Step 1: Replace entire file contents**

```js
require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const proxy = require('express-http-proxy');
const errorHandler = require('./middleware/errorHandler');

const usersRouter = require('./routes/users');
const apiRouter = require('./routes/api');
const mqttapi = require('./routes/mqttapi');
const login = require('./routes/login');
const sensors = require('./routes/sensors');
const controls = require('./routes/control');
const cctv = require('./routes/cctv');
const userManagement = require('./routes/user-management');

const app = express();

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required. Copy .env.example to .env and set a value.');
}

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI environment variable is required.');
}

if (!process.env.MQTT_HOST) {
  throw new Error('MQTT_HOST environment variable is required.');
}

mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('MongoDB connected'));

app.use(helmet({ contentSecurityPolicy: false }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { httpOnly: true, sameSite: 'lax' },
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts, please try again later.',
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', loginLimiter, login);
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
app.use(errorHandler);

module.exports = app;
```

**Step 2: Verify the full app loads**

```bash
node -e "require('./app'); console.log('OK')" 2>&1 | grep -E "OK|Error|throw"
```

Expected: line containing `OK` (MongoDB and MQTT connection errors are expected — remote servers not reachable from localhost)

**Step 3: Commit**

```bash
git add app.js
git commit -m "refactor: use errorHandler middleware, add MQTT_HOST startup guard"
```

---

### Task 16: Final Verification

**Files:** (none modified — read-only audit)

**What to do:** Confirm all success criteria from the design doc are met.

**Step 1: Check no `var` remains in modernized files**

```bash
grep -rn "^var \|[^a-z]var " models/ services/ controllers/ middleware/ routes/ app.js
```

Expected: no output (zero matches)

**Step 2: Check no callback-style `.exec(function` remains**

```bash
grep -rn "\.exec(function" models/ services/ controllers/ routes/
```

Expected: no output

**Step 3: Check no `new Promise` wrappers remain (User.authenticate callers)**

```bash
grep -rn "new Promise" routes/ controllers/ services/
```

Expected: no output (only mqttService has `new Promise` for the MQTT publish callback — that's fine, it's wrapping a non-promisified library call)

**Step 4: Confirm MQTT_HOST used in service (not hardcoded)**

```bash
grep -rn "mqtt.flexiot\|mqtt.connect" routes/ controllers/
```

Expected: no output (MQTT connect only in `services/mqttService.js`)

**Step 5: Confirm `/subscibe` typo is gone**

```bash
grep -rn "subscibe" routes/ controllers/
```

Expected: no output

**Step 6: Full app load check**

```bash
node -e "require('./app'); console.log('APP LOAD OK')" 2>&1 | grep -E "APP LOAD OK|throw new Error"
```

Expected: `APP LOAD OK`

**Step 7: Commit final verification note**

```bash
git commit --allow-empty -m "chore: backend MVC restructure complete — all verification checks passed"
```

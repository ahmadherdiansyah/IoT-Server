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
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
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

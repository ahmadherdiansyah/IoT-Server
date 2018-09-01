var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var session = require('express-session');
var hidePoweredBy = require('hide-powered-by')
var MongoStore = require('connect-mongo')(session);
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var apiRoouter = require('./routes/api');
var mqttapi = require('./routes/mqttapi');
var login = require('./routes/login');
var sensors = require('./routes/sensors'); 
var controls = require('./routes/control');
var cctv = require('./routes/cctv'); 
var proxy = require('express-http-proxy');
var app = express();
// { useNewUrlParser: true }
mongoose.connect('mongodb://localhost:27017/mqtt');
mongoose.set('debug', true);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log("we're connected!");
});
app.use(session({
  secret: 'work hard',
  resave: true,
  saveUninitialized: false,
  store: new MongoStore({
    mongooseConnection: db
  })
}));
app.use(hidePoweredBy({ setTo: 'X-Force' }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'node_modules/bootstrap')));
app.use(express.static(path.join(__dirname, 'node_modules/jquery')));
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api',apiRoouter);
app.use('/api/mqtt',mqttapi);
app.use('/login',login);
app.use('/sensors',sensors);
app.use('/controls',controls);
app.use('/cctv',cctv);
app.use('/cctv/api', proxy('http://192.168.46.3:8080'));
app.use(function(req, res, next) {
  next(createError(404));
});
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});
module.exports = app;

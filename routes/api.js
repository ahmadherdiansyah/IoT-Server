var express = require('express');
var router = express.Router();
var mqtt = require('mqtt')
var User = require('../models/user');
var data = require('../models/mqtt_data');
var respon;
var client = mqtt.connect({ port: 1883, host: 'localhost', keepalive: 10000})
/* GET home page. */
router.get('/', function(req, res, next) {
  res.json([{
    "title": "Selamat datang",
    "copyright": "Ahmad Herdiansyah",
    "port penting":{
      "mqtt" : "1883",
      "mqtt web socket": "8083"
    },
    "Penggunaan" :{
      'mqtt':{
        "publish": "/api/mqtt/publish/<device>/<pesan>",
        "cari data": "/api/mqtt/cari/<device>"
      },
      'Login':{
        'Login' : "/api/login/username/password",
        'renew token' : "/api/login/renew/username/password"
      }
    }
  }]);
});
router.post("/data",function (req,res,next) {
  limit = parseInt(req.body.limit);
  var q = data.find({topic : req.body.topic}).limit(limit).sort({'timestamp': -1});
   q.exec(function(err, users) {
      res.send(users);
  });
});
router.post("/login",function (req,res,next) {
 if (req.body.username && req.body.password) {
    var userData = {
      username: req.body.username,
      password: req.body.password
    }
    User.findOne({ username: req.body.username })
    .exec(function (err, user) {
      if (err) {
        return callback(err)
      } else if (!user) {
        res.json([{
      "Pesan": "Username atau password salah"
      }]);
      }else if (user) {
        User.authenticate(req.body.username, req.body.password, function (error, user) {
            if (error || !user) {
              res.json([{
              "Pesan": "Username atau password salah"
              }]);
            } else {
              res.json([{
                "Pesan": "sukses"
              }]);
            }
          });  
      }
    });
  } else {
    var err = new Error('All fields required.');
    err.status = 400;
    return next(err);
  }
});
router.get("/login",function (req,res,next) {
 if (req.body.username && req.body.password) {
    var userData = {
      username: req.body.username,
      password: req.body.password
    }
    User.findOne({ username: req.body.username })
    .exec(function (err, user) {
      if (err) {
        return callback(err)
      } else if (!user) {
        res.json([{
      "Pesan": "Username atau password salah"
      }]);
      }else if (user) {
        User.authenticate(req.body.username, req.body.password, function (error, user) {
            if (error || !user) {
              res.json([{
              "Pesan": "Username atau password salah"
              }]);
            } else {
              res.json([{
                "Pesan": "sukses"
              }]);
            }
          });  
      }
    });
  } else {
    var err = new Error('All fields required.');
    err.status = 400;
    return next(err);
  }
});
router.get("/data",function (req,res,next) {
  console.log(req.query.topic)
  var topic = req.query.topic;
  limit = parseInt(req.query.limit);
  var q = data.find({topic : topic}).limit(limit).sort({'timestamp': -1});
   q.exec(function(err, users) {
      res.send(users);
  });
});
router.get('/mqtt',function(req,res,next) {
  res.json([{
    "title": "Selamat datang",
    "copyright": "Ahmad Herdiansyah",
    "Penggunaan" :{
      'mqtt':{
        "publish": "/api/mqtt/publish/<device>/<pesan>",
        "cari data": "/api/mqtt/cari/<device>"
      }
    }
  }]);
});

router.post('/webhook', (req, res) => {
  console.log(req.body);
  console.log("Alat :",req.body.queryResult.parameters.alat);
  console.log("Nomor :",req.body.queryResult.parameters.nomor);
  console.log("Aksi :",req.body.queryResult.parameters.aksi);
  alat = req.body.queryResult.parameters.alat;
  nomor = req.body.queryResult.parameters.nomor;
  aksi = req.body.queryResult.parameters.aksi;
  client.subscribe('/status')
  client.on('message', function (topic, message) {
    //respon = message.toString();
  })
  if (alat == "lampu") {
    if (aksi == "mati") {
      client.publish('/controls', 'OFF'+nomor);
      respon = alat +" " + nomor + " sudah "+ aksi;
      ga(respon);
    }
    if (aksi == "nyala") {
      client.publish('/controls', 'ON'+nomor);
      respon = alat +" " + nomor + " sudah "+ aksi;
      ga(respon);
    } 
  }
  if (req.body.queryResult.queryText == "status") {
    var q = data.find({topic : '/sensor/suhu'}).limit(1).sort({'timestamp': -1});
        q.exec(function(err, users) {
          var suhu = users;
          respon = "suhu saat ini " + suhu[0].message + "°C";
          ga(respon);
        });
  }
  function ga(respon) {
    res.status(200).json({
      fulfillmentText : "This is a text response",
      //fulfillmentMessages: [],
      source: "example.com",
      payload: {
        google: {
          expectUserResponse: true,
          richResponse: {
            items: [
              {
                simpleResponse: {
                  textToSpeech: respon
                }
              }
            ]
          }
        }
      }  
      });
  }
  //console.log(respon);
});
module.exports = router;

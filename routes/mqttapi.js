var express = require('express');
var router = express.Router();
var mqtt = require('mqtt');
var client = mqtt.connect({ port: 1883, host: 'mqtt.flexiot.xl.co.id', keepalive: 10000})
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
router.post('/publish',function(req,res,next) {
  if (req.body.topic && req.body.pesan) {
    client.publish(req.body.topic, req.body.pesan,function (err){
      if (err) {
        res.send(err);
      }
      else{
        res.json([{
          "status": "sukses",
          "topic": req.body.topic,
          "pesan": req.body.pesan
        }]);
      }
    }); 
  }else{
    res.status(400);
    res.json([{
      "status": "Errors 400",
      "pesan": "Semua atribut harus di isi"
    }]);
  }
});
router.get('/publish',function(req,res,next) {
  var top = req.query.topic ;
  var event = req.query.event;
  var pesan = req.query.pesan;
  var mac = req.query.mac;
  if (top && event && pesan && mac ) {
    var all = "{\"eventName\":\""+event+"\","+pesan+",\"mac\":\""+mac+"\"}";
    client.publish(top, all,function (err){
      if (err) {
        res.send(err);
      }
      else{
        res.json([{
          "status": "sukses",
          "topic": req.body.topic,
          "pesan": req.body.pesan
        }]);
      }
    }); 
  }else{
    res.status(400);
    res.json([{
      "status": "Errors 400",
      "pesan": "Semua atribut harus di isi"
    }]);
  }
});
router.post('/subscibe',function(req,res,next) {
  if (req.body.topic && req.body.authtoken) {
    client.publish(req.body.topic, req.body.pesan,function (err){
      if (err) {
        res.send(err);
      }
      else{
        res.json([{
          "status": "sukses",
          "topic": req.body.topic,
          "pesan": req.body.pesan
        }]);
      }
    }); 
  }else{
    res.status(400);
    res.json([{
      "status": "Errors 400",
      "pesan": "Semua atribut harus di isi"
    }]);
  }
});
module.exports = router;

var express = require('express');
var router = express.Router();
var mqtt = require('mqtt');
var client = mqtt.connect({ port: 1883, host: '192.168.46.3', keepalive: 10000})
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
})

module.exports = router;

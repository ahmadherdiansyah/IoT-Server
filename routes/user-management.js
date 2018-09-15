var express = require('express');
var User = require('../models/user');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  User.findById(req.session.userId)
      .exec(function (error, user) {
        if (error) {
          return next(error);
        } else {
          if (user === null) {
            var err = new Error('Not authorized! Go back!');
            err.status = 400;
            return next(err);
          } else {
            return res.render('user-management',{data : user});
          }
        }
      });
});

router.post('/create', function(req, res, next) {
    var card = "Not Registered";
    var mac = "Not Registered";
    if (req.body.username && req.body.password) {
        if(req.body.cardkey != null){
            card = req.body.cardkey;
        }
        if(req.body.mac != null) {
            mac = req.body.mac;
        }
        var userData = {
        username: req.body.username,
        password: req.body.password,
        is_superuser: req.body.superuser,
        cardkey: card ,
        mac: mac,
    }
        User.create(userData, function (error, user) {
            if (error) {
                //return next(error);
                res.send(error);
            } else {
                req.session.userId = user._id;
                return res.redirect('/users');
            }
        });
    }else {
        var err = new Error('All fields required.');
        err.status = 400;
        return next(err);
    }
});

module.exports = router;

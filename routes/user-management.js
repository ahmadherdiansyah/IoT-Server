var express = require('express');
var User = require('../models/user');
var router = express.Router();
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
    var card;
    var mac;
    if (req.body.username && req.body.password) {
        if(req.body.cardkey != null){
            card = req.body.cardkey;
        } else {
            card = 'Not Registered';
        }
        if(req.body.mac != null) {
            mac = req.body.mac;
        } else {
            mac = 'Not Registered';
        }
        var userData = {
        name: req.body.name,
        username: req.body.username,
        password: req.body.password,
        is_superuser: req.body.superuser,
        card: card,
        mac: mac,
    }
        User.create(userData, function (error, user) {
            if (error) {
                // return next(error);
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

var express = require('express');
var User = require('../models/user');
var router = express.Router();
router.post('/', function(req, res, next) {
  if (req.body.username && req.body.password) {
    var userData = {
      username: req.body.username,
      password: req.body.password,
//      is_superuser: "true",
    }
    User.findOne({ username: req.body.username })
    .exec(function (err, user) {
      if (err) {
        return callback(err)
      } else if (!user) {
          res.render('index',{title : "login",data : "Username atau password salah!"})
        // User.create(userData, function (error, user) {
        //     if (error) {
        //       return next(error);
        //     } else {
        //       req.session.userId = user._id;
        //       return res.redirect('/profile');
        //     }
        //   });
      }else if (user) {
        User.authenticate(req.body.username, req.body.password, function (error, user) {
            if (error || !user) {
              res.render('index',{title : "login",data : "Username atau password salah!"})
            } else {
              req.session.userId = user._id;
              return res.redirect('/users');
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
router.post('/create', function(req, res, next) {
  if (req.body.username && req.body.password) {
    var userData = {
      name: req.body.name,
      username: req.body.username,
      password: req.body.password,
      card: req.body.cardkey,
      mac : req.body.mac,
      is_superuser: "true",
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
router.get('/',function (req,res,next) {
  User.findOne({ username: "admin" })
    .exec(function (err, user) {
    if (!user) {
      res.render('admin_create',{title : "Admin Create",data:"clean"})
    }
    else{
      res.render('index',{title : "login",data : "clean"});
    }
    });
});
router.get('/profile', function (req, res, next) {
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
            return res.send('<h1>Name: </h1>' + user.username + '<h2>Mail: </h2>' + req.session.id + '<br><a type="button" href="/logout">Logout</a>')
          }
        }
      });
  });
  
  // GET for logout logout
  router.get('/logout', function (req, res, next) {
    if (req.session) {
      // delete session object
      User.findByIdAndRemove(req.session.id, function (err) {
        req.session.destroy(function (err) {
            if (err) {
              return next(err);
            } else {
              return res.redirect('/');
            }
          });
      });
    }
  });
module.exports = router;

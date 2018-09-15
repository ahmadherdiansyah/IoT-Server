var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true
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
    index: true
  },
  mac: {
    type: String,
    index: true
  }
});
//authenticate input against database
UserSchema.statics.authenticate = function (username, password, callback) {
  User.findOne({ username: username })
    .exec(function (err, user) {
      if (err) {
        return callback(err)
      } else if (!user) {
        var err = new Error('User not found.');
        err.status = 401;
        return callback(err);
      }
      bcrypt.compare(password, user.password, function (err, result) {
        if (result === true) {
          return callback(null, user);
        } else {
          return callback();
        }
      })
    });
}
//hashing a password before saving it to the database
UserSchema.pre('save', function (next) {
  var user = this;
  bcrypt.hash(user.password, null, null, function (err, hash) {
    if (err) {
    return next(err);
    //res.send(err);
    }
    user.password = hash;
    next();
  })
});


var User = mongoose.model('Mqtt_user', UserSchema);
module.exports = User;


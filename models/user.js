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

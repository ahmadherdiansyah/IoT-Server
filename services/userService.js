// services/userService.js
const User = require('../models/user');

async function authenticate(username, password) {
  return User.authenticate(username, password);
}

async function findById(id) {
  return User.findById(id);
}

async function findAll() {
  return User.find({});
}

async function create(data) {
  return User.create(data);
}

async function deleteById(id) {
  return User.findByIdAndDelete(id);
}

async function findByUsername(username) {
  return User.findOne({ username });
}

module.exports = { authenticate, findById, findAll, findByUsername, create, deleteById };

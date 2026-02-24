// controllers/userManagementController.js
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const userService = require('../services/userService');

async function index(req, res, next) {
  try {
    const users = await userService.findAll();
    res.render('user-management', { data: req.user, semua: users });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.redirect('/user-management');
  }
  try {
    await userService.create({
      name: req.body.name,
      username: req.body.username,
      password: req.body.password,
      is_superuser: req.body.superuser === 'true',
      card: req.body.cardkey || '-',
      mac: req.body.mac || '-',
    });
    res.redirect('/user-management');
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.redirect('/user-management');
    }
    if (req.params.id === req.user._id.toString()) {
      return res.redirect('/user-management');
    }
    await userService.deleteById(req.params.id);
    res.redirect('/user-management');
  } catch (err) {
    next(err);
  }
}

module.exports = { index, create, deleteUser };

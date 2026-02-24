// controllers/authController.js
const { validationResult } = require('express-validator');
const userService = require('../services/userService');

async function showLogin(req, res, next) {
  try {
    const admin = await userService.findByUsername('admin');
    if (!admin) {
      return res.render('admin_create', { title: 'Admin Setup', data: 'clean' });
    }
    res.render('index', { title: 'Login', data: 'clean' });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('index', { title: 'Login', data: errors.array()[0].msg });
  }
  try {
    const user = await userService.authenticate(req.body.username, req.body.password);
    if (!user) {
      return res.render('index', { title: 'Login', data: 'Username atau password salah!' });
    }
    req.session.userId = user._id;
    return res.redirect('/users');
  } catch (err) {
    next(err);
  }
}

function logout(req, res, next) {
  if (!req.session) return res.redirect('/');
  req.session.destroy((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
}

async function createAdmin(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('admin_create', { title: 'Admin Setup', data: errors.array()[0].msg });
  }
  try {
    const user = await userService.create({
      name: req.body.name || req.body.username,
      username: req.body.username,
      password: req.body.password,
      card: req.body.cardkey || '-',
      mac: req.body.mac || '-',
      is_superuser: true,
    });
    req.session.userId = user._id;
    return res.redirect('/users');
  } catch (err) {
    // Show duplicate username error inline; forward other errors to error handler
    if (err.code === 11000) {
      return res.render('admin_create', { title: 'Admin Setup', data: 'Username already exists.' });
    }
    next(err);
  }
}

module.exports = { showLogin, login, logout, createAdmin };

const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');

const router = express.Router();

// Show login or admin create page
router.get('/', async (req, res, next) => {
  try {
    const admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      return res.render('admin_create', { title: 'Admin Setup', data: 'clean' });
    }
    res.render('index', { title: 'Login', data: 'clean' });
  } catch (err) {
    next(err);
  }
});

// Login POST
router.post('/',
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('index', { title: 'Login', data: errors.array()[0].msg });
    }
    try {
      const user = await new Promise((resolve, reject) => {
        User.authenticate(req.body.username, req.body.password, (err, user) => {
          if (err) return reject(err);
          resolve(user);
        });
      });
      if (!user) {
        return res.render('index', { title: 'Login', data: 'Username atau password salah!' });
      }
      req.session.userId = user._id;
      return res.redirect('/users');
    } catch (err) {
      next(err);
    }
  }
);

// Create first admin account
router.post('/create',
  body('username').trim().notEmpty(),
  body('password').notEmpty(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('admin_create', { title: 'Admin Setup', data: errors.array()[0].msg });
    }
    try {
      const userData = {
        name: req.body.name || req.body.username,
        username: req.body.username,
        password: req.body.password,
        card: req.body.cardkey || '-',
        mac: req.body.mac || '-',
        is_superuser: true,
      };
      const user = await User.create(userData);
      req.session.userId = user._id;
      return res.redirect('/users');
    } catch (err) {
      res.render('admin_create', { title: 'Admin Setup', data: err.message });
    }
  }
);

// Logout — destroy session only, do NOT delete the user
router.get('/logout', (req, res, next) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) return next(err);
      return res.redirect('/');
    });
  } else {
    res.redirect('/');
  }
});

module.exports = router;

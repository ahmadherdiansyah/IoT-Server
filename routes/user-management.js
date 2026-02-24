const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const users = await User.find({});
    res.render('user-management', { data: req.user, semua: users });
  } catch (err) {
    next(err);
  }
});

router.post('/create', requireAuth,
  body('username').trim().notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required'),
  body('name').trim().notEmpty().withMessage('Name required'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect('/user-management');
    }
    try {
      const userData = {
        name: req.body.name,
        username: req.body.username,
        password: req.body.password,
        is_superuser: req.body.superuser === 'true',
        card: req.body.cardkey || '-',
        mac: req.body.mac || '-',
      };
      await User.create(userData);
      res.redirect('/user-management');
    } catch (err) {
      next(err);
    }
  }
);

router.post('/delete/:id', requireAuth, async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/user-management');
  } catch (err) {
    next(err);
  }
});

module.exports = router;

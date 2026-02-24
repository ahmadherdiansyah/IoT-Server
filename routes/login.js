// routes/login.js
const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts, please try again later.',
});

const loginValidators = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const createValidators = [
  body('username').trim().notEmpty(),
  body('password').notEmpty(),
];

router.get('/', authController.showLogin);
router.post('/', loginLimiter, loginValidators, authController.login);
router.get('/logout', authController.logout);
router.post('/create', createValidators, authController.createAdmin);

module.exports = router;

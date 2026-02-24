// routes/login.js
const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');

const router = express.Router();

const loginValidators = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const createValidators = [
  body('username').trim().notEmpty(),
  body('password').notEmpty(),
];

router.get('/', authController.showLogin);
router.post('/', loginValidators, authController.login);
router.get('/logout', authController.logout);
router.post('/create', createValidators, authController.createAdmin);

module.exports = router;

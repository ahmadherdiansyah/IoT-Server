// routes/user-management.js
const express = require('express');
const { body } = require('express-validator');
const requireAuth = require('../middleware/auth');
const userManagementController = require('../controllers/userManagementController');

const router = express.Router();

const createUserValidators = [
  body('username').trim().notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required'),
  body('name').trim().notEmpty().withMessage('Name required'),
];

router.get('/', requireAuth, userManagementController.index);
router.post('/create', requireAuth, createUserValidators, userManagementController.create);
router.post('/delete/:id', requireAuth, userManagementController.deleteUser);

module.exports = router;

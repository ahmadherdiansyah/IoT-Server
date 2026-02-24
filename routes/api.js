// routes/api.js
const express = require('express');
const apiController = require('../controllers/apiController');

const router = express.Router();

router.get('/', apiController.info);
router.get('/data', apiController.getData);
router.post('/data', apiController.getData);
router.post('/login', apiController.login);

module.exports = router;

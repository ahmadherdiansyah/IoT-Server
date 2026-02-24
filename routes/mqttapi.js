// routes/mqttapi.js
const express = require('express');
const mqttController = require('../controllers/mqttController');

const router = express.Router();

router.get('/publish', mqttController.publish);
router.post('/publish', mqttController.publish);
router.post('/subscribe', mqttController.subscribe);

module.exports = router;

const express = require('express');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  res.render('sensor', { data: req.user });
});

module.exports = router;

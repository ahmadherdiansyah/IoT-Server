const express = require('express');
const router = express.Router();
const User = require('../models/user');
const data = require('../models/mqtt_data');

router.get('/', (req, res) => {
  res.json([{
    title: 'Smart Home API',
    copyright: 'Ahmad Herdiansyah',
    endpoints: {
      data: 'POST /api/data { topic, limit }',
      login: 'POST /api/login { username, password }'
    }
  }]);
});

router.post('/data', async (req, res, next) => {
  try {
    const limit = parseInt(req.body.limit) || 10;
    const results = await data.find({ topic: req.body.topic })
      .limit(limit)
      .sort({ timestamp: -1 });
    res.json(results);
  } catch (err) {
    next(err);
  }
});

router.get('/data', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const results = await data.find({ topic: req.query.topic })
      .limit(limit)
      .sort({ timestamp: -1 });
    res.json(results);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ message: 'All fields required' });
  }
  try {
    User.authenticate(req.body.username, req.body.password, (err, user) => {
      if (err || !user) {
        return res.json([{ Pesan: 'Username atau password salah' }]);
      }
      res.json([{ Pesan: 'sukses' }]);
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

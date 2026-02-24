// controllers/apiController.js
const MqttData = require('../models/mqtt_data');
const userService = require('../services/userService');

function info(req, res) {
  res.json({
    title: 'Smart Home API',
    copyright: 'Ahmad Herdiansyah',
    endpoints: {
      data: 'POST /api/data { topic, limit }',
      login: 'POST /api/login { username, password }',
    },
  });
}

async function getData(req, res, next) {
  try {
    const params = req.method === 'GET' ? req.query : req.body;
    const { topic } = params;
    const limit = parseInt(params.limit) || 10;

    if (!topic) return res.json({ data: [] });

    const results = await MqttData.find({ topic })
      .limit(limit)
      .sort({ timestamp: -1 });

    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  try {
    const user = await userService.authenticate(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ message: 'success' });
  } catch (err) {
    next(err);
  }
}

module.exports = { info, getData, login };

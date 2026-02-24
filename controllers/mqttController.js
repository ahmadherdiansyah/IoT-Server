// controllers/mqttController.js
const mqttService = require('../services/mqttService');

// Unified handler for both GET and POST /publish
// pesan is a raw JSON fragment (e.g. '"state":"on","pin":12') for IoT device
// backwards compatibility — do not change this wire format
async function publish(req, res, next) {
  const params = req.method === 'GET' ? req.query : req.body;
  const { topic, event, pesan, mac } = params;

  if (!topic || !event || !pesan || !mac) {
    return res.status(400).json({ error: 'All attributes required: topic, event, pesan, mac' });
  }

  try {
    // Use JSON.stringify for string values we control to prevent injection
    const payloadStr = `{"eventName":${JSON.stringify(event)},${pesan},"mac":${JSON.stringify(mac)}}`;
    await mqttService.publishRaw(topic, payloadStr);
    res.json({ status: 'success', topic });
  } catch (err) {
    next(err);
  }
}

async function subscribe(req, res, next) {
  const { topic, authtoken, pesan } = req.body;

  // NOTE: authtoken presence is checked but not validated against any stored value.
  // This matches the original behaviour. True token validation is a future improvement.
  if (!topic || !authtoken) {
    return res.status(400).json({ error: 'topic and authtoken required' });
  }

  try {
    await mqttService.publishRaw(topic, pesan || '');
    res.json({ status: 'success', topic });
  } catch (err) {
    next(err);
  }
}

module.exports = { publish, subscribe };

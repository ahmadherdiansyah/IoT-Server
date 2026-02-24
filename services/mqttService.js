// services/mqttService.js
const mqtt = require('mqtt');

const host = process.env.MQTT_HOST;
if (!host) {
  throw new Error('MQTT_HOST environment variable is required.');
}

const client = mqtt.connect({ port: 1883, host, keepalive: 60 });

client.on('connect', () => console.log('MQTT connected'));
client.on('error', (err) => console.error('MQTT error:', err.message));
client.on('reconnect', () => console.log('MQTT reconnecting...'));

/**
 * Publish a JSON-serializable payload to a topic.
 */
function publish(topic, payload) {
  return publishRaw(topic, JSON.stringify(payload));
}

/**
 * Publish a raw string payload. Used for IoT device endpoints
 * that send pre-formed JSON fragments (backwards compatibility).
 */
function publishRaw(topic, payloadStr) {
  return new Promise((resolve, reject) => {
    client.publish(topic, payloadStr, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = { client, publish, publishRaw };

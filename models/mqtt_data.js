const mongoose = require('mongoose');

const MqttSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
  },
  qos: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
}, { timestamps: true });

const MqttData = mongoose.model('Mqtt_data', MqttSchema);
module.exports = MqttData;

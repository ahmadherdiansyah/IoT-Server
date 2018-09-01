var mongoose = require('mongoose');

var MqttSchema = new mongoose.Schema({
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
  }
});
var Mqtt_data = mongoose.model('Mqtt_data', MqttSchema);
module.exports = Mqtt_data;


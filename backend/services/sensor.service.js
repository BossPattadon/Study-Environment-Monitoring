const model = require("../models/sensor.model");

exports.getAll = () => {
  return model.findAll();
};

exports.getLatest = () => {
  return model.findLatest();
};
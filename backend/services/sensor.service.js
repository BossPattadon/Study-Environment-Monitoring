const model = require("../models/sensor.model");

exports.getAll = () => {
  return model.findAll();
};

exports.getLatest = () => {
  return model.findLatest();
};

exports.getByRange = (startIso, endIso) => {
  return model.findByRange(startIso, endIso);
};
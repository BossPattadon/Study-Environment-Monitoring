const service = require("../services/sensor.service");

exports.getAllData = async (req, res) => {
  const data = await service.getAll();
  res.json(data);
};

exports.getLatestData = async (req, res) => {
  const data = await service.getLatest();
  res.json(data);
};
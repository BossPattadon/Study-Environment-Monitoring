const dbModel = require("../models/forecast.model");
const { forecast, AVAILABLE_MODELS } = require("../services/forecastService");

exports.getForecast = async (req, res) => {
  try {
    const hours = Math.min(Math.max(parseInt(req.query.hours) || 24, 1), 48);
    const modelName = req.query.model || "mlp";
    const [trainingRows, recentRows] = await Promise.all([
      dbModel.findAllForTraining(),
      dbModel.findRecent(168),
    ]);
    const result = await forecast(trainingRows, hours, modelName);
    res.json({ ...result, recent: recentRows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
};

exports.getModels = (_req, res) => {
  res.json(AVAILABLE_MODELS);
};

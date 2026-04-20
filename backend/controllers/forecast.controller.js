const model = require("../models/forecast.model");
const { forecast } = require("../services/forecastService");

exports.getForecast = async (req, res) => {
  try {
    const hours = Math.min(Math.max(parseInt(req.query.hours) || 24, 1), 48);
    const [trainingRows, recentRows] = await Promise.all([
      model.findAllForTraining(),
      model.findRecent(168),
    ]);
    const result = await forecast(trainingRows, hours);
    res.json({ ...result, recent: recentRows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
};

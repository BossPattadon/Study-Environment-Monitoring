const model = require("../models/studyIndex.model");

exports.getLatest = async (req, res) => {
  try {
    const row = await model.findLatest();
    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
};

exports.getDailyScores = async (req, res) => {
  try {
    const rows = await model.findDailyScores();
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 90);
    const rows = await model.findRecent(days);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
};

exports.getHourlyAverages = async (req, res) => {
  try {
    const rows = await model.findHourlyAverages();
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
};
const service = require("../services/sensor.service");

exports.getAllData = async (req, res) => {
  try {
    const data = await service.getAll();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
};

exports.getLatestData = async (req, res) => {
  try {
    const data = await service.getLatest();
    res.json(data ?? null);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
};

exports.getByRange = async (req, res) => {
  try {
    const start = req.query.start ?? req.query.from;
    const end = req.query.end ?? req.query.to;
    if (!start || !end) {
      return res
        .status(400)
        .json({ error: "Query params `start` and `end` (ISO datetimes) are required." });
    }
    const rows = await service.getByRange(start, end);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
};

const model = require("../models/iqAir.model");

exports.getLatest = async (req, res) => {
  try {
    const row = await model.findLatest();
    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
};

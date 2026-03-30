const reportsService = require("../services/reports.service");

exports.getDaily = async (req, res) => {
  try {
    const limit = Math.min(
      365,
      Math.max(1, parseInt(String(req.query.limit ?? "90"), 10) || 90)
    );
    const data = await reportsService.getDailyReport(limit);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
};

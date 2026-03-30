const db = require("../config/db");

/** Latest row from `iq_air` (IQAir / AirVisual style data). */
exports.findLatest = () => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM `iq_air` ORDER BY COALESCE(`timestamp`, `created_at`) DESC LIMIT 1",
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows?.[0] ?? null);
      }
    );
  });
};

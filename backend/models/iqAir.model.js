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

/** Recent rows ordered ascending, for charting. */
exports.findRecent = (days = 7) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT
        COALESCE(\`timestamp\`, \`created_at\`) AS ts,
        CAST(\`aqi_us\` AS UNSIGNED) AS aqi_us,
        \`main_pollutant\`
      FROM \`iq_air\`
      WHERE COALESCE(\`timestamp\`, \`created_at\`) >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY ts ASC`,
      [days],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows ?? []);
      }
    );
  });
};

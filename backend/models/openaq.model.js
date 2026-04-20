const db = require("../config/db");

/** Latest row from `openaq`. */
exports.findLatest = () => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT *, `value` AS pm25, `timestamp_local` AS timestamp FROM `openaq` ORDER BY `timestamp_local` DESC LIMIT 1",
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows?.[0] ?? null);
      }
    );
  });
};

/** Recent rows ordered ascending, for charting. value column is PM2.5. */
exports.findRecent = (days = 7) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT
        \`timestamp_local\` AS ts,
        CAST(\`value\` AS DECIMAL(10,2)) AS pm25,
        NULL AS pm10
      FROM \`openaq\`
      WHERE \`timestamp_local\` >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY ts ASC`,
      [days],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows ?? []);
      }
    );
  });
};


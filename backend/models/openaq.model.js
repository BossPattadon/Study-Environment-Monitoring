const db = require("../config/db");

/** Latest row from `openaq_measurements` (OpenAQ PM2.5, etc.). */
exports.findLatest = () => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM `openaq_measurements` ORDER BY `timestamp` DESC LIMIT 1",
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows?.[0] ?? null);
      }
    );
  });
};

/** Recent rows ordered ascending, for charting (pivots parameter/value into pm25/pm10 columns). */
exports.findRecent = (days = 7) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT
        \`timestamp\` AS ts,
        CAST(MAX(CASE WHEN \`parameter\` = 'pm25' THEN \`value\` END) AS DECIMAL(10,2)) AS pm25,
        CAST(MAX(CASE WHEN \`parameter\` = 'pm10' THEN \`value\` END) AS DECIMAL(10,2)) AS pm10
      FROM \`openaq_measurements\`
      WHERE \`timestamp\` >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY \`timestamp\`
      ORDER BY ts ASC`,
      [days],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows ?? []);
      }
    );
  });
};


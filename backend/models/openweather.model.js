const db = require("../config/db");

/** Latest row from `openweather`. */
exports.findLatest = () => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM `openweather` ORDER BY `timestamp` DESC LIMIT 1",
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
        \`timestamp\` AS ts,
        CAST(\`temperature\` AS DECIMAL(10,2)) AS temperature,
        CAST(\`humidity\`    AS DECIMAL(10,2)) AS humidity,
        \`weather_desc\` AS description
      FROM \`openweather\`
      WHERE \`timestamp\` >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY ts ASC`,
      [days],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows ?? []);
      }
    );
  });
};


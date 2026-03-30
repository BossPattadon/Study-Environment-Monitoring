const db = require("../config/db");

exports.findAll = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM `sensor_data`", (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

exports.findLatest = () => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM `sensor_data` ORDER BY `timestamp` DESC LIMIT 1",
      (err, result) => {
        if (err) reject(err);
        else resolve(result?.[0]);
      }
    );
  });
};

/** Inclusive range on `sensor_data.timestamp`. */
exports.findByRange = (startIso, endIso) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT * FROM \`sensor_data\`
       WHERE \`timestamp\` >= ?
         AND \`timestamp\` <= ?
       ORDER BY \`timestamp\` ASC`,
      [startIso, endIso],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows ?? []);
      }
    );
  });
};

/** Daily averages from `sensor_data` (numeric columns expected). */
exports.findDailyAverages = (limitDays = 90) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT
        DATE(\`timestamp\`) AS day,
        COUNT(*) AS sample_count,
        AVG(CAST(\`temperature\` AS DECIMAL(10,4))) AS avg_temperature,
        AVG(CAST(\`humidity\` AS DECIMAL(10,4))) AS avg_humidity,
        AVG(CAST(\`light_level\` AS DECIMAL(10,4))) AS avg_light,
        AVG(CAST(\`noise_level\` AS DECIMAL(10,4))) AS avg_noise
      FROM \`sensor_data\`
      WHERE \`timestamp\` IS NOT NULL
      GROUP BY DATE(\`timestamp\`)
      ORDER BY day DESC
      LIMIT ?`,
      [limitDays],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows ?? []);
      }
    );
  });
};


const db = require("../config/db");

exports.findLatest = () => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM `study_index` ORDER BY `timestamp` DESC LIMIT 1",
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows?.[0] ?? null);
      }
    );
  });
};

/** Daily average of `total_score` from `study_index`. */
exports.findDailyScores = (limitDays = 90) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT
        DATE(\`timestamp\`) AS day,
        AVG(CAST(\`total_score\` AS DECIMAL(10,2))) AS avg_score,
        COUNT(*) AS sample_count
      FROM \`study_index\`
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

/** Daily averages of each sub-score from `study_index`. */
exports.findDailySubScores = (limitDays = 90) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT
        DATE(\`timestamp\`) AS day,
        AVG(CAST(\`light_score\`    AS DECIMAL(10,2))) AS avg_light_score,
        AVG(CAST(\`noise_score\`    AS DECIMAL(10,2))) AS avg_noise_score,
        AVG(CAST(\`temp_score\`     AS DECIMAL(10,2))) AS avg_temp_score,
        AVG(CAST(\`humidity_score\` AS DECIMAL(10,2))) AS avg_humidity_score,
        AVG(CAST(\`aqi_score\`      AS DECIMAL(10,2))) AS avg_aqi_score
      FROM \`study_index\`
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

/** Average score by hour-of-day (0–23) for best / worst study times. */
exports.findHourlyAverages = () => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT
        HOUR(\`timestamp\`) AS hour_of_day,
        AVG(CAST(\`total_score\` AS DECIMAL(10,2))) AS avg_score,
        COUNT(*) AS n
      FROM \`study_index\`
      WHERE \`timestamp\` IS NOT NULL
        AND \`total_score\` IS NOT NULL
      GROUP BY HOUR(\`timestamp\`)
      ORDER BY hour_of_day ASC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows ?? []);
      }
    );
  });
};

exports.create = (data) => {
  return new Promise((resolve, reject) => {
    db.query(
      "INSERT INTO `study_index` SET ?",
      [data],
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
  });
};
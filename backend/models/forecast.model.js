const db = require("../config/db");

/** All study_index rows (for training), ordered oldest-first. */
exports.findAllForTraining = () => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT
        \`timestamp\`,
        CAST(\`total_score\`     AS DECIMAL(10,4)) AS total_score,
        CAST(\`light_score\`     AS DECIMAL(10,4)) AS light_score,
        CAST(\`noise_score\`     AS DECIMAL(10,4)) AS noise_score,
        CAST(\`temp_score\`      AS DECIMAL(10,4)) AS temp_score,
        CAST(\`humidity_score\`  AS DECIMAL(10,4)) AS humidity_score,
        CAST(\`aqi_score\`       AS DECIMAL(10,4)) AS aqi_score
      FROM \`study_index\`
      WHERE \`timestamp\` IS NOT NULL
        AND \`total_score\` IS NOT NULL
      ORDER BY \`timestamp\` ASC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows ?? []);
      }
    );
  });
};

/** Most recent N hours of study_index rows for display. */
exports.findRecent = (hours = 24) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT
        \`timestamp\`,
        CAST(\`total_score\`     AS DECIMAL(10,4)) AS total_score,
        CAST(\`light_score\`     AS DECIMAL(10,4)) AS light_score,
        CAST(\`noise_score\`     AS DECIMAL(10,4)) AS noise_score,
        CAST(\`temp_score\`      AS DECIMAL(10,4)) AS temp_score,
        CAST(\`humidity_score\`  AS DECIMAL(10,4)) AS humidity_score,
        CAST(\`aqi_score\`       AS DECIMAL(10,4)) AS aqi_score
      FROM \`study_index\`
      WHERE \`timestamp\` >= DATE_SUB(NOW(), INTERVAL ? HOUR)
        AND \`timestamp\` IS NOT NULL
      ORDER BY \`timestamp\` ASC`,
      [hours],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows ?? []);
      }
    );
  });
};

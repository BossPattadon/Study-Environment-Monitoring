const db = require("../config/db");

/** All study_index rows joined with hourly openaq pm25, ordered oldest-first. */
exports.findAllForTraining = () => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT
        si.timestamp,
        CAST(si.total_score    AS DECIMAL(10,4)) AS total_score,
        CAST(si.light_score    AS DECIMAL(10,4)) AS light_score,
        CAST(si.noise_score    AS DECIMAL(10,4)) AS noise_score,
        CAST(si.temp_score     AS DECIMAL(10,4)) AS temp_score,
        CAST(si.humidity_score AS DECIMAL(10,4)) AS humidity_score,
        CAST(si.aqi_score      AS DECIMAL(10,4)) AS aqi_score,
        COALESCE(oaq.pm25, 0)                    AS pm25
      FROM \`study_index\` si
      LEFT JOIN (
        SELECT
          DATE_FORMAT(DATE_ADD(\`timestamp_local\`, INTERVAL 30 MINUTE), '%Y-%m-%d %H:00:00') AS hour_bucket,
          ROUND(AVG(\`value\`), 2) AS pm25
        FROM \`openaq\`
        GROUP BY hour_bucket
      ) oaq ON DATE_FORMAT(DATE_ADD(si.timestamp, INTERVAL 30 MINUTE), '%Y-%m-%d %H:00:00') = oaq.hour_bucket
      WHERE si.timestamp IS NOT NULL
        AND si.total_score IS NOT NULL
      ORDER BY si.timestamp ASC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows ?? []);
      }
    );
  });
};

/** Most recent N hours, downsampled to hourly averages, joined with openaq pm25. */
exports.findRecent = (hours = 168) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT
        si_h.ts AS timestamp,
        si_h.total_score,
        si_h.light_score,
        si_h.noise_score,
        si_h.temp_score,
        si_h.humidity_score,
        si_h.aqi_score,
        oaq_h.pm25
      FROM (
        SELECT
          DATE_FORMAT(DATE_ADD(\`timestamp\`, INTERVAL 30 MINUTE), '%Y-%m-%d %H:00:00') AS ts,
          ROUND(AVG(\`total_score\`),    2) AS total_score,
          ROUND(AVG(\`light_score\`),    2) AS light_score,
          ROUND(AVG(\`noise_score\`),    2) AS noise_score,
          ROUND(AVG(\`temp_score\`),     2) AS temp_score,
          ROUND(AVG(\`humidity_score\`), 2) AS humidity_score,
          ROUND(AVG(\`aqi_score\`),      2) AS aqi_score
        FROM \`study_index\`
        WHERE \`timestamp\` >= DATE_SUB(NOW(), INTERVAL ? HOUR)
          AND \`timestamp\` IS NOT NULL
        GROUP BY ts
      ) si_h
      LEFT JOIN (
        SELECT
          DATE_FORMAT(DATE_ADD(\`timestamp_local\`, INTERVAL 30 MINUTE), '%Y-%m-%d %H:00:00') AS ts,
          ROUND(AVG(\`value\`), 2) AS pm25
        FROM \`openaq\`
        GROUP BY ts
      ) oaq_h ON si_h.ts = oaq_h.ts
      ORDER BY si_h.ts ASC`,
      [hours],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows ?? []);
      }
    );
  });
};

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


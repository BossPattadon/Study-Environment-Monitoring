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


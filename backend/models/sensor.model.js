const db = require("../config/db");

exports.findAll = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM sensor_data", (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

exports.findLatest = () => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 1",
      (err, result) => {
        if (err) reject(err);
        else resolve(result[0]);
      }
    );
  });
};
const SCORE_KEYS = [
  "total_score",
  "light_score",
  "noise_score",
  "temp_score",
  "humidity_score",
  "aqi_score",
];

function encodeTime(date) {
  const hour = date.getHours() + date.getMinutes() / 60;
  const dow = date.getDay();
  return [
    Math.sin((2 * Math.PI * hour) / 24),
    Math.cos((2 * Math.PI * hour) / 24),
    Math.sin((2 * Math.PI * dow) / 7),
    Math.cos((2 * Math.PI * dow) / 7),
  ];
}

module.exports = { SCORE_KEYS, encodeTime };

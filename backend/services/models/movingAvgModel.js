const { SCORE_KEYS } = require("./shared");

// Builds a lookup: hour-of-day (0–23) → { avg score per key }
function buildLookup(rows) {
  const buckets = {};
  for (const r of rows) {
    const hour = new Date(r.timestamp).getHours();
    if (!buckets[hour]) buckets[hour] = { n: 0 };
    SCORE_KEYS.forEach((k) => {
      buckets[hour][k] = (buckets[hour][k] ?? 0) + (r[k] ?? 0);
    });
    buckets[hour].n++;
  }
  const lookup = {};
  for (const [hour, data] of Object.entries(buckets)) {
    lookup[Number(hour)] = {};
    SCORE_KEYS.forEach((k) => { lookup[Number(hour)][k] = data[k] / data.n; });
  }
  return lookup;
}

function globalMeans(lookup) {
  const entries = Object.values(lookup);
  if (!entries.length) return Object.fromEntries(SCORE_KEYS.map((k) => [k, 50]));
  return Object.fromEntries(
    SCORE_KEYS.map((k) => [k, entries.reduce((s, h) => s + (h[k] ?? 0), 0) / entries.length])
  );
}

async function predict(rows, hoursAhead, fromDate) {
  const lookup = buildLookup(rows);
  const fallback = globalMeans(lookup);
  const predictions = [];
  for (let h = 1; h <= hoursAhead; h++) {
    const target = new Date(fromDate);
    target.setMinutes(0, 0, 0);
    target.setHours(target.getHours() + h);
    const hour = target.getHours();
    const data = lookup[hour] ?? fallback;
    const entry = { timestamp: target.toISOString() };
    SCORE_KEYS.forEach((k) => {
      entry[k] = Math.round((data[k] ?? fallback[k]) * 10) / 10;
    });
    predictions.push(entry);
  }
  return predictions;
}

module.exports = {
  name: "moving_avg",
  label: "Moving Average",
  description: "Historical hourly averages by time-of-day · no training required",
  predict,
};

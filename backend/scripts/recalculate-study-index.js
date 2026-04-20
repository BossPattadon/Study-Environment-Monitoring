/**
 * Recalculates every row in `study_index` using the current scoring algorithms.
 *
 * Usage:
 *   node backend/scripts/recalculate-study-index.js
 *
 * Run from the project root (where .env lives), or from backend/ if .env is there.
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const db = require("../config/db");
const appWeights = require("../config/appWeights");

// ── Scoring functions (must stay in sync with studyIndex.service.js) ──────────

function adcToLux(adc) {
  if (adc == null || adc <= 0) return null;
  if (adc >= 1023) return 0;
  return (50 * (1023 - adc)) / adc;
}

function calculateLightScore(adcRaw) {
  const lux = adcToLux(adcRaw);
  if (lux == null) return 50;
  if (lux >= 300 && lux <= 500) return 100;
  if (lux < 300) return Math.max(0, Math.round((lux / 300) * 100));
  if (lux <= 1000) return Math.max(0, Math.round(100 - ((lux - 500) / 500) * 25));
  return Math.max(0, Math.round(75 - ((lux - 1000) / 1000) * 75));
}

function calculateNoiseScore(adc) {
  if (adc == null) return 50;
  if (adc <= 620) return 100;
  if (adc <= 750) return Math.max(0, Math.round(100 - ((adc - 620) / 130) * 40));
  if (adc <= 900) return Math.max(0, Math.round(60  - ((adc - 750) / 150) * 55));
  return 0;
}

function calculateTempScore(temp) {
  if (temp == null) return 50;
  if (temp >= 20 && temp <= 23) return 100;
  if (temp < 20) return Math.max(0, Math.round(100 - (20 - temp) * 5));
  return Math.max(0, Math.round(100 - (temp - 23) * 7));
}

function calculateHumidityScore(humidity) {
  if (humidity == null) return 50;
  if (humidity >= 40 && humidity <= 60) return 100;
  if (humidity < 40) return Math.max(0, Math.round(100 - (40 - humidity) * 4));
  return Math.max(0, Math.round(100 - (humidity - 60) * 3));
}

function calculateAqiScore(aqi) {
  if (aqi == null) return 50;
  if (aqi <=  50) return 100;
  if (aqi <= 100) return Math.round(100 - ((aqi -  50) /  50) * 30);
  if (aqi <= 150) return Math.round( 70 - ((aqi - 100) /  50) * 30);
  if (aqi <= 200) return Math.round( 40 - ((aqi - 150) /  50) * 30);
  return 0;
}

function scoreRow(sensor, aqiValue, weights) {
  const w = appWeights.normalize(weights);
  const light_score    = calculateLightScore(sensor.light_level);
  const noise_score    = calculateNoiseScore(sensor.noise_level);
  const temp_score     = calculateTempScore(sensor.temperature);
  const humidity_score = calculateHumidityScore(sensor.humidity);
  const aqi_score      = calculateAqiScore(aqiValue);

  const total = parseFloat((
    light_score    * w.light       +
    noise_score    * w.noise       +
    temp_score     * w.temperature +
    humidity_score * w.humidity    +
    aqi_score      * w.air
  ).toFixed(2));

  const status =
    total >= 80 ? "Good" :
    total >= 55 ? "Moderate" :
                  "Poor";

  return { light_score, noise_score, temp_score, humidity_score, aqi_score, total_score: total, status };
}

// ── DB helpers ────────────────────────────────────────────────────────────────

function query(sql, params = []) {
  return new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Loading weights...");
  const weights = appWeights.load();

  console.log("Fetching all sensor_data rows...");
  const sensors = await query(
    "SELECT * FROM `sensor_data` ORDER BY `timestamp` ASC"
  );
  console.log(`Found ${sensors.length} sensor rows.\n`);

  console.log("Truncating study_index...");
  await query("TRUNCATE TABLE `study_index`");
  console.log("Truncated.\n");

  let inserted = 0;

  for (const sensor of sensors) {
    const ts = sensor.timestamp;

    // Closest iq_air row at or before this sensor timestamp
    const [aqiRow] = await query(
      `SELECT * FROM \`iq_air\`
       WHERE COALESCE(\`timestamp\`, \`created_at\`) <= ?
       ORDER BY COALESCE(\`timestamp\`, \`created_at\`) DESC
       LIMIT 1`,
      [ts]
    );
    const aqiValue = aqiRow?.aqi_us ?? null;

    const scores = scoreRow(sensor, aqiValue, weights);

    await query(
      `INSERT INTO \`study_index\`
         (pir_score, light_score, noise_score, temp_score, humidity_score, aqi_score, total_score, status, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sensor.pir_motion ? 100 : 0,
        scores.light_score,
        scores.noise_score,
        scores.temp_score,
        scores.humidity_score,
        scores.aqi_score,
        scores.total_score,
        scores.status,
        ts,
      ]
    );

    inserted++;
    if (inserted % 500 === 0) console.log(`  ... inserted ${inserted} rows`);
  }

  console.log(`\nDone. Inserted: ${inserted} rows into study_index.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

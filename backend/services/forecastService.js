const tf = require("@tensorflow/tfjs");

const SCORE_KEYS = [
  "total_score",
  "light_score",
  "noise_score",
  "temp_score",
  "humidity_score",
  "aqi_score",
];

let _cachedModel = null;
let _cacheRowCount = 0;

/**
 * Encode a Date into 4 cyclic features:
 * [sin_hour, cos_hour, sin_dow, cos_dow]
 */
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

/**
 * Train a small MLP on historical study_index rows.
 * Input:  4 cyclic time features
 * Output: 6 score values (total + 5 sub-scores), scaled to [0,1]
 */
async function trainModel(rows) {
  const xs = rows.map((r) => encodeTime(new Date(r.timestamp)));
  const ys = rows.map((r) => SCORE_KEYS.map((k) => (r[k] ?? 0) / 100));

  const xTensor = tf.tensor2d(xs, [xs.length, 4]);
  const yTensor = tf.tensor2d(ys, [ys.length, 6]);

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [4], units: 32, activation: "relu" }));
  model.add(tf.layers.dense({ units: 16, activation: "relu" }));
  model.add(tf.layers.dense({ units: 6, activation: "sigmoid" }));

  model.compile({ optimizer: tf.train.adam(0.01), loss: "meanSquaredError" });

  await model.fit(xTensor, yTensor, {
    epochs: 150,
    batchSize: Math.min(32, xs.length),
    verbose: 0,
  });

  xTensor.dispose();
  yTensor.dispose();

  return model;
}

/**
 * Get (or train and cache) the forecast model.
 * Re-trains when the training set has grown by ≥5 rows.
 */
async function getModel(rows) {
  if (!_cachedModel || Math.abs(rows.length - _cacheRowCount) >= 5) {
    if (_cachedModel) _cachedModel.dispose();
    _cachedModel = await trainModel(rows);
    _cacheRowCount = rows.length;
  }
  return _cachedModel;
}

/**
 * Generate hourly predictions starting from `fromDate` for `hoursAhead` hours.
 * Returns an array of { timestamp, total_score, light_score, ... }.
 */
async function forecast(rows, hoursAhead = 24, fromDate = new Date()) {
  if (rows.length < 10) {
    return { trained_on: rows.length, insufficient_data: true, predictions: [] };
  }

  const model = await getModel(rows);

  const predictions = [];
  for (let h = 1; h <= hoursAhead; h++) {
    const target = new Date(fromDate);
    target.setMinutes(0, 0, 0);
    target.setHours(target.getHours() + h);

    const features = encodeTime(target);
    const input = tf.tensor2d([features], [1, 4]);
    const output = model.predict(input);
    const values = Array.from(await output.data());
    input.dispose();
    output.dispose();

    const entry = { timestamp: target.toISOString() };
    SCORE_KEYS.forEach((k, i) => {
      entry[k] = Math.round(values[i] * 100 * 10) / 10;
    });
    predictions.push(entry);
  }

  return { trained_on: rows.length, insufficient_data: false, predictions };
}

module.exports = { forecast };

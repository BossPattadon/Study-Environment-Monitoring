const tf = require("@tensorflow/tfjs");
const { SCORE_KEYS, encodeTime } = require("./shared");

let _cached = null;
let _cacheCount = 0;

async function train(rows) {
  const xs = rows.map((r) => encodeTime(new Date(r.timestamp)));
  const ys = rows.map((r) => SCORE_KEYS.map((k) => (r[k] ?? 0) / 100));
  const xT = tf.tensor2d(xs, [xs.length, 4]);
  const yT = tf.tensor2d(ys, [ys.length, 6]);
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [4], units: 32, activation: "relu" }));
  model.add(tf.layers.dense({ units: 16, activation: "relu" }));
  model.add(tf.layers.dense({ units: 6, activation: "sigmoid" }));
  model.compile({ optimizer: tf.train.adam(0.01), loss: "meanSquaredError" });
  await model.fit(xT, yT, { epochs: 150, batchSize: Math.min(32, xs.length), verbose: 0 });
  xT.dispose();
  yT.dispose();
  return model;
}

async function getModel(rows) {
  if (!_cached || Math.abs(rows.length - _cacheCount) >= 5) {
    if (_cached) _cached.dispose();
    _cached = await train(rows);
    _cacheCount = rows.length;
  }
  return _cached;
}

async function predict(rows, hoursAhead, fromDate) {
  const model = await getModel(rows);
  const predictions = [];
  for (let h = 1; h <= hoursAhead; h++) {
    const target = new Date(fromDate);
    target.setMinutes(0, 0, 0);
    target.setHours(target.getHours() + h);
    const input = tf.tensor2d([encodeTime(target)], [1, 4]);
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
  return predictions;
}

module.exports = {
  name: "mlp",
  label: "MLP",
  description: "4 time features → 32→16→6 units · sigmoid · TF.js",
  predict,
};

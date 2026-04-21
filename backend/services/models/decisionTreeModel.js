const { ALL_OUTPUT_KEYS, OUTPUT_SCALES, encodeTime, buildNode, predictNode } = require("./shared");

const MAX_DEPTH = 8;
const MIN_LEAF  = 5;
const MAX_CANDS = 25;
const N_FEATS   = 4;

let _cached     = null;
let _cacheCount = 0;

function train(rows) {
  const xs = rows.map((r) => encodeTime(new Date(r.timestamp)));
  const ys = rows.map((r) => ALL_OUTPUT_KEYS.map((k) => (r[k] ?? 0) / OUTPUT_SCALES[k]));
  return buildNode(xs, ys, 0, MAX_DEPTH, MIN_LEAF, N_FEATS, MAX_CANDS);
}

function getTree(rows) {
  if (!_cached || Math.abs(rows.length - _cacheCount) >= 5) {
    _cached = train(rows);
    _cacheCount = rows.length;
  }
  return _cached;
}

async function predict(rows, hoursAhead, fromDate) {
  const tree = getTree(rows);
  const predictions = [];
  for (let h = 1; h <= hoursAhead; h++) {
    const target = new Date(fromDate);
    target.setMinutes(0, 0, 0);
    target.setHours(target.getHours() + h);
    const values = predictNode(tree, encodeTime(target));
    const entry = { timestamp: target.toISOString() };
    ALL_OUTPUT_KEYS.forEach((k, i) => {
      const scale = OUTPUT_SCALES[k];
      entry[k] = Math.round(Math.min(scale, Math.max(0, values[i] * scale)) * 10) / 10;
    });
    predictions.push(entry);
  }
  return predictions;
}

module.exports = {
  name: "decision_tree",
  label: "Decision Tree",
  description: "CART regression · max depth 8 · 4 cyclic time features",
  predict,
};

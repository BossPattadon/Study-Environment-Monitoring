const { ALL_OUTPUT_KEYS, OUTPUT_SCALES, encodeTime, buildNode, predictNode, bootstrap } = require("./shared");

const N_TREES   = 15;
const MAX_DEPTH = 6;
const MIN_LEAF  = 5;
const MAX_CANDS = 20;
const MAX_FEATS = 2;

let _cached     = null;
let _cacheCount = 0;

function train(rows) {
  const xs = rows.map((r) => encodeTime(new Date(r.timestamp)));
  const ys = rows.map((r) => ALL_OUTPUT_KEYS.map((k) => (r[k] ?? 0) / OUTPUT_SCALES[k]));
  const trees = [];
  for (let t = 0; t < N_TREES; t++) {
    const [bxs, bys] = bootstrap(xs, ys);
    trees.push(buildNode(bxs, bys, 0, MAX_DEPTH, MIN_LEAF, MAX_FEATS, MAX_CANDS));
  }
  return trees;
}

function getForest(rows) {
  if (!_cached || Math.abs(rows.length - _cacheCount) >= 5) {
    _cached = train(rows);
    _cacheCount = rows.length;
  }
  return _cached;
}

async function predict(rows, hoursAhead, fromDate) {
  const forest = getForest(rows);
  const predictions = [];
  for (let h = 1; h <= hoursAhead; h++) {
    const target = new Date(fromDate);
    target.setMinutes(0, 0, 0);
    target.setHours(target.getHours() + h);
    const feat = encodeTime(target);

    const summed = Array(ALL_OUTPUT_KEYS.length).fill(0);
    for (const tree of forest) {
      const vals = predictNode(tree, feat);
      vals.forEach((v, i) => { summed[i] += v; });
    }

    const entry = { timestamp: target.toISOString() };
    ALL_OUTPUT_KEYS.forEach((k, i) => {
      const scale = OUTPUT_SCALES[k];
      entry[k] = Math.round(Math.min(scale, Math.max(0, (summed[i] / forest.length) * scale)) * 10) / 10;
    });
    predictions.push(entry);
  }
  return predictions;
}

module.exports = {
  name: "random_forest",
  label: "Random Forest",
  description: `${N_TREES} trees · max depth ${MAX_DEPTH} · ${MAX_FEATS} features/split · bootstrap`,
  predict,
};

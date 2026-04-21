const SCORE_KEYS = [
  "total_score",
  "light_score",
  "noise_score",
  "temp_score",
  "humidity_score",
  "aqi_score",
];

// pm25 is a raw measurement (µg/m³), so it uses a different normalization scale.
const ALL_OUTPUT_KEYS = [...SCORE_KEYS, "pm25"];
const OUTPUT_SCALES = {
  total_score: 100, light_score: 100, noise_score: 100,
  temp_score: 100, humidity_score: 100, aqi_score: 100,
  pm25: 300,
};

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

// ── CART tree utilities (used by Decision Tree and Random Forest) ─────────────

/** Sum of squared errors across all output dimensions. */
function sse(ys) {
  if (!ys.length) return 0;
  let total = 0;
  for (let d = 0; d < ys[0].length; d++) {
    const mean = ys.reduce((s, y) => s + y[d], 0) / ys.length;
    for (const y of ys) total += (y[d] - mean) ** 2;
  }
  return total;
}

/** Column-wise mean of a 2-D array. */
function colMeans(ys) {
  return ys[0].map((_, d) => ys.reduce((s, y) => s + y[d], 0) / ys.length);
}

/**
 * Build a CART regression node recursively.
 * @param {number[][]} xs  - feature matrix
 * @param {number[][]} ys  - label matrix (n × 6, values in [0,1])
 * @param {number}     depth
 * @param {number}     maxDepth
 * @param {number}     minLeaf   - minimum samples per leaf
 * @param {number}     maxFeats  - features to consider per split (Random Forest subsampling)
 * @param {number}     maxCands  - max threshold candidates per feature
 */
function buildNode(xs, ys, depth, maxDepth, minLeaf, maxFeats, maxCands) {
  if (depth >= maxDepth || xs.length <= minLeaf) {
    return { leaf: colMeans(ys) };
  }

  // Feature subsampling: pick `maxFeats` indices at random
  const allFeats = Array.from({ length: xs[0].length }, (_, i) => i);
  const feats = allFeats.sort(() => Math.random() - 0.5).slice(0, maxFeats);

  const parentSSE = sse(ys);
  let bestGain = 0;
  let bestSplit = null;

  for (const f of feats) {
    const unique = [...new Set(xs.map((x) => x[f]))].sort((a, b) => a - b);
    const step = Math.max(1, Math.floor(unique.length / maxCands));
    const candidates = unique.filter((_, i) => i % step === 0 && i < unique.length - 1);

    for (const thr of candidates) {
      const lX = [], lY = [], rX = [], rY = [];
      for (let i = 0; i < xs.length; i++) {
        if (xs[i][f] <= thr) { lX.push(xs[i]); lY.push(ys[i]); }
        else                  { rX.push(xs[i]); rY.push(ys[i]); }
      }
      if (!lY.length || !rY.length) continue;
      const gain = parentSSE - sse(lY) - sse(rY);
      if (gain > bestGain) {
        bestGain = gain;
        bestSplit = { f, thr, lX, lY, rX, rY };
      }
    }
  }

  if (!bestSplit) return { leaf: colMeans(ys) };

  const args = [depth + 1, maxDepth, minLeaf, maxFeats, maxCands];
  return {
    f: bestSplit.f,
    thr: bestSplit.thr,
    left:  buildNode(bestSplit.lX, bestSplit.lY, ...args),
    right: buildNode(bestSplit.rX, bestSplit.rY, ...args),
  };
}

/** Traverse a built node to predict for one sample. */
function predictNode(node, x) {
  if (node.leaf) return node.leaf;
  return x[node.f] <= node.thr ? predictNode(node.left, x) : predictNode(node.right, x);
}

/** Bootstrap-sample `n` rows (with replacement). */
function bootstrap(xs, ys) {
  const n = xs.length;
  const bxs = [], bys = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * n);
    bxs.push(xs[idx]);
    bys.push(ys[idx]);
  }
  return [bxs, bys];
}

module.exports = { SCORE_KEYS, ALL_OUTPUT_KEYS, OUTPUT_SCALES, encodeTime, sse, colMeans, buildNode, predictNode, bootstrap };

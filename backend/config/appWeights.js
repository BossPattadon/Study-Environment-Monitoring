const fs   = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "weights.json");
const DEFAULT = { light: 1, noise: 1, temperature: 1, humidity: 1, air: 1 };

function load() {
  try {
    return { ...DEFAULT, ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
  } catch {
    return { ...DEFAULT };
  }
}

function save(weights) {
  fs.writeFileSync(FILE, JSON.stringify(weights, null, 2));
}

function normalize(w) {
  const total = (w.light ?? 0) + (w.noise ?? 0) + (w.temperature ?? 0) + (w.humidity ?? 0) + (w.air ?? 0);
  if (total === 0) return { light: 0.2, noise: 0.2, temperature: 0.2, humidity: 0.2, air: 0.2 };
  return {
    light:       w.light       / total,
    noise:       w.noise       / total,
    temperature: w.temperature / total,
    humidity:    w.humidity    / total,
    air:         w.air         / total,
  };
}

module.exports = { load, save, normalize };

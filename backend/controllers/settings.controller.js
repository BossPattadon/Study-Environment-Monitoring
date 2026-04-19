const appWeights = require("../config/appWeights");

exports.getWeights = (req, res) => {
  res.json(appWeights.load());
};

exports.putWeights = (req, res) => {
  const { light, noise, temperature, humidity, air } = req.body ?? {};
  const incoming = { light, noise, temperature, humidity, air };

  for (const [k, v] of Object.entries(incoming)) {
    if (typeof v !== "number" || v < 0) {
      return res.status(400).json({ error: `Invalid value for "${k}"` });
    }
  }

  appWeights.save(incoming);
  res.json(incoming);
};

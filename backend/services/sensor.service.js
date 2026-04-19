const model = require("../models/sensor.model");

// KY-018 with 10kΩ fixed resistor at 5V (fixed resistor on VCC side → brighter = lower ADC).
// If your wiring is inverted (brighter = higher ADC), swap the formula to: 50 * adc / (1023 - adc)
function adcToLux(adc) {
  if (adc == null) return null;
  const v = Number(adc);
  if (v <= 0) return null;       // sensor saturated / no reading
  if (v >= 1023) return 0;       // complete darkness
  return Math.round((50 * (1023 - v)) / v);
}

function transformRow(row) {
  if (!row) return row;
  return { ...row, light_level: adcToLux(row.light_level) };
}

exports.getAll = async () => {
  const rows = await model.findAll();
  return rows.map(transformRow);
};

exports.getLatest = async () => {
  const row = await model.findLatest();
  return transformRow(row);
};

exports.getByRange = async (startIso, endIso) => {
  const rows = await model.findByRange(startIso, endIso);
  return rows.map(transformRow);
};
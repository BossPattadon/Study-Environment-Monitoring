const studyIndexModel = require("../models/studyIndex.model");
const sensorModel = require("../models/sensor.model");
const iqAirModel = require("../models/iqAir.model");
const appWeights = require("../config/appWeights");

// KY-018: fixed resistor on VCC side → brighter = lower ADC
function adcToLux(adc) {
  if (adc == null || adc <= 0) return null;
  if (adc >= 1023) return 0;
  return (50 * (1023 - adc)) / adc;
}

// Light: ideal study range 300–500 lux; penalise both darkness and glare
function calculateLightScore(adcRaw) {
  const lux = adcToLux(adcRaw);
  if (lux == null) return 50;
  if (lux >= 300 && lux <= 500) return 100;
  if (lux < 300) {
    // Too dark: linear 0→100 as lux goes 0→300
    return Math.max(0, Math.round((lux / 300) * 100));
  }
  // Too bright: gentle penalty 500→1000 lux (−25 pts), steeper above 1000
  if (lux <= 1000) return Math.max(0, Math.round(100 - ((lux - 500) / 500) * 25));
  return Math.max(0, Math.round(75 - ((lux - 1000) / 1000) * 75));
}

// Noise: ADC quiet baseline ~580–620; loud ~800+
function calculateNoiseScore(adc) {
  if (adc == null) return 50;
  const QUIET = 620;
  const LOUD  = 800;
  if (adc <= QUIET) return 100;
  if (adc >= LOUD)  return 0;
  return Math.max(0, Math.round(100 - ((adc - QUIET) / (LOUD - QUIET)) * 100));
}

// Temp / Humidity: symmetric decay from ideal midpoint, no artificial floor
function calculateRangeScore(value, min, max) {
  if (value == null) return 50;
  if (value >= min && value <= max) return 100;
  const mid   = (min + max) / 2;
  const range = (max - min) / 2;       // half-width of perfect band
  const excess = Math.abs(value - mid) - range;
  // Lose ~5 pts per unit outside the perfect band
  return Math.max(0, Math.round(100 - excess * 5));
}

// AQI: US EPA breakpoints mapped to 0–100 score
function calculateAqiScore(aqi) {
  if (aqi == null) return 50;
  if (aqi <=  50) return 100;
  if (aqi <= 100) return Math.round(100 - ((aqi -  50) /  50) * 25); // 100 → 75
  if (aqi <= 150) return Math.round( 75 - ((aqi - 100) /  50) * 25); //  75 → 50
  if (aqi <= 200) return Math.round( 50 - ((aqi - 150) /  50) * 25); //  50 → 25
  if (aqi <= 300) return Math.round( 25 - ((aqi - 200) / 100) * 25); //  25 →  0
  return 0;
}

exports.generateCurrentIndex = async () => {
  try {
    const sensor = await sensorModel.findLatest();
    const aqiRow = await iqAirModel.findLatest();

    if (!sensor) return null;

    const light_score    = calculateLightScore(sensor.light_level);
    const noise_score    = calculateNoiseScore(sensor.noise_level);
    const temp_score     = calculateRangeScore(sensor.temperature, 23, 26);
    const humidity_score = calculateRangeScore(sensor.humidity, 40, 60);
    const aqi_score      = calculateAqiScore(aqiRow?.aqi_us ?? null);

    const w = appWeights.normalize(appWeights.load());
    const total = (
      light_score    * w.light       +
      noise_score    * w.noise       +
      temp_score     * w.temperature +
      humidity_score * w.humidity    +
      aqi_score      * w.air
    );

    const status =
      total >= 80 ? "Good" :
      total >= 50 ? "Moderate" :
                    "Poor";

    return await studyIndexModel.create({
      pir_score: sensor.pir_motion ? 100 : 0,
      light_score,
      noise_score,
      temp_score,
      humidity_score,
      aqi_score,
      total_score: parseFloat(total.toFixed(2)),
      status,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Scoring Error:", error);
    throw error;
  }
};

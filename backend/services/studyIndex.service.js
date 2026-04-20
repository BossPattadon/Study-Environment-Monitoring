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

// Noise: ADC from sound sensor; higher ADC = louder
function calculateNoiseScore(adc) {
  if (adc == null) return 50;
  if (adc <= 620) return 100;
  if (adc <= 750) return Math.max(0, Math.round(100 - ((adc - 620) / 130) * 40));
  if (adc <= 900) return Math.max(0, Math.round(60  - ((adc - 750) / 150) * 55));
  return 0;
}

// Temperature: ideal 20–23°C; hotter penalised harder than cooler
function calculateTempScore(temp) {
  if (temp == null) return 50;
  if (temp >= 20 && temp <= 23) return 100;
  if (temp < 20) return Math.max(0, Math.round(100 - (20 - temp) * 5));
  return Math.max(0, Math.round(100 - (temp - 23) * 7));
}

// Humidity: ideal 40–60%; dry penalised harder than humid
function calculateHumidityScore(humidity) {
  if (humidity == null) return 50;
  if (humidity >= 40 && humidity <= 60) return 100;
  if (humidity < 40) return Math.max(0, Math.round(100 - (40 - humidity) * 4));
  return Math.max(0, Math.round(100 - (humidity - 60) * 3));
}

// AQI: continuous linear interpolation between EPA breakpoints
function calculateAqiScore(aqi) {
  if (aqi == null) return 50;
  if (aqi <=  50) return 100;
  if (aqi <= 100) return Math.round(100 - ((aqi -  50) /  50) * 30);
  if (aqi <= 150) return Math.round( 70 - ((aqi - 100) /  50) * 30);
  if (aqi <= 200) return Math.round( 40 - ((aqi - 150) /  50) * 30);
  return 0;
}

exports.generateCurrentIndex = async () => {
  try {
    const sensor = await sensorModel.findLatest();
    const aqiRow = await iqAirModel.findLatest();

    if (!sensor) return null;

    const light_score    = calculateLightScore(sensor.light_level);
    const noise_score    = calculateNoiseScore(sensor.noise_level);
    const temp_score     = calculateTempScore(sensor.temperature);
    const humidity_score = calculateHumidityScore(sensor.humidity);
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
      total >= 55 ? "Moderate" :
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

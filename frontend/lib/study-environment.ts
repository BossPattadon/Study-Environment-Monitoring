import {
  type StudySettings,
  defaultStudySettings,
} from "@/lib/study-settings";

export type Suitability = "good" | "moderate" | "poor";

export type QuestionAnswer = "yes" | "no" | "unknown";

export type NormalizedReading = {
  timestamp: string | null;
  temperature: number | null;
  humidity: number | null;
  light: number | null;
  noise: number | null;
  motion: boolean | null;
  aqi: number | null;
  pm25: number | null;
  outdoorTemp: number | null;
  weatherDescription: string | null;
  humidityOutdoor: number | null;
};

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function boolish(v: unknown): boolean | null {
  if (v == null || v === "") return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v).toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return null;
}

export function normalizeSensorRow(
  row: Record<string, unknown> | null | undefined
): NormalizedReading | null {
  if (!row) return null;
  return {
    timestamp:
      row.timestamp != null
        ? String(row.timestamp)
        : row.created_at != null
          ? String(row.created_at)
          : null,
    temperature: num(row.temperature ?? row.temp),
    humidity: num(row.humidity),
    light: num(
      row.light ??
        row.light_level ??
        row.light_intensity ??
        row.ldr ??
        row.photoresistor
    ),
    noise: num(
      row.noise ??
        row.noise_level ??
        row.decibel ??
        row.db ??
        row.sound_level
    ),
    motion: boolish(row.motion ?? row.pir ?? row.presence ?? row.human_detected),
    aqi: num(row.aqi ?? row.air_quality_index ?? row.airvisual_aqi),
    pm25: num(row.pm25 ?? row.pm2_5 ?? row.pm_2_5),
    outdoorTemp: num(row.outdoor_temp ?? row.weather_temp ?? row.ext_temperature),
    weatherDescription:
      row.weather_description != null
        ? String(row.weather_description)
        : row.weather_main != null
          ? String(row.weather_main)
          : null,
    humidityOutdoor: num(row.outdoor_humidity ?? row.weather_humidity),
  };
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function averageScores(parts: (number | null)[]): number | null {
  const ok = parts.filter((p): p is number => p != null);
  if (!ok.length) return null;
  return ok.reduce((s, x) => s + x, 0) / ok.length;
}

function weightedAverageScore(
  parts: { key: keyof StudySettings["weights"]; value: number | null }[],
  w: StudySettings["weights"]
): number | null {
  let num = 0;
  let den = 0;
  for (const p of parts) {
    if (p.value == null) continue;
    const wt = Math.max(0, Number(w[p.key]) || 0);
    if (wt <= 0) continue;
    num += wt * p.value;
    den += wt;
  }
  return den > 0 ? num / den : null;
}

/** Temperature: ideal band [idealC−1.5, idealC+1.5]; hotter penalised harder than cooler. */
function scoreTemperature(
  c: number | null,
  idealC: number = defaultStudySettings.thresholds.tempIdealC
): number | null {
  if (c == null) return null;
  const lo = idealC - 1.5;
  const hi = idealC + 1.5;
  if (c >= lo && c <= hi) return 100;
  if (c < lo) return clamp(Math.round(100 - (lo - c) * 5), 0, 100);
  return clamp(Math.round(100 - (c - hi) * 7), 0, 100);
}

/** Humidity: ideal 40–60%; dry penalised harder than humid (tropical context). */
function scoreHumidity(h: number | null): number | null {
  if (h == null) return null;
  if (h >= 40 && h <= 60) return 100;
  if (h < 40) return clamp(Math.round(100 - (40 - h) * 4), 0, 100);
  return clamp(Math.round(100 - (h - 60) * 3), 0, 100);
}

/** Light in lux: ideal 300–500 lux = 100; linear penalty below; gentle penalty above. */
function scoreLight(l: number | null): number | null {
  if (l == null) return null;
  if (l >= 300 && l <= 500) return 100;
  if (l < 300) return clamp(Math.round((l / 300) * 100), 0, 100);
  if (l <= 1000) return clamp(Math.round(100 - ((l - 500) / 500) * 25), 0, 100);
  return clamp(Math.round(75 - ((l - 1000) / 1000) * 75), 0, 100);
}

/** Noise: raw ADC from sound sensor; higher ADC = louder. */
function scoreNoise(n: number | null): number | null {
  if (n == null) return null;
  if (n <= 620) return 100;
  if (n <= 750) return clamp(Math.round(100 - ((n - 620) / 130) * 40), 0, 100);
  if (n <= 900) return clamp(Math.round(60 - ((n - 750) / 150) * 55), 0, 100);
  return 0;
}

/** Air quality: continuous linear interpolation between EPA AQI breakpoints. */
function scoreAir(aqi: number | null, pm25: number | null): number | null {
  if (aqi != null) {
    if (aqi <= 50) return 100;
    if (aqi <= 100) return Math.round(100 - ((aqi - 50) / 50) * 30);
    if (aqi <= 150) return Math.round(70 - ((aqi - 100) / 50) * 30);
    if (aqi <= 200) return Math.round(40 - ((aqi - 150) / 50) * 30);
    return 0;
  }
  if (pm25 != null) {
    if (pm25 <= 12) return 100;
    if (pm25 <= 35) return Math.round(100 - ((pm25 - 12) / 23) * 30);
    if (pm25 <= 55) return Math.round(70 - ((pm25 - 35) / 20) * 30);
    if (pm25 <= 150) return Math.round(40 - ((pm25 - 55) / 95) * 30);
    return 0;
  }
  return null;
}

export function suitabilityFromScore(
  score: number | null,
  bands: StudySettings["bands"] = defaultStudySettings.bands
): Suitability | null {
  if (score == null) return null;
  if (score >= bands.goodMin) return "good";
  if (score >= bands.moderateMin) return "moderate";
  return "poor";
}

export type EnvironmentAssessment = {
  score: number | null;
  status: Suitability | null;
  recommendations: string[];
  suitableForStudy: QuestionAnswer;
  lightingSufficient: QuestionAnswer;
  noiseAcceptable: QuestionAnswer;
  airComfortable: QuestionAnswer;
  subscores: {
    temperature: number | null;
    humidity: number | null;
    light: number | null;
    noise: number | null;
    air: number | null;
  };
};

function yn(score: number | null, threshold: number): QuestionAnswer {
  if (score == null) return "unknown";
  return score >= threshold ? "yes" : "no";
}

export function assessEnvironment(
  reading: NormalizedReading | null,
  settings: StudySettings = defaultStudySettings
): EnvironmentAssessment {
  if (!reading) {
    return {
      score: null,
      status: null,
      recommendations: [
        "No sensor row yet. Start the backend and confirm readings are stored in `sensor_data`.",
      ],
      suitableForStudy: "unknown",
      lightingSufficient: "unknown",
      noiseAcceptable: "unknown",
      airComfortable: "unknown",
      subscores: {
        temperature: null,
        humidity: null,
        light: null,
        noise: null,
        air: null,
      },
    };
  }

  const t = scoreTemperature(
    reading.temperature,
    settings.thresholds.tempIdealC
  );
  const h = scoreHumidity(reading.humidity);
  const l = scoreLight(reading.light);
  const n = scoreNoise(reading.noise);
  const a = scoreAir(reading.aqi, reading.pm25);

  const score = weightedAverageScore(
    [
      { key: "temperature", value: t },
      { key: "humidity", value: h },
      { key: "light", value: l },
      { key: "noise", value: n },
      { key: "air", value: a },
    ],
    settings.weights
  );
  const status = suitabilityFromScore(score, settings.bands);

  const recommendations: string[] = [];
  const { th } = { th: settings.thresholds };

  if (reading.temperature != null) {
    if (reading.temperature < th.tempWarnBelowC)
      recommendations.push("Room feels cool — add a layer or gently warm the space.");
    if (reading.temperature > th.tempWarnAboveC)
      recommendations.push("It is quite warm — improve ventilation or cooling if you can.");
  }

  if (reading.humidity != null) {
    if (reading.humidity < th.humidityLowPct)
      recommendations.push("Air is dry — a small humidifier or plants can help.");
    if (reading.humidity > th.humidityHighPct)
      recommendations.push("Humidity is high — dehumidify or air out the room.");
  }

  if (reading.light != null) {
    const lowLight =
      reading.light < th.lightMinLux || (l != null && l < 55);
    if (lowLight) {
      recommendations.push(
        "Lighting looks low for long reading — turn on a desk lamp."
      );
    }
  }

  if (n != null && n < 60) {
    recommendations.push(
      "Noise may break focus — close the door, reduce sources, or try earplugs."
    );
  }

  if (
    reading.aqi != null &&
    reading.aqi > th.aqiPoorAbove &&
    a != null &&
    a < 60
  ) {
    recommendations.push(
      "Air quality index is elevated — ventilate when safe or use filtration."
    );
  } else if (
    reading.pm25 != null &&
    reading.pm25 > th.pm25PoorAbove &&
    a != null &&
    a < 60
  ) {
    recommendations.push(
      "Particulate levels are high — limit outdoor air intake or use a HEPA purifier."
    );
  }

  if (!recommendations.length && status === "good") {
    recommendations.push("Conditions look balanced — good time for deep work.");
  } else if (!recommendations.length) {
    recommendations.push("Minor tweaks could make the space even more comfortable.");
  }

  const ac = settings.answerCutoffs;
  const suitableForStudy: QuestionAnswer =
    score == null ? "unknown" : score >= ac.suitableMin ? "yes" : "no";

  return {
    score,
    status,
    recommendations,
    suitableForStudy,
    lightingSufficient: yn(l, ac.lightingScoreMin),
    noiseAcceptable: yn(n, ac.noiseScoreMin),
    airComfortable:
      a == null ? "unknown" : a >= ac.airScoreMin ? "yes" : "no",
    subscores: {
      temperature: t,
      humidity: h,
      light: l,
      noise: n,
      air: a,
    },
  };
}

export type ProblemRecommendation = { problem: string; recommendation: string };

/** Structured issues for the Insights page (English labels). */
export function getProblemRecommendationPairs(
  reading: NormalizedReading | null,
  assessment: EnvironmentAssessment,
  settings: StudySettings = defaultStudySettings
): ProblemRecommendation[] {
  if (!reading) {
    return [
      {
        problem: "No live sensor reading",
        recommendation:
          "Ensure the backend is ingesting rows into `sensor_data` and refresh the dashboard.",
      },
    ];
  }

  const out: ProblemRecommendation[] = [];
  const th = settings.thresholds;

  if (reading.temperature != null) {
    if (reading.temperature < th.tempWarnBelowC) {
      out.push({
        problem: "Temperature Low (too cold for comfort)",
        recommendation:
          "Warm the room slightly or add clothing; cold hands slow concentration.",
      });
    }
    if (reading.temperature > th.tempWarnAboveC) {
      out.push({
        problem: "Temperature High (heat discomfort)",
        recommendation:
          "Improve airflow, use a fan or AC, and hydrate.",
      });
    }
  }

  if (reading.humidity != null && reading.humidity < th.humidityLowPct) {
    out.push({
      problem: "Humidity Low (dry air)",
      recommendation: "Use a humidifier or place a water basin; take breaks for hydration.",
    });
  }
  if (reading.humidity != null && reading.humidity > th.humidityHighPct) {
    out.push({
      problem: "Humidity High (sticky air)",
      recommendation: "Run a dehumidifier or ventilate to reduce condensation and fatigue.",
    });
  }

  if (reading.light != null && reading.light < th.lightMinLux) {
    out.push({
      problem: "Light Insufficient",
      recommendation: "Use a desk lamp or move closer to window light to reduce eye strain.",
    });
  }

  if (reading.noise != null && (scoreNoise(reading.noise) ?? 100) < 60) {
    out.push({
      problem: "Noise Too High",
      recommendation:
        "Move to a quieter area, close doors/windows facing noise, or use noise‑cancelling headphones.",
    });
  }

  if (reading.aqi != null && reading.aqi > th.aqiPoorAbove) {
    out.push({
      problem: "Poor AQI (IQAir / index)",
      recommendation:
        "Keep windows closed on heavy pollution days; run an air purifier if available.",
    });
  }

  if (reading.pm25 != null && reading.pm25 > th.pm25PoorAbove) {
    out.push({
      problem: "PM2.5 Elevated (OpenAQ)",
      recommendation:
        "Limit vigorous activity indoors; prefer filtered ventilation.",
    });
  }

  if (
    !out.length &&
    assessment.status === "good" &&
    assessment.score != null
  ) {
    out.push({
      problem: "No major issues detected",
      recommendation:
        "Maintain current habits; optional: log scores in `study_index` to track trends.",
    });
  } else if (!out.length) {
    out.push({
      problem: "Minor comfort drift",
      recommendation:
        "Review your weights and thresholds under Settings to match your personal sensitivity.",
    });
  }

  return out;
}

/** Merge API rows from `iq_air`, `openaq_measurements`, `openweather` into a normalized reading. */
export function mergeExternalTablesIntoReading(
  base: NormalizedReading | null,
  iqAir: Record<string, unknown> | null | undefined,
  openaq: Record<string, unknown> | null | undefined,
  openweather: Record<string, unknown> | null | undefined
): NormalizedReading | null {
  if (!base) return null;
  const next: NormalizedReading = { ...base };

  if (iqAir) {
    const v = num(
      iqAir.aqi_us ??
        iqAir.aqi ??
        iqAir.main_aqi ??
        iqAir.air_quality_index ??
        iqAir.aqius
    );
    if (v != null) next.aqi = v;
  }

  if (openaq) {
    const v = num(
      openaq.pm25 ??
        openaq.pm2_5 ??
        openaq.pm_2_5 ??
        (String(openaq.parameter ?? "").toLowerCase().includes("pm2")
          ? openaq.value
          : null)
    );
    if (v != null) next.pm25 = v;
  }

  if (openweather) {
    const ot = num(
      openweather.temp ??
        openweather.temperature ??
        openweather.outdoor_temp ??
        openweather.main_temp
    );
    if (ot != null) next.outdoorTemp = ot;
    const ho = num(openweather.humidity ?? openweather.outdoor_humidity);
    if (ho != null) next.humidityOutdoor = ho;
    const desc =
      openweather.description ??
      openweather.weather_desc ??
      openweather.weather_description ??
      openweather.main ??
      openweather.weather_main;
    if (desc != null) next.weatherDescription = String(desc);
  }

  return next;
}

/** Pull display AQI from an `iq_air` row if present. */
export function aqiFromIqAirRow(row: Record<string, unknown> | null): number | null {
  if (!row) return null;
  return num(
    row.aqi_us ?? row.aqi ?? row.main_aqi ?? row.air_quality_index ?? row.aqius
  );
}

/** Pull PM2.5 from an `openaq_measurements` row if present. */
export function pm25FromOpenaqRow(row: Record<string, unknown> | null): number | null {
  if (!row) return null;
  return num(
    row.pm25 ?? row.pm2_5 ?? row.pm_2_5 ?? row.value
  );
}

export function formatNoiseDisplay(raw: number | null): string {
  if (raw == null) return "—";
  if (raw <= 120) return `${Math.round(raw)} dB (approx.)`;
  return `${Math.round(raw)} (sensor raw)`;
}

export function formatLightDisplay(raw: number | null): string {
  if (raw == null) return "—";
  return `${Math.round(raw)} lux`;
}

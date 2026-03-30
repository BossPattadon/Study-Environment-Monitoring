const sensorModel = require("../models/sensor.model");
const studyIndexModel = require("../models/studyIndex.model");

function dayKey(d) {
  if (d == null) return "";
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const s = String(d);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/**
 * Merged daily rows from `sensor_data` + `study_index`, plus global best/worst hour from scores.
 */
exports.getDailyReport = async (limitDays = 90) => {
  const [sensorDaily, scoreDaily, hourly] = await Promise.all([
    sensorModel.findDailyAverages(limitDays),
    studyIndexModel.findDailyScores(limitDays),
    studyIndexModel.findHourlyAverages(),
  ]);

  const scoreByDay = new Map();
  for (const r of scoreDaily) {
    scoreByDay.set(dayKey(r.day), r);
  }

  const days = sensorDaily.map((row) => {
    const key = dayKey(row.day);
    const si = scoreByDay.get(key);
    return {
      day: key,
      sample_count: row.sample_count != null ? Number(row.sample_count) : 0,
      avg_temperature:
        row.avg_temperature != null ? Number(row.avg_temperature) : null,
      avg_humidity:
        row.avg_humidity != null ? Number(row.avg_humidity) : null,
      avg_light: row.avg_light != null ? Number(row.avg_light) : null,
      avg_noise: row.avg_noise != null ? Number(row.avg_noise) : null,
      avg_score: si?.avg_score != null ? Number(si.avg_score) : null,
      study_sample_count:
        si?.sample_count != null ? Number(si.sample_count) : 0,
    };
  });

  const sensorDaySet = new Set(days.map((d) => d.day));
  for (const r of scoreDaily) {
    const key = dayKey(r.day);
    if (!sensorDaySet.has(key)) {
      days.push({
        day: key,
        sample_count: 0,
        avg_temperature: null,
        avg_humidity: null,
        avg_light: null,
        avg_noise: null,
        avg_score: r.avg_score != null ? Number(r.avg_score) : null,
        study_sample_count:
          r.sample_count != null ? Number(r.sample_count) : 0,
      });
    }
  }

  days.sort((a, b) => b.day.localeCompare(a.day));

  let bestHour = null;
  let worstHour = null;
  if (hourly.length) {
    const sorted = [...hourly].sort(
      (a, b) => Number(b.avg_score) - Number(a.avg_score)
    );
    bestHour =
      sorted[0]?.hour_of_day != null
        ? Number(sorted[0].hour_of_day)
        : null;
    worstHour =
      sorted[sorted.length - 1]?.hour_of_day != null
        ? Number(sorted[sorted.length - 1].hour_of_day)
        : null;
  }

  return {
    days,
    bestHour,
    worstHour,
    hourly: hourly.map((h) => ({
      hour: h.hour_of_day != null ? Number(h.hour_of_day) : null,
      avg_score: h.avg_score != null ? Number(h.avg_score) : null,
      n: h.n != null ? Number(h.n) : 0,
    })),
  };
};

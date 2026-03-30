"use client";

import { useStudySettings } from "@/context/StudySettingsContext";
import type { StudySettings } from "@/lib/study-settings";
import { defaultStudySettings } from "@/lib/study-settings";
import { useEffect, useState, type ReactNode } from "react";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function SettingsPage() {
  const { settings, setSettings, resetSettings } = useStudySettings();
  const [draft, setDraft] = useState<StudySettings>(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const commit = () => setSettings(draft);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          ปรับน้ำหนักคะแนน (weights) และเกณฑ์ (thresholds) สำหรับการประเมินและหน้า Insights —
          บันทึกในเบราว์เซอร์ (localStorage).
        </p>
      </header>

      <div className="space-y-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
        <section>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Score weights
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Higher weight = stronger influence on the combined model score (0 = ignore).
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(
              [
                "temperature",
                "humidity",
                "light",
                "noise",
                "air",
              ] as const
            ).map((key) => (
              <Field key={key} label={key}>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  value={draft.weights[key]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      weights: {
                        ...draft.weights,
                        [key]: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                />
              </Field>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Thresholds
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Temp ideal (°C)">
              <input
                type="number"
                step={0.5}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={draft.thresholds.tempIdealC}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    thresholds: {
                      ...draft.thresholds,
                      tempIdealC: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </Field>
            <Field label="Warn temp below (°C)">
              <input
                type="number"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={draft.thresholds.tempWarnBelowC}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    thresholds: {
                      ...draft.thresholds,
                      tempWarnBelowC: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </Field>
            <Field label="Warn temp above (°C)">
              <input
                type="number"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={draft.thresholds.tempWarnAboveC}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    thresholds: {
                      ...draft.thresholds,
                      tempWarnAboveC: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </Field>
            <Field label="Humidity low (%)">
              <input
                type="number"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={draft.thresholds.humidityLowPct}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    thresholds: {
                      ...draft.thresholds,
                      humidityLowPct: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </Field>
            <Field label="Humidity high (%)">
              <input
                type="number"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={draft.thresholds.humidityHighPct}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    thresholds: {
                      ...draft.thresholds,
                      humidityHighPct: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </Field>
            <Field label="Light min (ADC)">
              <input
                type="number"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={draft.thresholds.lightMinAdc}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    thresholds: {
                      ...draft.thresholds,
                      lightMinAdc: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </Field>
            <Field label="Noise max (dB approx)">
              <input
                type="number"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={draft.thresholds.noiseMaxDb}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    thresholds: {
                      ...draft.thresholds,
                      noiseMaxDb: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </Field>
            <Field label="AQI poor above">
              <input
                type="number"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={draft.thresholds.aqiPoorAbove}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    thresholds: {
                      ...draft.thresholds,
                      aqiPoorAbove: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </Field>
            <Field label="PM2.5 poor above (µg/m³)">
              <input
                type="number"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={draft.thresholds.pm25PoorAbove}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    thresholds: {
                      ...draft.thresholds,
                      pm25PoorAbove: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </Field>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Status bands & answer cutoffs
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Good: score ≥">
              <input
                type="number"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={draft.bands.goodMin}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    bands: {
                      ...draft.bands,
                      goodMin: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </Field>
            <Field label="Moderate: score ≥">
              <input
                type="number"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={draft.bands.moderateMin}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    bands: {
                      ...draft.bands,
                      moderateMin: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </Field>
            <Field label="Lighting score for “yes” ≥">
              <input
                type="number"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={draft.answerCutoffs.lightingScoreMin}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    answerCutoffs: {
                      ...draft.answerCutoffs,
                      lightingScoreMin: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </Field>
            <Field label="Noise score for “yes” ≥">
              <input
                type="number"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={draft.answerCutoffs.noiseScoreMin}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    answerCutoffs: {
                      ...draft.answerCutoffs,
                      noiseScoreMin: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </Field>
            <Field label="Air score for “yes” ≥">
              <input
                type="number"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={draft.answerCutoffs.airScoreMin}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    answerCutoffs: {
                      ...draft.answerCutoffs,
                      airScoreMin: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </Field>
            <Field label="Suitable for study: score ≥">
              <input
                type="number"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={draft.answerCutoffs.suitableMin}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    answerCutoffs: {
                      ...draft.answerCutoffs,
                      suitableMin: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </Field>
          </div>
        </section>

        <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-6 dark:border-zinc-800">
          <button
            type="button"
            onClick={commit}
            className="rounded-full bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-500"
          >
            Save settings
          </button>
          <button
            type="button"
            onClick={() => {
              resetSettings();
              setDraft(defaultStudySettings);
            }}
            className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium dark:border-zinc-600"
          >
            Reset defaults
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useStudySettings } from "@/context/StudySettingsContext";
import {
  assessEnvironment,
  getProblemRecommendationPairs,
  mergeExternalTablesIntoReading,
  normalizeSensorRow,
  type NormalizedReading,
} from "@/lib/study-environment";
import {
  fetchLatestIqAir,
  fetchLatestOpenaq,
  fetchLatestOpenweather,
  fetchLatestSensor,
} from "@/services/api";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function InsightsPage() {
  const { settings } = useStudySettings();
  const [reading, setReading] = useState<NormalizedReading | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [s, iq, oq, ow] = await Promise.all([
        fetchLatestSensor(),
        fetchLatestIqAir().catch(() => null),
        fetchLatestOpenaq().catch(() => null),
        fetchLatestOpenweather().catch(() => null),
      ]);
      const base = normalizeSensorRow(
        s && typeof s === "object" ? (s as Record<string, unknown>) : null
      );
      setReading(
        mergeExternalTablesIntoReading(
          base,
          iq ?? undefined,
          oq ?? undefined,
          ow ?? undefined
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const assessment = useMemo(
    () => assessEnvironment(reading, settings),
    [reading, settings]
  );

  const pairs = useMemo(
    () => getProblemRecommendationPairs(reading, assessment, settings),
    [reading, assessment, settings]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Insights / recommendations
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Problems vs recommendations from your thresholds (Settings) and latest merged data.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Refresh
        </button>
      </header>

      {error ? (
        <p className="mb-6 text-sm text-rose-600 dark:text-rose-400">{error}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {pairs.map((row, i) => (
          <article
            key={i}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60"
          >
            <h2 className="text-sm font-semibold text-rose-700 dark:text-rose-400">
              Problem
            </h2>
            <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
              {row.problem}
            </p>
            <h3 className="mt-4 text-sm font-semibold text-teal-700 dark:text-teal-400">
              Recommendation
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {row.recommendation}
            </p>
          </article>
        ))}
      </div>

      {assessment.recommendations.length ? (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            General tips (model)
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
            {assessment.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

"use client";

import { EnvironmentTrendChart } from "@/components/dashboard/EnvironmentTrendChart";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { useStudySettings } from "@/context/StudySettingsContext";
import {
  aqiFromIqAirRow,
  assessEnvironment,
  formatLightDisplay,
  formatNoiseDisplay,
  mergeExternalTablesIntoReading,
  normalizeSensorRow,
  suitabilityFromScore,
  type NormalizedReading,
  type Suitability,
} from "@/lib/study-environment";
import {
  fetchIqAirHistory,
  fetchLatestIqAir,
  fetchLatestOpenaq,
  fetchLatestOpenweather,
  fetchLatestSensor,
  fetchLatestStudyIndex,
  fetchSensors,
  fetchStudyIndexHistory,
  getApiBaseUrl,
  type IqAirHistoryRow,
  type StudyIndexHistoryRow,
} from "@/services/api";
import { registerChartJs } from "@/components/charts/register-chart";
import type { ChartData, ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";

registerChartJs();
import { useCallback, useEffect, useMemo, useState } from "react";

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function statusStyles(s: Suitability | null): string {
  if (s === "good")
    return "bg-emerald-500/15 text-emerald-800 ring-emerald-500/30 dark:text-emerald-200";
  if (s === "moderate")
    return "bg-amber-500/15 text-amber-900 ring-amber-500/35 dark:text-amber-100";
  if (s === "poor")
    return "bg-rose-500/15 text-rose-900 ring-rose-500/35 dark:text-rose-100";
  return "bg-zinc-500/10 text-zinc-600 ring-zinc-400/20 dark:text-zinc-300";
}

function statusLabel(s: Suitability | null): string {
  if (s === "good") return "Good";
  if (s === "moderate") return "Moderate";
  if (s === "poor") return "Poor";
  return "No data";
}

function MetricCard({
  title,
  value,
  detail,
  accent,
}: {
  title: string;
  value: string;
  detail?: string;
  accent: "rose" | "sky" | "amber" | "violet" | "teal";
}) {
  const bar =
    accent === "rose"
      ? "from-rose-500/80"
      : accent === "sky"
        ? "from-sky-500/80"
        : accent === "amber"
          ? "from-amber-500/80"
          : accent === "violet"
            ? "from-violet-500/80"
            : "from-teal-500/80";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${bar} to-transparent opacity-90`}
      />
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function fmtTs(iso: string) {
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function AqiTrendChart({ rows }: { rows: IqAirHistoryRow[] }) {
  const data: ChartData<"line"> = useMemo(() => ({
    labels: rows.map((r) => fmtTs(r.ts)),
    datasets: [{
      label: "US AQI",
      data: rows.map((r) => r.aqi_us),
      borderColor: "rgb(239,68,68)",
      backgroundColor: "rgba(239,68,68,0.08)",
      borderWidth: 1.5,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.3,
      spanGaps: true,
      fill: false,
    }],
  }), [rows]);

  const options: ChartOptions<"line"> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: { ticks: { color: "#71717a", maxRotation: 0, maxTicksLimit: 6, font: { size: 10 } }, grid: { color: "rgba(113,113,122,0.12)" } },
      y: { ticks: { color: "#71717a", font: { size: 10 } }, grid: { color: "rgba(113,113,122,0.10)" }, title: { display: true, text: "AQI", color: "#71717a" } },
    },
  }), []);

  if (!rows.length) return <div className="flex h-40 items-center justify-center text-sm text-zinc-400">No data</div>;
  return <div className="h-44 w-full"><Line data={data} options={options} /></div>;
}

function StudyScoreChart({ rows }: { rows: StudyIndexHistoryRow[] }) {
  const data: ChartData<"line"> = useMemo(() => ({
    labels: rows.map((r) => fmtTs(r.ts)),
    datasets: [{
      label: "Study score",
      data: rows.map((r) => r.total_score),
      borderColor: "rgb(20,184,166)",
      backgroundColor: "rgba(20,184,166,0.10)",
      borderWidth: 1.5,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.3,
      spanGaps: true,
      fill: true,
    }],
  }), [rows]);

  const options: ChartOptions<"line"> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: { ticks: { color: "#71717a", maxRotation: 0, maxTicksLimit: 6, font: { size: 10 } }, grid: { color: "rgba(113,113,122,0.12)" } },
      y: { min: 0, max: 100, ticks: { color: "#71717a", font: { size: 10 } }, grid: { color: "rgba(113,113,122,0.10)" }, title: { display: true, text: "Score", color: "#71717a" } },
    },
  }), []);

  if (!rows.length) return <div className="flex h-40 items-center justify-center text-sm text-zinc-400">No data</div>;
  return <div className="h-44 w-full"><Line data={data} options={options} /></div>;
}

export function DashboardView() {
  const { settings } = useStudySettings();
  const [reading, setReading] = useState<NormalizedReading | null>(null);
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [iqAir, setIqAir] = useState<Record<string, unknown> | null>(null);
  const [studyIndex, setStudyIndex] = useState<Record<string, unknown> | null>(null);
  const [aqiHistory, setAqiHistory] = useState<IqAirHistoryRow[]>([]);
  const [studyHistory, setStudyHistory] = useState<StudyIndexHistoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [
        latestRaw,
        allRaw,
        iqRow,
        oqRow,
        owRow,
        idxRow,
        aqiHist,
        studyHist,
      ] = await Promise.all([
        fetchLatestSensor(),
        fetchSensors(),
        fetchLatestIqAir().catch(() => null),
        fetchLatestOpenaq().catch(() => null),
        fetchLatestOpenweather().catch(() => null),
        fetchLatestStudyIndex().catch(() => null),
        fetchIqAirHistory(7).catch(() => []),
        fetchStudyIndexHistory(7).catch(() => []),
      ]);
      setAqiHistory(aqiHist);
      setStudyHistory(studyHist);
      const rows = Array.isArray(allRaw) ? allRaw : [];
      setHistory(rows);
      setIqAir(iqRow);
      setStudyIndex(idxRow);
      const base = normalizeSensorRow(
        latestRaw && typeof latestRaw === "object"
          ? (latestRaw as Record<string, unknown>)
          : null
      );
      const merged = mergeExternalTablesIntoReading(
        base,
        iqRow ?? undefined,
        oqRow ?? undefined,
        owRow ?? undefined
      );
      setReading(merged);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 12_000);
    return () => clearInterval(id);
  }, [refresh]);

  const assessment = useMemo(
    () => assessEnvironment(reading, settings),
    [reading, settings]
  );

  const storedScore = useMemo(() => {
    if (!studyIndex) return null;
    return num(
      studyIndex.total_score ??
        studyIndex.totalScore ??
        studyIndex.score ??
        studyIndex.study_score ??
        studyIndex.index_score
    );
  }, [studyIndex]);

  const displayScore =
    storedScore != null && !Number.isNaN(storedScore)
      ? storedScore
      : assessment.score;

  const displayStatus = useMemo(() => {
    if (studyIndex?.status) {
      const raw = String(studyIndex.status).toLowerCase();
      if (raw.includes("good")) return "good";
      if (raw.includes("moderate")) return "moderate";
      if (raw.includes("poor")) return "poor";
    }
    return suitabilityFromScore(displayScore, settings.bands);
  }, [displayScore, settings.bands, studyIndex?.status]);

  const dashboardAqi = useMemo(() => {
    const fromIq = aqiFromIqAirRow(iqAir);
    if (fromIq != null) return fromIq;
    return reading?.aqi ?? null;
  }, [iqAir, reading?.aqi]);

  return (
    <div className="min-h-full bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(20,184,166,0.14),transparent)] dark:bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(20,184,166,0.08),transparent)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
              Dashboard
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Study environment overview
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Live <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">sensor_data</code> with{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">iq_air</code>,{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">openaq_measurements</code>, and{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">openweather</code>.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Refresh now
            </button>
            <p className="text-[11px] text-zinc-500">
              API: {getApiBaseUrl()}
              {updatedAt ? ` · ${updatedAt.toLocaleTimeString()}` : ""}
            </p>
          </div>
        </header>

        {error ? (
          <div
            className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
            role="alert"
          >
            <strong className="font-semibold">Backend error.</strong> {error}
          </div>
        ) : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-200/90 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70 lg:col-span-1 lg:flex-row lg:justify-center">
            <ScoreRing score={displayScore} subtitle="Study score" />
            <div className="flex flex-1 flex-col items-center gap-2 text-center lg:items-start lg:text-left">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${statusStyles(displayStatus)}`}
              >
                Status: {statusLabel(displayStatus)}
              </span>
              {storedScore != null && assessment.score != null && storedScore !== assessment.score ? (
                <p className="text-xs text-zinc-500">
                  Model score (weights): {Math.round(assessment.score)} · Stored{" "}
                  <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">study_index</code>:{" "}
                  {Math.round(storedScore)}
                </p>
              ) : (
                <p className="text-xs text-zinc-500">
                  {storedScore != null
                    ? "Value from latest `study_index` row when available."
                    : "Computed from sensors + air metrics using Settings weights."}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200/90 bg-white/90 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70 lg:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Latest <span className="font-mono text-xs">sensor_data</span>
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <MetricCard
                accent="rose"
                title="Temperature"
                value={
                  reading?.temperature == null
                    ? "—"
                    : `${reading.temperature.toFixed(1)} °C`
                }
              />
              <MetricCard
                accent="sky"
                title="Humidity"
                value={
                  reading?.humidity == null
                    ? "—"
                    : `${Math.round(reading.humidity)} %`
                }
              />
              <MetricCard
                accent="amber"
                title="Light"
                value={formatLightDisplay(reading?.light ?? null)}
              />
              <MetricCard
                accent="violet"
                title="Noise"
                value={formatNoiseDisplay(reading?.noise ?? null)}
              />
            </div>
            <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <MetricCard
                accent="teal"
                title="AQI (iq_air + merged)"
                value={dashboardAqi == null ? "—" : String(Math.round(dashboardAqi))}
                detail="Primary: latest `iq_air` table when the backend returns a row."
              />
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Real-time graph
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Recent samples from <code className="font-mono">sensor_data</code> (all rows).
          </p>
          <div className="mt-3">
            <EnvironmentTrendChart rows={history} />
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
            <h2 className="mb-1 text-sm font-semibold text-rose-600 dark:text-rose-400">Air quality · 7-day AQI</h2>
            <p className="mb-3 text-xs text-zinc-500">Hourly US AQI from IQAir</p>
            <AqiTrendChart rows={aqiHistory} />
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
            <h2 className="mb-1 text-sm font-semibold text-teal-600 dark:text-teal-400">Study index · 7-day trend</h2>
            <p className="mb-3 text-xs text-zinc-500">Hourly averaged total score</p>
            <StudyScoreChart rows={studyHistory} />
          </div>
        </section>
      </div>
    </div>
  );
}

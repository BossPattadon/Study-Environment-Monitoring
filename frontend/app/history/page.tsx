"use client";

import { registerChartJs } from "@/components/charts/register-chart";
import { useStudySettings } from "@/context/StudySettingsContext";
import type { DailyReportRow } from "@/services/api";
import { fetchDailyReport, getApiBaseUrl } from "@/services/api";
import type { ChartOptions } from "chart.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, Line } from "react-chartjs-2";

registerChartJs();

// ── helpers ──────────────────────────────────────────────────────────────────

function formatHour(h: number | null): string {
  if (h == null) return "—";
  const period = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

function avg(nums: (number | null)[]): number | null {
  const valid = nums.filter((v): v is number => v != null);
  if (!valid.length) return null;
  return valid.reduce((s, n) => s + n, 0) / valid.length;
}

function scoreColor(score: number | null, goodMin: number, modMin: number) {
  if (score == null) return "text-zinc-400";
  if (score >= goodMin) return "text-emerald-600 dark:text-emerald-400";
  if (score >= modMin) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function scoreBg(score: number | null, goodMin: number, modMin: number) {
  if (score == null) return "";
  if (score >= goodMin)
    return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-500/30";
  if (score >= modMin)
    return "bg-amber-500/15 text-amber-900 dark:text-amber-100 ring-1 ring-amber-500/30";
  return "bg-rose-500/15 text-rose-900 dark:text-rose-100 ring-1 ring-rose-500/30";
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: "teal" | "rose" | "emerald" | "violet";
}) {
  const bar =
    accent === "teal"
      ? "from-teal-500/80"
      : accent === "rose"
        ? "from-rose-500/80"
        : accent === "emerald"
          ? "from-emerald-500/80"
          : "from-violet-500/80";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${bar} to-transparent`}
      />
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>
      )}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800 ${className ?? ""}`}
    />
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

const LIMIT_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

export default function HistoryPage() {
  const { settings } = useStudySettings();
  const { goodMin, moderateMin } = settings.bands;

  const [limit, setLimit] = useState(30);
  const [data, setData] = useState<{
    days: DailyReportRow[];
    bestHour: number | null;
    worstHour: number | null;
    hourly: { hour: number | null; avg_score: number | null; n: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (lim: number) => {
      try {
        setLoading(true);
        setError(null);
        const report = await fetchDailyReport(lim);
        setData(
          report ?? { days: [], bestHour: null, worstHour: null, hourly: [] }
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void load(limit);
  }, [load, limit]);

  // ── derived stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const days = data?.days ?? [];
    const chronological = [...days].sort((a, b) =>
      a.day.localeCompare(b.day)
    );
    const overallAvgScore = avg(days.map((d) => d.avg_score));
    return { days, chronological, overallAvgScore };
  }, [data?.days]);

  // ── daily line chart ───────────────────────────────────────────────────────

  const dailyChartData = useMemo(
    () => ({
      labels: stats.chronological.map((d) => d.day),
      datasets: [
        {
          label: "Study score",
          data: stats.chronological.map((d) => d.avg_score ?? null),
          borderColor: "rgb(20, 184, 166)",
          backgroundColor: "rgba(20,184,166,0.08)",
          tension: 0.25,
          spanGaps: true,
          fill: true,
          borderWidth: 2.5,
          borderDash: [],
        },
        {
          label: "Light",
          data: stats.chronological.map((d) => d.avg_light_score ?? null),
          borderColor: "rgb(234, 179, 8)",
          tension: 0.25,
          spanGaps: true,
          fill: false,
          borderWidth: 1.5,
          borderDash: [5, 4],
        },
        {
          label: "Noise",
          data: stats.chronological.map((d) => d.avg_noise_score ?? null),
          borderColor: "rgb(168, 85, 247)",
          tension: 0.25,
          spanGaps: true,
          fill: false,
          borderWidth: 1.5,
          borderDash: [5, 4],
        },
        {
          label: "Temp",
          data: stats.chronological.map((d) => d.avg_temp_score ?? null),
          borderColor: "rgb(244, 63, 94)",
          tension: 0.25,
          spanGaps: true,
          fill: false,
          borderWidth: 1.5,
          borderDash: [5, 4],
        },
        {
          label: "Humidity",
          data: stats.chronological.map((d) => d.avg_humidity_score ?? null),
          borderColor: "rgb(100, 116, 139)",
          tension: 0.25,
          spanGaps: true,
          fill: false,
          borderWidth: 1.5,
          borderDash: [5, 4],
        },
        {
          label: "Air",
          data: stats.chronological.map((d) => d.avg_aqi_score ?? null),
          borderColor: "rgb(14, 165, 233)",
          tension: 0.25,
          spanGaps: true,
          fill: false,
          borderWidth: 1.5,
          borderDash: [5, 4],
        },
      ],
    }),
    [stats.chronological]
  );

  const dailyChartOptions: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top", labels: { color: "#71717a", boxWidth: 12 } },
        title: {
          display: true,
          text: "Daily study score vs Light, Noise, Temp, Humidity, Air",
          color: "#71717a",
          font: { size: 13, weight: "bold" },
        },
      },
      scales: {
        x: {
          ticks: { color: "#71717a", maxRotation: 45, maxTicksLimit: 15 },
          grid: { color: "rgba(113,113,122,0.10)" },
        },
        y: {
          min: 0,
          max: 100,
          title: { display: true, text: "Score (0–100)", color: "#71717a" },
          ticks: { color: "#71717a" },
          grid: { color: "rgba(20,184,166,0.08)" },
        },
      },
    }),
    []
  );

  // ── hourly bar chart ───────────────────────────────────────────────────────

  const hourlyChartData = useMemo(() => {
    const byHour = new Map<number, number | null>();
    for (const row of data?.hourly ?? []) {
      if (row.hour != null) byHour.set(row.hour, row.avg_score);
    }
    const labels = Array.from({ length: 24 }, (_, i) =>
      `${String(i).padStart(2, "0")}:00`
    );
    const scores = Array.from({ length: 24 }, (_, i) => byHour.get(i) ?? null);

    const colors = scores.map((s) => {
      if (s == null) return "rgba(113,113,122,0.25)";
      if (s >= goodMin) return "rgba(16,185,129,0.75)";
      if (s >= moderateMin) return "rgba(245,158,11,0.75)";
      return "rgba(244,63,94,0.75)";
    });

    return {
      labels,
      datasets: [
        {
          label: "Avg score",
          data: scores,
          backgroundColor: colors,
          borderRadius: 4,
        },
      ],
    };
  }, [data?.hourly, goodMin, moderateMin]);

  const hourlyChartOptions: ChartOptions<"bar"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Average study score by hour of day",
          color: "#71717a",
          font: { size: 13, weight: "bold" },
        },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              ctx.raw != null ? `Score: ${(ctx.raw as number).toFixed(1)}` : "No data",
          },
        },
      },
      scales: {
        x: { ticks: { color: "#71717a", maxRotation: 45 }, grid: { display: false } },
        y: {
          min: 0,
          max: 100,
          title: { display: true, text: "Score", color: "#71717a" },
          ticks: { color: "#71717a" },
          grid: { color: "rgba(113,113,122,0.10)" },
        },
      },
    }),
    []
  );

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

      {/* header */}
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            History
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Daily aggregates from sensor data and study index scores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {LIMIT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLimit(opt.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                limit === opt.value
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void load(limit)}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ↺
          </button>
        </div>
      </header>

      {/* error */}
      {error && (
        <p className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error} · {getApiBaseUrl()}
        </p>
      )}

      {/* stats cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {loading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </>
        ) : (
          <>
            <StatCard
              label="Days recorded"
              value={String(stats.days.length)}
              sub={`last ${limit} days`}
              accent="teal"
            />
            <StatCard
              label="Avg score"
              value={
                stats.overallAvgScore != null
                  ? stats.overallAvgScore.toFixed(1)
                  : "—"
              }
              sub="across all days"
              accent="emerald"
            />
            <StatCard
              label="Best hour"
              value={formatHour(data?.bestHour ?? null)}
              sub="highest avg score"
              accent="teal"
            />
            <StatCard
              label="Worst hour"
              value={formatHour(data?.worstHour ?? null)}
              sub="lowest avg score"
              accent="rose"
            />
          </>
        )}
      </div>

      {/* daily trend chart */}
      <section className="mb-6 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
        {loading ? (
          <Skeleton className="h-72" />
        ) : stats.days.length ? (
          <div className="h-72">
            <Line data={dailyChartData} options={dailyChartOptions} />
          </div>
        ) : (
          <div className="flex h-72 items-center justify-center text-sm text-zinc-500">
            No daily data yet.
          </div>
        )}
      </section>

      {/* hourly bar chart */}
      <section className="mb-8 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
        {loading ? (
          <Skeleton className="h-56" />
        ) : (data?.hourly?.length ?? 0) > 0 ? (
          <div className="h-56">
            <Bar data={hourlyChartData} options={hourlyChartOptions} />
          </div>
        ) : (
          <div className="flex h-56 items-center justify-center text-sm text-zinc-500">
            No hourly data yet.
          </div>
        )}
      </section>

      {/* data table */}
      <section className="overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Samples</th>
              <th className="px-4 py-3 text-right">Temp (°C)</th>
              <th className="px-4 py-3 text-right">Humidity (%RH)</th>
              <th className="px-4 py-3 text-right">Light (lux)</th>
              <th className="px-4 py-3 text-right">Noise (dB)</th>
              <th className="px-4 py-3 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800/80">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : stats.days.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                  No data available for this period.
                </td>
              </tr>
            ) : (
              [...stats.days]
                .sort((a, b) => b.day.localeCompare(a.day))
                .map((r) => (
                  <tr
                    key={r.day}
                    className="border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800/80 dark:hover:bg-zinc-900/40"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      {r.day}
                    </td>
                    <td className="px-4 py-2.5 text-right text-zinc-600 dark:text-zinc-400">
                      {r.sample_count}
                    </td>
                    <td className="px-4 py-2.5 text-right text-zinc-700 dark:text-zinc-300">
                      {r.avg_temperature != null
                        ? r.avg_temperature.toFixed(1)
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-zinc-700 dark:text-zinc-300">
                      {r.avg_humidity != null ? r.avg_humidity.toFixed(0) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-zinc-700 dark:text-zinc-300">
                      {r.avg_light != null ? r.avg_light.toFixed(0) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-zinc-700 dark:text-zinc-300">
                      {r.avg_noise != null ? r.avg_noise.toFixed(0) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {r.avg_score != null ? (
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${scoreBg(r.avg_score, goodMin, moderateMin)}`}
                        >
                          {r.avg_score.toFixed(1)}
                        </span>
                      ) : (
                        <span className={scoreColor(null, goodMin, moderateMin)}>—</span>
                      )}
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

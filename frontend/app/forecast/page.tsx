"use client";

import { registerChartJs } from "@/components/charts/register-chart";
import type { ForecastEntry, ForecastModel, ForecastResponse } from "@/services/api";
import { fetchForecast, fetchForecastModels } from "@/services/api";
import type { ChartData, ChartOptions } from "chart.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";

registerChartJs();

// ── colour palette ────────────────────────────────────────────────────────────

const PALETTE: Record<keyof Omit<ForecastEntry, "timestamp">, string> = {
  total_score: "rgb(20,184,166)",
  light_score: "rgb(245,158,11)",
  noise_score: "rgb(139,92,246)",
  temp_score: "rgb(239,68,68)",
  humidity_score: "rgb(59,130,246)",
  aqi_score: "rgb(34,197,94)",
};

const LABELS: Record<keyof Omit<ForecastEntry, "timestamp">, string> = {
  total_score: "Total",
  light_score: "Light",
  noise_score: "Noise",
  temp_score: "Temperature",
  humidity_score: "Humidity",
  aqi_score: "Air Quality",
};

type ScoreKey = keyof typeof PALETTE;

const ALL_KEYS: ScoreKey[] = [
  "total_score",
  "light_score",
  "noise_score",
  "temp_score",
  "humidity_score",
  "aqi_score",
];

function fmtLabel(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildChartData(
  recent: ForecastEntry[],
  predictions: ForecastEntry[],
  keys: ScoreKey[]
): ChartData<"line"> {
  const recentLabels = recent.map((r) => fmtLabel(r.timestamp));
  const predLabels = predictions.map((p) => fmtLabel(p.timestamp));
  const labels = [...recentLabels, ...predLabels];
  const nRecent = recentLabels.length;

  const datasets = keys.flatMap((key) => {
    const color = PALETTE[key];
    const label = LABELS[key];
    const actualData = [
      ...recent.map((r) => r[key] as number),
      ...Array(predLabels.length).fill(null),
    ];
    const lastActual = recent.length ? (recent[recent.length - 1][key] as number) : null;
    const predData = [
      ...Array(nRecent > 0 ? nRecent - 1 : 0).fill(null),
      lastActual,
      ...predictions.map((p) => p[key] as number),
    ];
    return [
      {
        label: `${label} (actual)`,
        data: actualData,
        borderColor: color,
        backgroundColor: color.replace("rgb(", "rgba(").replace(")", ", 0.08)"),
        borderWidth: 2,
        borderDash: [],
        pointRadius: 2,
        tension: 0.3,
        spanGaps: false,
        fill: false,
      },
      {
        label: `${label} (forecast)`,
        data: predData,
        borderColor: color,
        backgroundColor: "transparent",
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 2,
        tension: 0.3,
        spanGaps: false,
        fill: false,
      },
    ];
  });

  return { labels, datasets };
}

const chartOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: {
      display: true,
      position: "bottom",
      labels: { color: "#71717a", boxWidth: 12, font: { size: 11 } },
    },
    tooltip: {
      callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)}` },
    },
  },
  scales: {
    x: {
      ticks: { color: "#71717a", maxRotation: 45, font: { size: 10 }, maxTicksLimit: 12 },
      grid: { color: "rgba(113,113,122,0.12)" },
    },
    y: {
      min: 0,
      max: 100,
      ticks: { color: "#71717a" },
      grid: { color: "rgba(113,113,122,0.10)" },
      title: { display: true, text: "Score (0–100)", color: "#71717a" },
    },
  },
};

// ── score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 80
      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-500/30"
      : score >= 50
      ? "bg-amber-500/15 text-amber-900 dark:text-amber-100 ring-1 ring-amber-500/30"
      : "bg-rose-500/15 text-rose-900 dark:text-rose-100 ring-1 ring-rose-500/30";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {score.toFixed(1)}
    </span>
  );
}

// ── model selector ────────────────────────────────────────────────────────────

function ModelSelector({
  models,
  selected,
  disabled,
  onChange,
}: {
  models: ForecastModel[];
  selected: string;
  disabled: boolean;
  onChange: (name: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Model</span>
      <div className="flex rounded-lg border border-zinc-200 p-0.5 gap-0.5 dark:border-zinc-700">
        {models.map((m) => (
          <button
            key={m.name}
            onClick={() => onChange(m.name)}
            disabled={disabled}
            title={m.description}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
              selected === m.name
                ? "bg-teal-600 text-white shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function ForecastPage() {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [models, setModels] = useState<ForecastModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("mlp");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Load available models once on mount
  useEffect(() => {
    fetchForecastModels()
      .then((ms) => { if (ms.length) setModels(ms); })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchForecast(24, selectedModel);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load forecast");
    } finally {
      setLoading(false);
    }
  }, [selectedModel]);

  useEffect(() => { void load(); }, [load]);

  const chartData = useMemo(() => {
    if (!data || data.insufficient_data) return null;
    const keys = showAll ? ALL_KEYS : (["total_score"] as ScoreKey[]);
    return buildChartData(data.recent, data.predictions, keys);
  }, [data, showAll]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 lg:px-8">

      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Study Score Forecast
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            ML-predicted hourly scores for the next 24 hours, based on historical time-of-day patterns.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {models.length > 0 && (
            <ModelSelector
              models={models}
              selected={selectedModel}
              disabled={loading}
              onChange={setSelectedModel}
            />
          )}
          <button
            onClick={() => void load()}
            disabled={loading}
            className="rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition"
          >
            {loading ? "Training…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* model info */}
      {data && !loading && (
        <div className="flex flex-wrap gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="rounded-lg bg-zinc-100 px-3 py-1 dark:bg-zinc-800">
            Trained on{" "}
            <strong className="text-zinc-700 dark:text-zinc-200">{data.trained_on}</strong>{" "}
            historical readings
          </span>
          <span className="rounded-lg bg-teal-50 px-3 py-1 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
            {data.model_label} · {data.model_description}
          </span>
          {data.insufficient_data && (
            <span className="rounded-lg bg-amber-100 px-3 py-1 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              ⚠ Need at least 10 readings to forecast
            </span>
          )}
        </div>
      )}

      {/* error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* loading skeleton */}
      {loading && (
        <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            <p className="text-sm text-zinc-500">Training forecast model…</p>
          </div>
        </div>
      )}

      {/* chart */}
      {!loading && chartData && (
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Actual (solid) vs Forecast (dashed)
            </h2>
            <button
              onClick={() => setShowAll((v) => !v)}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 transition"
            >
              {showAll ? "Show total only" : "Show all sub-scores"}
            </button>
          </div>
          <div className="h-96">
            <Line data={chartData} options={chartOptions} />
          </div>
        </section>
      )}

      {/* hourly prediction table */}
      {!loading && data && !data.insufficient_data && data.predictions.length > 0 && (
        <section className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
          <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Hourly predictions
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-4 py-2 font-medium">Total</th>
                  <th className="px-4 py-2 font-medium">Light</th>
                  <th className="px-4 py-2 font-medium">Noise</th>
                  <th className="px-4 py-2 font-medium">Temp</th>
                  <th className="px-4 py-2 font-medium">Humidity</th>
                  <th className="px-4 py-2 font-medium">Air</th>
                </tr>
              </thead>
              <tbody>
                {data.predictions.map((p) => (
                  <tr
                    key={p.timestamp}
                    className="border-b border-zinc-50 hover:bg-zinc-50/60 dark:border-zinc-800/60 dark:hover:bg-zinc-800/20"
                  >
                    <td className="px-4 py-2 font-mono text-zinc-600 dark:text-zinc-300">
                      {new Date(p.timestamp).toLocaleString([], {
                        weekday: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2"><ScoreBadge score={p.total_score} /></td>
                    <td className="px-4 py-2 text-amber-600 dark:text-amber-400">{p.light_score.toFixed(1)}</td>
                    <td className="px-4 py-2 text-violet-600 dark:text-violet-400">{p.noise_score.toFixed(1)}</td>
                    <td className="px-4 py-2 text-rose-600 dark:text-rose-400">{p.temp_score.toFixed(1)}</td>
                    <td className="px-4 py-2 text-blue-600 dark:text-blue-400">{p.humidity_score.toFixed(1)}</td>
                    <td className="px-4 py-2 text-emerald-600 dark:text-emerald-400">{p.aqi_score.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

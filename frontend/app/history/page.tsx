"use client";

import { registerChartJs } from "@/components/charts/register-chart";
import type { DailyReportRow } from "@/services/api";
import { fetchDailyReport, getApiBaseUrl } from "@/services/api";
import type { ChartOptions } from "chart.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";

registerChartJs();

export default function HistoryPage() {
  const [data, setData] = useState<{
    days: DailyReportRow[];
    bestHour: number | null;
    worstHour: number | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const report = await fetchDailyReport(90);
      if (report) setData(report);
      else setData({ days: [], bestHour: null, worstHour: null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load report");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData = useMemo(() => {
    const days = data?.days ?? [];
    const chronological = [...days].sort((a, b) => a.day.localeCompare(b.day));
    return {
      labels: chronological.map((d) => d.day),
      datasets: [
        {
          label: "Daily avg score (study_index)",
          data: chronological.map((d) =>
            d.avg_score == null ? null : d.avg_score
          ),
          borderColor: "rgb(20, 184, 166)",
          tension: 0.25,
          spanGaps: true,
          yAxisID: "y",
        },
        {
          label: "Avg temp (sensor_data)",
          data: chronological.map((d) =>
            d.avg_temperature == null ? null : d.avg_temperature
          ),
          borderColor: "rgb(244, 63, 94)",
          tension: 0.25,
          spanGaps: true,
          yAxisID: "y1",
        },
      ],
    };
  }, [data?.days]);

  const chartOptions: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        title: {
          display: true,
          text: "Daily averages (merged report)",
          font: { size: 13, weight: "bold" },
        },
      },
      scales: {
        x: { ticks: { maxRotation: 45 } },
        y: {
          type: "linear",
          position: "left",
          title: { display: true, text: "Score" },
        },
        y1: {
          type: "linear",
          position: "right",
          grid: { drawOnChartArea: false },
          title: { display: true, text: "°C" },
        },
      },
    }),
    []
  );

  const formatHour = (h: number | null) =>
    h == null ? "—" : `${String(h).padStart(2, "0")}:00`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            History / report
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Daily aggregates from <code className="font-mono text-xs">sensor_data</code> and{" "}
            <code className="font-mono text-xs">study_index</code> via{" "}
            <code className="font-mono text-xs">/api/reports/daily</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Refresh
        </button>
      </header>

      {error ? (
        <p className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm dark:border-rose-900 dark:bg-rose-950/40">
          {error} · {getApiBaseUrl()}
        </p>
      ) : null}

      {data ? (
        <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Best / worst hour (from <code className="font-mono text-xs">study_index</code> averages)
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Best hour (highest avg score):{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">
              {formatHour(data.bestHour)}
            </strong>{" "}
            · Worst hour:{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">
              {formatHour(data.worstHour)}
            </strong>
          </p>
        </section>
      ) : null}

      <div className="mb-10 h-72 rounded-2xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950/50">
        {data?.days?.length ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            No daily rows yet — populate `sensor_data` and `study_index`.
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/60">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80">
            <tr>
              <th className="px-3 py-2">Day</th>
              <th className="px-3 py-2">Samples</th>
              <th className="px-3 py-2">Avg °C</th>
              <th className="px-3 py-2">Avg %RH</th>
              <th className="px-3 py-2">Avg light</th>
              <th className="px-3 py-2">Avg noise</th>
              <th className="px-3 py-2">Daily score</th>
            </tr>
          </thead>
          <tbody>
            {(data?.days ?? []).map((r) => (
              <tr
                key={r.day}
                className="border-b border-zinc-100 dark:border-zinc-800/80"
              >
                <td className="px-3 py-2 font-mono text-xs">{r.day}</td>
                <td className="px-3 py-2">{r.sample_count}</td>
                <td className="px-3 py-2">
                  {r.avg_temperature == null
                    ? "—"
                    : r.avg_temperature.toFixed(1)}
                </td>
                <td className="px-3 py-2">
                  {r.avg_humidity == null ? "—" : r.avg_humidity.toFixed(0)}
                </td>
                <td className="px-3 py-2">
                  {r.avg_light == null ? "—" : r.avg_light.toFixed(0)}
                </td>
                <td className="px-3 py-2">
                  {r.avg_noise == null ? "—" : r.avg_noise.toFixed(0)}
                </td>
                <td className="px-3 py-2 font-medium">
                  {r.avg_score == null ? "—" : r.avg_score.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { registerChartJs } from "@/components/charts/register-chart";
import type { ChartData, ChartOptions } from "chart.js";
import { useMemo } from "react";
import { Line } from "react-chartjs-2";

registerChartJs();

type Row = Record<string, unknown>;

function pickNum(row: Row, keys: string[]): number | null {
  for (const k of keys) {
    const v = row[k];
    if (v != null && v !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

type Props = {
  rows: Row[];
};

export function EnvironmentTrendChart({ rows }: Props) {
  const { chartData, options } = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const ta = new Date(String(a.timestamp ?? a.created_at ?? 0)).getTime();
      const tb = new Date(String(b.timestamp ?? b.created_at ?? 0)).getTime();
      return ta - tb;
    });

    const labels = sorted.map((item) =>
      new Date(
        String(item.timestamp ?? item.created_at ?? Date.now())
      ).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );

    const temperatures = sorted.map((item) =>
      pickNum(item, ["temperature", "temp"])
    );
    const humidity = sorted.map((item) => pickNum(item, ["humidity"]));
    const light = sorted.map((item) =>
      pickNum(item, ["light", "light_level", "light_intensity", "ldr"])
    );
    const noise = sorted.map((item) =>
      pickNum(item, ["noise", "noise_level", "decibel", "db", "sound_level"])
    );

    const toSeries = (values: (number | null)[]) =>
      values.map((v) => (v == null ? null : v));

    const hasLight = light.some((v) => v != null);
    const hasNoise = noise.some((v) => v != null);

    const datasets: ChartData<"line">["datasets"] = [
      {
        label: "Temperature (°C)",
        data: toSeries(temperatures),
        borderColor: "rgb(244, 63, 94)",
        backgroundColor: "rgba(244, 63, 94, 0.15)",
        yAxisID: "y",
        tension: 0.25,
        spanGaps: true,
      },
      {
        label: "Humidity (%)",
        data: toSeries(humidity),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.12)",
        yAxisID: "y1",
        tension: 0.25,
        spanGaps: true,
      },
    ];

    if (hasLight) {
      datasets.push({
        label: "Light (raw / lx)",
        data: toSeries(light),
        borderColor: "rgb(234, 179, 8)",
        backgroundColor: "rgba(234, 179, 8, 0.12)",
        yAxisID: "y2",
        tension: 0.25,
        spanGaps: true,
      });
    }
    if (hasNoise) {
      datasets.push({
        label: "Noise",
        data: toSeries(noise),
        borderColor: "rgb(139, 92, 246)",
        backgroundColor: "rgba(139, 92, 246, 0.12)",
        yAxisID: hasLight ? "y3" : "y2",
        tension: 0.25,
        spanGaps: true,
      });
    }

    const axisIds = new Set(
      datasets.map((d) => d.yAxisID).filter(Boolean) as string[]
    );

    const data: ChartData<"line"> = { labels, datasets };

    const chartOptions: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        title: {
          display: true,
          text: "Recent sensor trends",
          color: "#71717a",
          font: { size: 13, weight: "bold" },
        },
        legend: {
          labels: { color: "#a1a1aa", boxWidth: 12 },
        },
      },
      scales: {
        x: {
          ticks: { color: "#71717a", maxRotation: 0 },
          grid: { color: "rgba(113,113,122,0.15)" },
        },
        y: {
          type: "linear",
          display: true,
          position: "left",
          title: { display: true, text: "°C" },
          ticks: { color: "#71717a" },
          grid: { color: "rgba(244,63,94,0.08)" },
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          title: { display: true, text: "% RH" },
          grid: { drawOnChartArea: false },
          ticks: { color: "#71717a" },
        },
        ...(axisIds.has("y2")
          ? {
              y2: {
                type: "linear" as const,
                display: true,
                position: "right" as const,
                title: { display: true, text: hasLight ? "Light" : "Noise" },
                grid: { drawOnChartArea: false },
                ticks: { color: "#71717a" },
              },
            }
          : {}),
        ...(axisIds.has("y3")
          ? {
              y3: {
                type: "linear" as const,
                display: true,
                position: "right" as const,
                offset: true,
                title: { display: true, text: "Noise" },
                grid: { drawOnChartArea: false },
                ticks: { color: "#71717a" },
              },
            }
          : {}),
      },
    };

    return { chartData: data, options: chartOptions };
  }, [rows]);

  if (!rows.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        No history yet — chart will fill as samples arrive.
      </div>
    );
  }

  return (
    <div className="h-72 w-full min-h-[16rem] rounded-2xl border border-zinc-200/80 bg-white px-2 pb-2 pt-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
      <Line data={chartData} options={options} />
    </div>
  );
}

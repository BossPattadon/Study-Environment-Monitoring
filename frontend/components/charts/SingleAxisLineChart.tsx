"use client";

import { registerChartJs } from "@/components/charts/register-chart";
import { Line } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { useMemo } from "react";

registerChartJs();

type Row = Record<string, unknown>;

type Props = {
  rows: Row[];
  title: string;
  /** Keys to try for time (first match used). */
  timeKeys?: string[];
  /** Keys to try for Y value. */
  valueKeys: string[];
  yLabel: string;
  borderColor?: string;
  fill?: boolean;
};

function pickTime(row: Row, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (v != null && v !== "") return String(v);
  }
  return null;
}

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

export function SingleAxisLineChart({
  rows,
  title,
  timeKeys = ["timestamp", "created_at", "recorded_at"],
  valueKeys,
  yLabel,
  borderColor = "rgb(20, 184, 166)",
  fill = true,
}: Props) {
  const chartData = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const ta = new Date(pickTime(a, timeKeys) ?? 0).getTime();
      const tb = new Date(pickTime(b, timeKeys) ?? 0).getTime();
      return ta - tb;
    });
    const labels = sorted.map((r) =>
      new Date(pickTime(r, timeKeys) ?? Date.now()).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    const data = sorted.map((r) => pickNum(r, valueKeys));
    return {
      labels,
      datasets: [
        {
          label: yLabel,
          data: data.map((v) => (v == null ? null : v)),
          borderColor,
          backgroundColor: fill
            ? borderColor
                .replace(/^rgb\(/, "rgba(")
                .replace(/\)$/, ", 0.12)")
            : undefined,
          tension: 0.25,
          spanGaps: true,
          fill,
        },
      ],
    };
  }, [rows, timeKeys, valueKeys, yLabel, borderColor, fill]);

  const options: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          color: "#71717a",
          font: { size: 13, weight: "bold" },
        },
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: "#71717a", maxRotation: 45 },
          grid: { color: "rgba(113,113,122,0.12)" },
        },
        y: {
          ticks: { color: "#71717a" },
          grid: { color: "rgba(20,184,166,0.08)" },
          title: { display: true, text: yLabel, color: "#71717a" },
        },
      },
    }),
    [title, yLabel]
  );

  if (!rows.length) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-zinc-300 text-sm text-zinc-500 dark:border-zinc-700">
        No data in range
      </div>
    );
  }

  return (
    <div className="h-64 w-full rounded-2xl border border-zinc-200/80 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
      <Line data={chartData} options={options} />
    </div>
  );
}

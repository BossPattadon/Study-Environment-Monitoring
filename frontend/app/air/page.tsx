"use client";

import { registerChartJs } from "@/components/charts/register-chart";
import type {
  IqAirHistoryRow,
  OpenaqHistoryRow,
  OpenweatherHistoryRow,
} from "@/services/api";
import {
  fetchIqAirHistory,
  fetchLatestIqAir,
  fetchLatestOpenaq,
  fetchLatestOpenweather,
  fetchOpenaqHistory,
  fetchOpenweatherHistory,
  getApiBaseUrl,
} from "@/services/api";
import type { ChartData, ChartOptions } from "chart.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";

registerChartJs();

// ── AQI helpers ───────────────────────────────────────────────────────────────

function aqiCategory(aqi: number | null): { label: string; cls: string } {
  if (aqi == null) return { label: "Unknown", cls: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800" };
  if (aqi <= 50)  return { label: "Good",        cls: "bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/30 dark:text-emerald-200" };
  if (aqi <= 100) return { label: "Moderate",    cls: "bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/30 dark:text-amber-200" };
  if (aqi <= 150) return { label: "Unhealthy (sensitive)", cls: "bg-orange-500/15 text-orange-800 ring-1 ring-orange-500/30 dark:text-orange-200" };
  if (aqi <= 200) return { label: "Unhealthy",   cls: "bg-rose-500/15 text-rose-800 ring-1 ring-rose-500/30 dark:text-rose-200" };
  if (aqi <= 300) return { label: "Very unhealthy", cls: "bg-purple-500/15 text-purple-800 ring-1 ring-purple-500/30 dark:text-purple-200" };
  return { label: "Hazardous", cls: "bg-red-900/20 text-red-900 ring-1 ring-red-700/40 dark:text-red-200" };
}

function num(v: unknown, unit = ""): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) ? `${n}${unit}` : String(v);
}

function fmtTs(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── chart builder ─────────────────────────────────────────────────────────────

function lineChartOptions(title: string, yLabel: string): ChartOptions<"line"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: true, position: "bottom", labels: { color: "#71717a", boxWidth: 12, font: { size: 11 } } },
      title: { display: true, text: title, color: "#71717a", font: { size: 12, weight: "bold" } },
    },
    scales: {
      x: { ticks: { color: "#71717a", maxRotation: 45, font: { size: 10 }, maxTicksLimit: 8 }, grid: { color: "rgba(113,113,122,0.12)" } },
      y: { ticks: { color: "#71717a" }, grid: { color: "rgba(113,113,122,0.10)" }, title: { display: true, text: yLabel, color: "#71717a" } },
    },
  };
}

function makeDataset(label: string, data: (number | null)[], color: string, dashed = false) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color.replace("rgb(", "rgba(").replace(")", ", 0.08)"),
    borderWidth: 1.5,
    borderDash: dashed ? [5, 4] : [],
    pointRadius: 0,
    pointHoverRadius: 4,
    tension: 0.3,
    spanGaps: true,
    fill: false,
  };
}

// ── chart sections ────────────────────────────────────────────────────────────

function AqiChart({ rows }: { rows: IqAirHistoryRow[] }) {
  const data: ChartData<"line"> = useMemo(() => ({
    labels: rows.map((r) => fmtTs(r.ts)),
    datasets: [makeDataset("US AQI", rows.map((r) => r.aqi_us), "rgb(239,68,68)")],
  }), [rows]);

  if (!rows.length) return <EmptyChart />;
  return (
    <div className="h-56 w-full">
      <Line data={data} options={lineChartOptions("US AQI over time", "AQI")} />
    </div>
  );
}

function PmChart({ rows }: { rows: OpenaqHistoryRow[] }) {
  const data: ChartData<"line"> = useMemo(() => ({
    labels: rows.map((r) => fmtTs(r.ts)),
    datasets: [
      makeDataset("PM2.5 (µg/m³)", rows.map((r) => r.pm25), "rgb(139,92,246)"),
    ],
  }), [rows]);

  if (!rows.length) return <EmptyChart />;
  return (
    <div className="h-56 w-full">
      <Line data={data} options={lineChartOptions("Particulate matter over time", "µg/m³")} />
    </div>
  );
}

function WeatherChart({ rows }: { rows: OpenweatherHistoryRow[] }) {
  const tempData: ChartData<"line"> = useMemo(() => ({
    labels: rows.map((r) => fmtTs(r.ts)),
    datasets: [
      makeDataset("Temp (°C)", rows.map((r) => r.temperature), "rgb(239,68,68)"),
      makeDataset("Humidity (%)", rows.map((r) => r.humidity), "rgb(59,130,246)"),
    ],
  }), [rows]);

  if (!rows.length) return <EmptyChart />;
  return (
    <div className="h-56 w-full">
      <Line data={tempData} options={lineChartOptions("Outdoor temperature & humidity", "Value")} />
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-zinc-300 text-sm text-zinc-400 dark:border-zinc-700">
      No historical data in range
    </div>
  );
}

// ── stat card ─────────────────────────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 py-1.5 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{value}</span>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

const DAY_OPTIONS = [1, 3, 7, 14, 30];

export default function AirQualityPage() {
  const [iq, setIq]       = useState<Record<string, unknown> | null>(null);
  const [openaq, setOpenaq] = useState<Record<string, unknown> | null>(null);
  const [ow, setOw]       = useState<Record<string, unknown> | null>(null);
  const [iqHistory, setIqHistory]       = useState<IqAirHistoryRow[]>([]);
  const [oaqHistory, setOaqHistory]     = useState<OpenaqHistoryRow[]>([]);
  const [owHistory, setOwHistory]       = useState<OpenweatherHistoryRow[]>([]);
  const [days, setDays]   = useState(7);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (d: number) => {
    try {
      setError(null);
      const [a, b, c, ah, bh, ch] = await Promise.all([
        fetchLatestIqAir(),
        fetchLatestOpenaq(),
        fetchLatestOpenweather(),
        fetchIqAirHistory(d),
        fetchOpenaqHistory(d),
        fetchOpenweatherHistory(d),
      ]);
      setIq(a); setOpenaq(b); setOw(c);
      setIqHistory(ah); setOaqHistory(bh); setOwHistory(ch);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => { void load(days); }, [load, days]);

  const aqi = Number(iq?.aqi_us ?? iq?.aqi ?? iq?.aqius ?? NaN);
  const aqiCat = aqiCategory(Number.isFinite(aqi) ? aqi : null);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 lg:px-8">

      {/* header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Air Quality
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Real-time readings from IQAir, OpenAQ, and OpenWeatherMap.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Last</span>
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                days === d
                  ? "bg-teal-600 text-white"
                  : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          {error} · {getApiBaseUrl()}
        </div>
      )}

      {/* current AQI hero */}
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Current US AQI</p>
            <p className="mt-1 text-5xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {Number.isFinite(aqi) ? aqi : "—"}
            </p>
            <span className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-medium ${aqiCat.cls}`}>
              {aqiCat.label}
            </span>
          </div>
          {/* EPA AQI scale bar */}
          <div className="flex-1 max-w-xs">
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {[
                { w: "16.7%", bg: "bg-emerald-400" },
                { w: "16.7%", bg: "bg-yellow-400" },
                { w: "16.7%", bg: "bg-orange-400" },
                { w: "16.7%", bg: "bg-rose-500" },
                { w: "16.7%", bg: "bg-purple-600" },
                { w: "16.5%", bg: "bg-red-900" },
              ].map((seg, i) => <div key={i} style={{ width: seg.w }} className={seg.bg} />)}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
              <span>0</span><span>50</span><span>100</span><span>150</span><span>200</span><span>300+</span>
            </div>
            {Number.isFinite(aqi) && (
              <div
                className="relative mt-1 h-2"
                style={{ marginLeft: `${Math.min((aqi / 300) * 100, 98)}%` }}
              >
                <div className="absolute -top-1 h-4 w-0.5 bg-zinc-700 dark:bg-zinc-300" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
          <h2 className="mb-3 text-sm font-semibold text-rose-600 dark:text-rose-400">AQI trend</h2>
          <AqiChart rows={iqHistory} />
        </section>

        <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
          <h2 className="mb-3 text-sm font-semibold text-violet-600 dark:text-violet-400">Particulate matter</h2>
          <PmChart rows={oaqHistory} />
        </section>

        <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
          <h2 className="mb-3 text-sm font-semibold text-sky-600 dark:text-sky-400">Outdoor conditions</h2>
          <WeatherChart rows={owHistory} />
        </section>
      </div>

      {/* current readings detail */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">IQAir · latest</h2>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            <StatRow label="AQI (US)" value={num(iq?.aqi_us ?? iq?.aqi ?? iq?.aqius)} />
            <StatRow label="Main pollutant" value={String(iq?.main_pollutant ?? iq?.mainus ?? "—")} />
            <StatRow label="Recorded" value={iq?.timestamp ? new Date(String(iq.timestamp)).toLocaleString() : "—"} />
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">OpenAQ · latest</h2>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            <StatRow label="PM2.5" value={num(openaq?.pm25 ?? openaq?.pm2_5, " µg/m³")} />
            <StatRow label="Recorded" value={openaq?.timestamp ? new Date(String(openaq.timestamp)).toLocaleString() : "—"} />
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">OpenWeather · latest</h2>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            <StatRow label="Temperature" value={num(ow?.temp ?? ow?.temperature, " °C")} />
            <StatRow label="Humidity"    value={num(ow?.humidity, " %")} />
            <StatRow label="Condition"   value={String(ow?.description ?? ow?.weather_main ?? "—")} />
            <StatRow label="Recorded"    value={ow?.timestamp ? new Date(String(ow.timestamp)).toLocaleString() : "—"} />
          </div>
        </section>
      </div>
    </div>
  );
}

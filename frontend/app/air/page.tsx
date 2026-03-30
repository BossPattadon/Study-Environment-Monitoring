"use client";

import {
  fetchLatestIqAir,
  fetchLatestOpenaq,
  fetchLatestOpenweather,
  getApiBaseUrl,
} from "@/services/api";
import { useCallback, useEffect, useState } from "react";

function num(v: unknown): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : String(v);
}

export default function AirQualityPage() {
  const [iq, setIq] = useState<Record<string, unknown> | null>(null);
  const [openaq, setOpenaq] = useState<Record<string, unknown> | null>(null);
  const [ow, setOw] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [a, b, c] = await Promise.all([
        fetchLatestIqAir(),
        fetchLatestOpenaq(),
        fetchLatestOpenweather(),
      ]);
      setIq(a);
      setOpenaq(b);
      setOw(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Air quality (external data)
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          PM2.5 จาก <code className="font-mono text-xs">openaq_measurements</code>, AQI จาก{" "}
          <code className="font-mono text-xs">iq_air</code>, สภาพอากาศจาก{" "}
          <code className="font-mono text-xs">openweather</code>.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Refresh
        </button>
      </header>

      {error ? (
        <p className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm dark:border-rose-900 dark:bg-rose-950/40">
          {error} · {getApiBaseUrl()}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
          <h2 className="text-sm font-semibold text-teal-700 dark:text-teal-400">
            IQAir · <span className="font-mono text-xs">iq_air</span>
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">AQI</dt>
              <dd className="font-mono font-medium">
                {num(
                  iq?.aqi_us ??
                    iq?.aqi ??
                    iq?.main_aqi ??
                    iq?.aqius ??
                    iq?.air_quality_index
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Recorded</dt>
              <dd className="text-right text-xs text-zinc-600">
                {iq?.timestamp != null
                  ? String(iq.timestamp)
                  : iq?.recorded_at != null
                    ? String(iq.recorded_at)
                    : "—"}
              </dd>
            </div>
          </dl>
          <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-zinc-50 p-2 text-[10px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            {iq ? JSON.stringify(iq, null, 2) : "{}"}
          </pre>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
          <h2 className="text-sm font-semibold text-violet-700 dark:text-violet-400">
            OpenAQ · <span className="font-mono text-xs">openaq_measurements</span>
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">PM2.5</dt>
              <dd className="font-mono font-medium">
                {num(openaq?.pm25 ?? openaq?.pm2_5 ?? openaq?.value)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Parameter</dt>
              <dd className="text-xs">{String(openaq?.parameter ?? "—")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Time</dt>
              <dd className="text-right text-xs text-zinc-600">
                {openaq?.datetime != null
                  ? String(openaq.datetime)
                  : openaq?.date_utc != null
                    ? String(openaq.date_utc)
                    : "—"}
              </dd>
            </div>
          </dl>
          <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-zinc-50 p-2 text-[10px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            {openaq ? JSON.stringify(openaq, null, 2) : "{}"}
          </pre>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
          <h2 className="text-sm font-semibold text-sky-700 dark:text-sky-400">
            OpenWeather · <span className="font-mono text-xs">openweather</span>
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Temp</dt>
              <dd className="font-mono font-medium">
                {num(ow?.temp ?? ow?.temperature)} °C
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Humidity</dt>
              <dd className="font-mono font-medium">{num(ow?.humidity)} %</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Condition</dt>
              <dd className="text-right text-xs">
                {String(ow?.description ?? ow?.weather_main ?? ow?.main ?? "—")}
              </dd>
            </div>
          </dl>
          <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-zinc-50 p-2 text-[10px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            {ow ? JSON.stringify(ow, null, 2) : "{}"}
          </pre>
        </section>
      </div>
    </div>
  );
}

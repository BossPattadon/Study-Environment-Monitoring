"use client";

import { SingleAxisLineChart } from "@/components/charts/SingleAxisLineChart";
import { fetchSensorRange, getApiBaseUrl } from "@/services/api";
import { useCallback, useEffect, useMemo, useState } from "react";

type Preset = "24" | "48" | "168";

export default function SensorsPage() {
  const [preset, setPreset] = useState<Preset>("48");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { startIso, endIso } = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    const hours = preset === "24" ? 24 : preset === "48" ? 48 : 168;
    start.setHours(start.getHours() - hours);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }, [preset]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchSensorRange(startIso, endIso);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load range");
    }
  }, [startIso, endIso]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Sensor detail
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Time Series Graph from <code className="font-mono text-xs">sensor_data</code>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["24", "48", "168"] as const).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setPreset(h)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                preset === h
                  ? "bg-teal-600 text-white"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              }`}
            >
              {h === "168" ? "7 วัน" : `${h} ชม.`}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          {error} · API {getApiBaseUrl()}
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <SingleAxisLineChart
          rows={rows}
          title="Temperature — Time Series"
          valueKeys={["temperature", "temp"]}
          yLabel="°C"
          borderColor="rgb(244, 63, 94)"
        />
        <SingleAxisLineChart
          rows={rows}
          title="Humidity — Time Series"
          valueKeys={["humidity"]}
          yLabel="% RH"
          borderColor="rgb(59, 130, 246)"
        />
        <SingleAxisLineChart
          rows={rows}
          title="Light — Time Series"
          valueKeys={[
            "light",
            "light_level",
            "light_intensity",
            "ldr",
          ]}
          yLabel="raw / lux"
          borderColor="rgb(234, 179, 8)"
        />
        <SingleAxisLineChart
          rows={rows}
          title="Noise — Time Series"
          valueKeys={["noise", "noise_level", "decibel", "db"]}
          yLabel="dB / raw"
          borderColor="rgb(139, 92, 246)"
        />
      </div>
    </div>
  );
}

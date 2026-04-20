function apiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (raw && String(raw).trim()) return String(raw).replace(/\/$/, "");
  return "http://localhost:8000";
}

export function getApiBaseUrl(): string {
  return apiBase();
}

async function parseJsonResponse<T>(res: Response): Promise<T | null> {
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid JSON from API");
  }
}

export async function fetchSensors(): Promise<Record<string, unknown>[] | null> {
  const res = await fetch(`${apiBase()}/api/sensors`, { cache: "no-store" });
  const data = await parseJsonResponse<unknown>(res);
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

export async function fetchLatestSensor(): Promise<Record<
  string,
  unknown
> | null> {
  const res = await fetch(`${apiBase()}/api/sensors/latest`, {
    cache: "no-store",
  });
  return parseJsonResponse<Record<string, unknown>>(res);
}

export async function fetchSensorRange(
  startIso: string,
  endIso: string
): Promise<Record<string, unknown>[]> {
  const u = new URL(`${apiBase()}/api/sensors/range`);
  u.searchParams.set("start", startIso);
  u.searchParams.set("end", endIso);
  const res = await fetch(u.toString(), { cache: "no-store" });
  const data = await parseJsonResponse<unknown>(res);
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

export async function fetchLatestIqAir(): Promise<Record<
  string,
  unknown
> | null> {
  const res = await fetch(`${apiBase()}/api/iq-air/latest`, {
    cache: "no-store",
  });
  return parseJsonResponse<Record<string, unknown>>(res);
}

export async function fetchLatestOpenaq(): Promise<Record<
  string,
  unknown
> | null> {
  const res = await fetch(`${apiBase()}/api/openaq/latest`, {
    cache: "no-store",
  });
  return parseJsonResponse<Record<string, unknown>>(res);
}

export async function fetchLatestOpenweather(): Promise<Record<
  string,
  unknown
> | null> {
  const res = await fetch(`${apiBase()}/api/openweather/latest`, {
    cache: "no-store",
  });
  return parseJsonResponse<Record<string, unknown>>(res);
}

export async function fetchLatestStudyIndex(): Promise<Record<
  string,
  unknown
> | null> {
  const res = await fetch(`${apiBase()}/api/study-index/latest`, {
    cache: "no-store",
  });
  return parseJsonResponse<Record<string, unknown>>(res);
}

export type DailyReportRow = {
  day: string;
  sample_count: number;
  avg_temperature: number | null;
  avg_humidity: number | null;
  avg_light: number | null;
  avg_noise: number | null;
  avg_score: number | null;
  study_sample_count: number;
  avg_light_score: number | null;
  avg_noise_score: number | null;
  avg_temp_score: number | null;
  avg_humidity_score: number | null;
  avg_aqi_score: number | null;
};

export type DailyReportResponse = {
  days: DailyReportRow[];
  bestHour: number | null;
  worstHour: number | null;
  hourly: { hour: number | null; avg_score: number | null; n: number }[];
};

export type BackendWeights = {
  light: number;
  noise: number;
  temperature: number;
  humidity: number;
  air: number;
};

export async function fetchBackendWeights(): Promise<BackendWeights | null> {
  const res = await fetch(`${apiBase()}/api/settings/weights`, { cache: "no-store" });
  return parseJsonResponse<BackendWeights>(res);
}

export async function saveBackendWeights(weights: BackendWeights): Promise<void> {
  await fetch(`${apiBase()}/api/settings/weights`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(weights),
  });
}

export type StudyIndexHistoryRow = { ts: string; total_score: number | null; light_score: number | null; noise_score: number | null; temp_score: number | null; humidity_score: number | null; aqi_score: number | null };

export async function fetchStudyIndexHistory(days = 7): Promise<StudyIndexHistoryRow[]> {
  const u = new URL(`${apiBase()}/api/study-index/history`);
  u.searchParams.set("days", String(days));
  const res = await fetch(u.toString(), { cache: "no-store" });
  const data = await parseJsonResponse<unknown>(res);
  return Array.isArray(data) ? (data as StudyIndexHistoryRow[]) : [];
}

export type IqAirHistoryRow = { ts: string; aqi_us: number | null; main_pollutant: string | null };
export type OpenaqHistoryRow = { ts: string; pm25: number | null; pm10: number | null };
export type OpenweatherHistoryRow = { ts: string; temperature: number | null; humidity: number | null; description: string | null };

export async function fetchIqAirHistory(days = 7): Promise<IqAirHistoryRow[]> {
  const u = new URL(`${apiBase()}/api/iq-air/history`);
  u.searchParams.set("days", String(days));
  const res = await fetch(u.toString(), { cache: "no-store" });
  const data = await parseJsonResponse<unknown>(res);
  return Array.isArray(data) ? (data as IqAirHistoryRow[]) : [];
}

export async function fetchOpenaqHistory(days = 7): Promise<OpenaqHistoryRow[]> {
  const u = new URL(`${apiBase()}/api/openaq/history`);
  u.searchParams.set("days", String(days));
  const res = await fetch(u.toString(), { cache: "no-store" });
  const data = await parseJsonResponse<unknown>(res);
  return Array.isArray(data) ? (data as OpenaqHistoryRow[]) : [];
}

export async function fetchOpenweatherHistory(days = 7): Promise<OpenweatherHistoryRow[]> {
  const u = new URL(`${apiBase()}/api/openweather/history`);
  u.searchParams.set("days", String(days));
  const res = await fetch(u.toString(), { cache: "no-store" });
  const data = await parseJsonResponse<unknown>(res);
  return Array.isArray(data) ? (data as OpenweatherHistoryRow[]) : [];
}

export type ForecastEntry = {
  timestamp: string;
  total_score: number;
  light_score: number;
  noise_score: number;
  temp_score: number;
  humidity_score: number;
  aqi_score: number;
};

export type ForecastResponse = {
  trained_on: number;
  insufficient_data: boolean;
  recent: ForecastEntry[];
  predictions: ForecastEntry[];
};

export async function fetchForecast(hours = 24): Promise<ForecastResponse | null> {
  const u = new URL(`${apiBase()}/api/forecast`);
  u.searchParams.set("hours", String(hours));
  const res = await fetch(u.toString(), { cache: "no-store" });
  return parseJsonResponse<ForecastResponse>(res);
}

export async function fetchDailyReport(
  limit = 90
): Promise<DailyReportResponse | null> {
  const u = new URL(`${apiBase()}/api/reports/daily`);
  u.searchParams.set("limit", String(limit));
  const res = await fetch(u.toString(), { cache: "no-store" });
  return parseJsonResponse<DailyReportResponse>(res);
}

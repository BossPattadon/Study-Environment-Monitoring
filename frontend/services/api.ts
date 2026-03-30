function apiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (raw && String(raw).trim()) return String(raw).replace(/\/$/, "");
  return "http://localhost:5000";
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
};

export type DailyReportResponse = {
  days: DailyReportRow[];
  bestHour: number | null;
  worstHour: number | null;
  hourly: { hour: number | null; avg_score: number | null; n: number }[];
};

export async function fetchDailyReport(
  limit = 90
): Promise<DailyReportResponse | null> {
  const u = new URL(`${apiBase()}/api/reports/daily`);
  u.searchParams.set("limit", String(limit));
  const res = await fetch(u.toString(), { cache: "no-store" });
  return parseJsonResponse<DailyReportResponse>(res);
}

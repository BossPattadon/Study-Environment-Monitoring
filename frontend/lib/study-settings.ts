export type StudySettings = {
  weights: {
    temperature: number;
    humidity: number;
    light: number;
    noise: number;
    air: number;
  };
  thresholds: {
    tempIdealC: number;
    tempWarnBelowC: number;
    tempWarnAboveC: number;
    humidityLowPct: number;
    humidityHighPct: number;
    lightMinAdc: number;
    noiseMaxDb: number;
    aqiPoorAbove: number;
    pm25PoorAbove: number;
  };
  /** Minimum overall score (0–100) for Good / Moderate status bands. */
  bands: { goodMin: number; moderateMin: number };
  /** Subscore cutoffs for “yes/no” answers. */
  answerCutoffs: {
    lightingScoreMin: number;
    noiseScoreMin: number;
    airScoreMin: number;
    suitableMin: number;
  };
};

export const defaultStudySettings: StudySettings = {
  weights: {
    temperature: 1,
    humidity: 1,
    light: 1,
    noise: 1,
    air: 1,
  },
  thresholds: {
    tempIdealC: 22,
    tempWarnBelowC: 19,
    tempWarnAboveC: 26,
    humidityLowPct: 35,
    humidityHighPct: 65,
    lightMinAdc: 200,
    noiseMaxDb: 65,
    aqiPoorAbove: 100,
    pm25PoorAbove: 35,
  },
  bands: { goodMin: 72, moderateMin: 48 },
  answerCutoffs: {
    lightingScoreMin: 52,
    noiseScoreMin: 55,
    airScoreMin: 58,
    suitableMin: 52,
  },
};

const STORAGE_KEY = "study-monitor-settings-v1";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge<T extends Record<string, unknown>>(
  base: T,
  patch: Record<string, unknown>
): T {
  const out = { ...base } as Record<string, unknown>;
  for (const [k, pv] of Object.entries(patch)) {
    if (isPlainObject(pv) && isPlainObject(out[k] as unknown)) {
      out[k] = deepMerge(
        out[k] as Record<string, unknown>,
        pv
      ) as unknown;
    } else if (pv !== undefined) {
      out[k] = pv;
    }
  }
  return out as T;
}

export function mergeStudySettings(partial: Partial<StudySettings>): StudySettings {
  return deepMerge(
    defaultStudySettings as unknown as Record<string, unknown>,
    partial as unknown as Record<string, unknown>
  ) as StudySettings;
}

export function loadStudySettingsFromStorage(): StudySettings {
  if (typeof window === "undefined") return defaultStudySettings;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStudySettings;
    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed)) return defaultStudySettings;
    return mergeStudySettings(parsed as Partial<StudySettings>);
  } catch {
    return defaultStudySettings;
  }
}

export function saveStudySettingsToStorage(s: StudySettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

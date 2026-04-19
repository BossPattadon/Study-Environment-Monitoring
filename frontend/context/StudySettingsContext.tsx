"use client";

import type { StudySettings } from "@/lib/study-settings";
import {
  defaultStudySettings,
  loadStudySettingsFromStorage,
  saveStudySettingsToStorage,
} from "@/lib/study-settings";
import { fetchBackendWeights, saveBackendWeights } from "@/services/api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type StudySettingsContextValue = {
  settings: StudySettings;
  setSettings: (next: StudySettings) => void;
  resetSettings: () => void;
};

const StudySettingsContext = createContext<StudySettingsContextValue | null>(
  null
);

export function StudySettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<StudySettings>(
    defaultStudySettings
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettingsState(loadStudySettingsFromStorage());
    setHydrated(true);
  }, []);

  const setSettings = useCallback((next: StudySettings) => {
    setSettingsState(next);
    saveStudySettingsToStorage(next);
    void saveBackendWeights(next.weights);
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState(defaultStudySettings);
    saveStudySettingsToStorage(defaultStudySettings);
    void saveBackendWeights(defaultStudySettings.weights);
  }, []);

  // On first load, push localStorage weights to backend so they stay in sync
  useEffect(() => {
    void fetchBackendWeights().catch(() => null);
  }, []);

  const value = useMemo(
    () => ({ settings, setSettings, resetSettings }),
    [settings, setSettings, resetSettings]
  );

  if (!hydrated) {
    return (
      <StudySettingsContext.Provider value={value}>
        {children}
      </StudySettingsContext.Provider>
    );
  }

  return (
    <StudySettingsContext.Provider value={value}>
      {children}
    </StudySettingsContext.Provider>
  );
}

export function useStudySettings(): StudySettingsContextValue {
  const ctx = useContext(StudySettingsContext);
  if (!ctx) {
    throw new Error("useStudySettings must be used within StudySettingsProvider");
  }
  return ctx;
}

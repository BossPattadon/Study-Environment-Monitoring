"use client";

import type { StudySettings } from "@/lib/study-settings";
import {
  defaultStudySettings,
  loadStudySettingsFromStorage,
  saveStudySettingsToStorage,
} from "@/lib/study-settings";
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
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState(defaultStudySettings);
    saveStudySettingsToStorage(defaultStudySettings);
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

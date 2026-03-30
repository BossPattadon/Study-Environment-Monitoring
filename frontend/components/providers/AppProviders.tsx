"use client";

import { AppShell } from "@/components/layout/AppShell";
import { StudySettingsProvider } from "@/context/StudySettingsContext";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <StudySettingsProvider>
      <AppShell>{children}</AppShell>
    </StudySettingsProvider>
  );
}

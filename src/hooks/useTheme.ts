import { useCallback, useEffect, useState } from "react";
import { safeStorage } from "../lib/storage";
import type { ThemeMode } from "../types/app";

export const THEME_STORAGE_KEY = "t2a:theme";

export interface ThemeControl {
  theme: ThemeMode;
  toggleTheme: () => void;
}

function readInitialTheme(): ThemeMode {
  const saved = safeStorage.get(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;

  const prefersDark =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function useTheme(): ThemeControl {
  const [theme, setTheme] = useState<ThemeMode>(readInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = theme === "light" ? "dark" : "light";
    setTheme(next);
    safeStorage.set(THEME_STORAGE_KEY, next);
  }, [theme]);

  return { theme, toggleTheme };
}

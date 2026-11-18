import { useCallback, useEffect, useState } from "react";
import type { ThemeMode } from "../types/app";

export interface ThemeControl {
  theme: ThemeMode;
  toggleTheme: () => void;
}

export function useTheme(initialTheme: ThemeMode = "light"): ThemeControl {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }, []);

  return { theme, toggleTheme };
}

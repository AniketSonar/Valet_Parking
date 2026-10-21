import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  THEME_OPTIONS,
  readThemePreference,
  resolveThemePreference,
  writeThemePreference,
} from "./theme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readThemePreference);
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveThemePreference(readThemePreference()));

  useEffect(() => {
    const syncTheme = () => {
      const nextTheme = resolveThemePreference(preference);
      document.documentElement.dataset.theme = nextTheme;
      setResolvedTheme(nextTheme);
    };

    syncTheme();

    if (preference !== "auto") {
      return undefined;
    }

    const intervalId = window.setInterval(syncTheme, 60 * 60 * 1000);
    window.addEventListener("focus", syncTheme);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", syncTheme);
    };
  }, [preference]);

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      setPreference: (nextPreference) => {
        if (!THEME_OPTIONS.includes(nextPreference)) return;
        writeThemePreference(nextPreference);
        setPreference(nextPreference);
      },
    }),
    [preference, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export const THEME_STORAGE_KEY = "aura_theme_preference";
export const THEME_OPTIONS = ["light", "dark", "auto"];

export function readThemePreference() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_OPTIONS.includes(saved) ? saved : "auto";
  } catch {
    return "auto";
  }
}

export function writeThemePreference(preference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Ignore storage failures in restricted browsers.
  }
}

export function resolveThemePreference(preference) {
  if (preference === "light" || preference === "dark") {
    return preference;
  }

  const now = new Date();
  if (!Number.isNaN(now.getTime())) {
    const minutes = now.getHours() * 60 + now.getMinutes();
    return minutes >= 360 && minutes < 1080 ? "light" : "dark";
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

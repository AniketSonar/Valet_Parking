import { MoonStar, SunMedium, Orbit } from "lucide-react";
import { useTheme } from "../ThemeContext";

function ThemeToggle() {
  const { preference, resolvedTheme, setPreference } = useTheme();

  return (
    <div className="theme-toggle" aria-label="Theme preference">
      <button
        type="button"
        className={preference === "light" ? "active" : ""} 
        onClick={() => setPreference("light")}
        title="Light mode"
      >
        <SunMedium size={15} />
        <span>Light</span>
      </button>
      <button
        type="button"
        className={preference === "dark" ? "active" : ""} 
        onClick={() => setPreference("dark")}
        title="Dark mode"
      >
        <MoonStar size={15} />
        <span>Dark</span>
      </button>
      <button
        type="button"
        className={preference === "auto" ? "active" : ""}
        onClick={() => setPreference("auto")}
        title="Automatic mode"
      >
        <Orbit size={15} />
        <span>Auto</span>
      </button>
      <span className="theme-indicator" data-theme={resolvedTheme} aria-hidden="true" />
    </div>
  );
}

export default ThemeToggle;

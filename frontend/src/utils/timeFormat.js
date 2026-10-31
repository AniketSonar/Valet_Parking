import { useState, useEffect } from "react";

/**
 * Universal Real-time Date and Time Formatter (Indian Standard / Local Time)
 */

export const formatTime = (value) => {
  if (!value) return "—";
  const date = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
  if (!date || isNaN(date.getTime?.())) return "—";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatDate = (value) => {
  if (!value) return "—";
  const date = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
  if (!date || isNaN(date.getTime?.())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (value) => {
  if (!value) return "—";
  const date = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
  if (!date || isNaN(date.getTime?.())) return "—";

  return `${formatDate(date)}, ${formatTime(date)}`;
};

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

export const formatElapsed = (startTime, endTime = null) => {
  if (!startTime) return "--:--:--";
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  if (isNaN(start) || isNaN(end) || end < start) return "00:00:00";

  const totalSeconds = Math.floor((end - start) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Hook providing a live ticking clock every second
 */
export const useLiveClock = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return { now, timeStr, dateStr, greeting };
};

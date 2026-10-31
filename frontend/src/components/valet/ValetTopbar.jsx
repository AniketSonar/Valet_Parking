import React, { useMemo } from "react";
import { Search, ChevronDown, Clock } from "lucide-react";

import NotificationCenter from "../notifications/NotificationCenter";
import { useLiveClock } from "../../utils/timeFormat";

import "./css/ValetTopbar.css";

const ValetTopbar = ({
  onProfile,
}) => {
  const liveClock = useLiveClock();
  const user = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("user") || "{}"
      );
    } catch {
      return {};
    }
  }, []);

  const name =
    user?.name ||
    user?.user_metadata?.name ||
    "Valet";

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <header className="valet-topbar">
      <div className="valet-topbar-search">
        <Search size={17} />

        <input
          type="text"
          placeholder="Search vehicles, tickets..."
          aria-label="Search"
        />
      </div>

      <div className="valet-topbar-actions">
        <div
          className="valet-live-clock"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "5px 12px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(212, 175, 55, 0.22)",
            borderRadius: "999px",
            color: "#f8e6c8",
            fontSize: "0.8rem",
            fontWeight: "500",
            fontVariantNumeric: "tabular-nums"
          }}
          title="Current Real Time"
        >
          <Clock size={13} style={{ color: "#d4af37" }} />
          <span style={{ fontWeight: "700", color: "#ffffff" }}>{liveClock.timeStr}</span>
        </div>

        <NotificationCenter />

        <button
          type="button"
          className="valet-profile-chip"
          onClick={onProfile}
        >
          <span className="valet-avatar">
            {initials || "V"}
          </span>

          <span className="valet-profile-text">
            <strong>{name}</strong>
            <small>Valet</small>
          </span>

          <ChevronDown size={16} />
        </button>
      </div>
    </header>
  );
};

export default ValetTopbar;
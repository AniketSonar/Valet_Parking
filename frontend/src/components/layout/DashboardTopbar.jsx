import React, { useMemo } from "react";
import {
  Menu,
  Bell,
  ChevronDown,
  User,
  Clock,
} from "lucide-react";

import NotificationCenter from "../notifications/NotificationCenter";
import { useLiveClock } from "../../utils/timeFormat";
import "./css/DashboardLayout.css";

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}") || {};
  } catch {
    return {};
  }
};

/**
 * Shared Luxury Topbar:
 * - Notification bell with badge & Admin profile pill
 */
const DashboardTopbar = ({ config, user: userOverride, onProfile, onToggleSidebar }) => {
  const stored = useMemo(() => readStoredUser(), []);
  const user = userOverride || stored;
  const liveClock = useLiveClock();

  const name =
    user?.name ||
    user?.user_metadata?.name ||
    config?.defaultName ||
    "Admin";

  return (
    <header className="dash-topbar lux-topbar">
      {/* LEFT: TOGGLE BUTTON & LIVE REAL-TIME CLOCK */}
      <div className="lux-topbar-left" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <button
          type="button"
          className="lux-topbar-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
        >
          <Menu size={20} />
        </button>

        <div
          className="lux-topbar-live-clock"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 14px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(212, 175, 55, 0.25)",
            borderRadius: "999px",
            color: "#f8e6c8",
            fontSize: "0.82rem",
            fontWeight: "500",
            letterSpacing: "0.3px",
            backdropFilter: "blur(6px)"
          }}
          title="Current Real Time"
        >
          <Clock size={13} style={{ color: "#d4af37" }} />
          <span style={{ fontWeight: "700", color: "#ffffff", fontVariantNumeric: "tabular-nums" }}>
            {liveClock.timeStr}
          </span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span style={{ color: "rgba(248, 230, 200, 0.8)", fontSize: "0.78rem" }}>
            {liveClock.dateStr}
          </span>
        </div>
      </div>

      {/* RIGHT: NOTIFICATIONS & ADMIN PROFILE CHIP */}
      <div className="dash-topbar-actions lux-topbar-right">
        {/* Notification bell with badge */}
        <div className="lux-notif-wrap">
          <NotificationCenter />
        </div>

        {/* Profile Chip (Admin ▾) */}
        <button
          type="button"
          className="lux-profile-chip"
          onClick={onProfile}
          title="Account settings"
        >
          <div className="lux-avatar-circle">
            <User size={15} />
          </div>
          <span className="lux-profile-name">{name}</span>
          <ChevronDown size={14} className="lux-profile-arrow" />
        </button>
      </div>
    </header>
  );
};

export default DashboardTopbar;

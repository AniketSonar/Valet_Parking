import React, { useMemo } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
const DashboardTopbar = ({
  config,
  user: userOverride,
  onProfile,
  onToggleSidebar,
  sidebarExpanded,
  isMobile,
}) => {
  const stored = useMemo(() => readStoredUser(), []);
  const user = userOverride || stored;
  const liveClock = useLiveClock();
  const SidebarToggleIcon = sidebarExpanded ? ChevronLeft : ChevronRight;
  const sidebarToggleLabel = isMobile
    ? sidebarExpanded
      ? "Close navigation"
      : "Open navigation"
    : sidebarExpanded
      ? "Collapse sidebar"
      : "Expand sidebar";

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
          aria-label={sidebarToggleLabel}
          aria-expanded={sidebarExpanded}
        >
          <SidebarToggleIcon size={20} />
        </button>
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

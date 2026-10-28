import React, { useMemo } from "react";
import {
  Menu,
  Bell,
  ChevronDown,
  User,
} from "lucide-react";

import NotificationCenter from "../notifications/NotificationCenter";
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

  const name =
    user?.name ||
    user?.user_metadata?.name ||
    config?.defaultName ||
    "Admin";

  return (
    <header className="dash-topbar lux-topbar">
      {/* LEFT: TOGGLE BUTTON ONLY */}
      <div className="lux-topbar-left">
        <button
          type="button"
          className="lux-topbar-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
        >
          <Menu size={20} />
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

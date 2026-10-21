import React, { useMemo } from "react";
import { Search, ChevronDown } from "lucide-react";

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
 * Shared topbar for every dashboard.
 * `user` (optional) overrides the logged-in user from localStorage,
 * e.g. the customer portal passes the freshly loaded customer record.
 */
const DashboardTopbar = ({ config, user: userOverride, onProfile }) => {
  const stored = useMemo(() => readStoredUser(), []);
  const user = userOverride || stored;

  const name =
    user?.name ||
    user?.user_metadata?.name ||
    config.defaultName ||
    "User";

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <header className="dash-topbar">
      <div className="dash-topbar-search">
        <Search size={17} />

        <input
          type="text"
          placeholder={config.searchPlaceholder || "Search..."}
          aria-label="Search"
        />
      </div>

      <div className="dash-topbar-actions">
        <NotificationCenter />

        <button
          type="button"
          className="dash-profile-chip"
          onClick={onProfile}
          title="View profile"
        >
          <span className="dash-avatar">{initials}</span>

          <span className="dash-profile-text">
            <strong>{name}</strong>
            <small>{config.roleLabel}</small>
          </span>

          <ChevronDown size={16} />
        </button>
      </div>
    </header>
  );
};

export default DashboardTopbar;

import React from "react";
import "./css/ParkingAdminTopbar.css";
import {
  Search,
  ChevronDown,
  Clock,
} from "lucide-react";

import NotificationCenter from "../notifications/NotificationCenter";
import { useLiveClock } from "../../utils/timeFormat";

const ParkingAdminTopbar = ({
  activeTab,
  setActiveTab,
  onLogout,
}) => {
  const liveClock = useLiveClock();
  let user = {
    name: "Manager",
    email: "admin@valetparking.com",
  };

  try {
    const stored = localStorage.getItem("user");

    if (stored) {
      user = JSON.parse(stored);
    }
  } catch (e) {
    // fallback
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "M";

  return (
    <header className="app-topbar">
      <div className="breadcrumb">
        <span>Admin</span> /{" "}
        <strong className="capitalize">
          {activeTab}
        </strong>
      </div>

      <div className="topbar-right">
        <div
          className="admin-live-clock"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "6px 12px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(212, 175, 55, 0.25)",
            borderRadius: "999px",
            color: "#f8e6c8",
            fontSize: "0.8rem",
            fontWeight: "500",
            fontVariantNumeric: "tabular-nums"
          }}
          title="Current Real Time"
        >
          <Clock size={13} style={{ color: "#d4af37" }} />
          <strong style={{ color: "#ffffff" }}>{liveClock.timeStr}</strong>
        </div>

        <div className="search-bar">
          <span className="search-icon">
            <Search size={16} />
          </span>

          <input
            type="text"
            placeholder="Search..."
          />
        </div>

        <NotificationCenter />

        <div
          className="profile-chip"
          style={{ cursor: "pointer" }}
          onClick={() =>
            setActiveTab &&
            setActiveTab("profile")
          }
          title="View Profile"
        >
          <div className="profile-avatar">
            {initials}
          </div>

          <div className="profile-meta">
            <strong>
              {user.name || "Manager"}
            </strong>

            <span>Manager</span>
          </div>

          <span className="dropdown-arrow">
            <ChevronDown size={14} />
          </span>
        </div>
      </div>
    </header>
  );
};

export default ParkingAdminTopbar;
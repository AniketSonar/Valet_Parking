import React from "react";
import { Bell, Search, ChevronDown, Clock } from "lucide-react";
import { useLiveClock } from "../../utils/timeFormat";
import "./css/ReceptionTopbar.css";

const ReceptionTopbar = ({ activeTab, setActiveTab, onLogout }) => {
  const liveClock = useLiveClock();
  let user = { name: "Reception", email: "reception@valetparking.com" };
  try {
    const stored = localStorage.getItem("user");
    if (stored) user = JSON.parse(stored);
  } catch (e) {
    // fallback
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "RC";

  const tabLabels = {
    dashboard: "Dashboard",
    sessions: "Active Sessions",
    customers: "Customers",
    vehicles: "Vehicles",
    keys: "Key Management",
    profile: "My Profile",
  };

  return (
    <header className="app-topbar">
      <div className="breadcrumb">
        <span>Reception</span> / <strong className="capitalize">{tabLabels[activeTab] || activeTab}</strong>
      </div>

      <div className="topbar-right">
        <div
          className="reception-live-clock"
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
          <span className="search-icon"><Search size={16} /></span>
          <input type="text" placeholder="Search sessions, customers..." />
        </div>

        <button className="notification-bell" type="button" title="Notifications">
          <Bell size={18} />
          <span className="bell-badge"></span>
        </button>

        <div
          className="profile-chip"
          style={{ cursor: "pointer" }}
          onClick={() => setActiveTab && setActiveTab("profile")}
          title="View Profile"
        >
          <div className="profile-avatar">{initials}</div>
          <div className="profile-meta">
            <strong>{user.name || "Reception"}</strong>
            <span>Reception Desk</span>
          </div>
          <span className="dropdown-arrow"><ChevronDown size={14} /></span>
        </div>
      </div>
    </header>
  );
};

export default ReceptionTopbar;

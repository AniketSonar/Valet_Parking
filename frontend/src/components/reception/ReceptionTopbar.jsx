import React from "react";
import { Bell, Search, ChevronDown } from "lucide-react";
import "./css/ReceptionTopbar.css";

const ReceptionTopbar = ({ activeTab, setActiveTab, onLogout }) => {
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
    <header className="aura-topbar">
      <div className="breadcrumb">
        <span>Reception</span> / <strong className="capitalize">{tabLabels[activeTab] || activeTab}</strong>
      </div>

      <div className="topbar-right">
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

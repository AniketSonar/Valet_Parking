import React from "react";
import "./css/ParkingAdminTopbar.css";
import {
  Search,
  ChevronDown,
} from "lucide-react";

import NotificationCenter from "../notifications/NotificationCenter";

const ParkingAdminTopbar = ({
  activeTab,
  setActiveTab,
  onLogout,
}) => {
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
    <header className="aura-topbar">
      <div className="breadcrumb">
        <span>Admin</span> /{" "}
        <strong className="capitalize">
          {activeTab}
        </strong>
      </div>

      <div className="topbar-right">
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
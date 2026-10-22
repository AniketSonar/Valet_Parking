import React, { useMemo } from "react";
import { Search, ChevronDown } from "lucide-react";

import NotificationCenter from "../notifications/NotificationCenter";

import "./css/ValetTopbar.css";

const ValetTopbar = ({
  onProfile,
}) => {
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
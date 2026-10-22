import {
  ChevronDown,
  Search,
  LogOut,
  UserRound,
} from "lucide-react";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NotificationCenter from "../notifications/NotificationCenter";
import "./Topbar.css";

function Topbar({ setActivePage }) {
  const navigate = useNavigate();

  const [showProfile, setShowProfile] = useState(false);

  let user = {
    name: "Super Admin",
    email: "admin@valetparking.com",
  };

  try {
    const stored = localStorage.getItem("user");

    if (stored) {
      user = JSON.parse(stored);
    }
  } catch (e) {
    // Keep fallback user
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SA";

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    navigate("/", { replace: true });
  };

  const toggleProfile = () => {
    setShowProfile((prev) => !prev);
  };

  const openProfile = () => {
    setShowProfile(false);

    if (setActivePage) {
      setActivePage("profile");
    }
  };

  return (
    <header className="dashboard-topbar">
      <div className="topbar-left">
        <div className="topbar-breadcrumb">
          <span>Admin</span>
          <span className="breadcrumb-separator">/</span>
          <strong>Dashboard</strong>
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-search">
          <Search
            className="search-icon"
            size={17}
          />

          <input
            type="text"
            placeholder="Search..."
            aria-label="Search"
          />

          <span className="search-shortcut">
            ⌘ K
          </span>
        </div>

        

        <NotificationCenter />

        <div className="topbar-divider"></div>

        <div className="topbar-profile">
          <button
            type="button"
            className={`profile-button ${
              showProfile ? "active" : ""
            }`}
            onClick={toggleProfile}
          >
            <div className="profile-avatar">
              {initials}
            </div>

            <div className="profile-info">
              <strong>
                {user.name || "Super Admin"}
              </strong>

              <span>Administrator</span>
            </div>

            <ChevronDown
              className={`profile-chevron ${
                showProfile ? "open" : ""
              }`}
              size={16}
            />
          </button>

          {showProfile && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <div className="profile-avatar large">
                  {initials}
                </div>

                <div>
                  <strong>
                    {user.name || "Super Admin"}
                  </strong>

                  <span>
                    {user.email ||
                      "admin@valetparking.com"}
                  </span>
                </div>
              </div>

              <div className="profile-menu-divider"></div>

              <button
                type="button"
                className="profile-menu-item"
                onClick={openProfile}
              >
                <span className="menu-item-icon">
                  <UserRound size={15} />
                </span>

                <div>
                  <strong>My Profile</strong>
                  <span>
                    View your account
                  </span>
                </div>
              </button>

              <div className="profile-menu-divider"></div>

              <button
                type="button"
                className="profile-menu-item logout-menu"
                onClick={handleLogout}
              >
                <span className="menu-item-icon">
                  <LogOut size={15} />
                </span>

                <div>
                  <strong>Logout</strong>
                  <span>
                    Sign out of your account
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
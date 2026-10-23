import "./Sidebar.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  LayoutDashboard,
  UserRoundPen,
  FileChartColumn,
  UserRound,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CarFront,
} from "lucide-react";

function Sidebar({ activePage, setActivePage }) {
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    navigate("/", { replace: true });
  };

  const handleNavigation = (page) => {
    setActivePage(page);
  };

  return (
    <aside
      className={`dashboard-sidebar ${
        collapsed ? "sidebar-collapsed" : ""
      }`}
    >

      {/* =====================================================
          BRAND
      ===================================================== */}

      <div className="sidebar-brand">

        <div className="brand-logo-wrapper">
          <img src="/aura-logo.svg" alt="Aura Valet Parking" className="brand-logo" />
        </div>

        <div className="sidebar-brand-text">
          <h2>AURA</h2>
          <span>VALET PARKING</span>
        </div>

        {/* Collapse Button */}

        <button
          type="button"
          className="sidebar-collapse-button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
        >
          {collapsed ? (
            <ChevronRight size={16} />
          ) : (
            <ChevronLeft size={16} />
          )}
        </button>

      </div>


      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <nav className="sidebar-nav">

        <p className="nav-label">
          MAIN MENU
        </p>


        {/* Dashboard */}

        <button
          type="button"
          className={`nav-item ${
            activePage === "dashboard"
              ? "active"
              : ""
          }`}
          onClick={() => handleNavigation("dashboard")}
          data-tooltip="Dashboard"
        >

          <span className="nav-icon">
            <LayoutDashboard size={19} />
          </span>

          <span className="nav-text">
            Dashboard
          </span>

        </button>


        {/* Staff Management */}

        <button
          type="button"
          className={`nav-item ${
            activePage === "staff"
              ? "active"
              : ""
          }`}
          onClick={() => handleNavigation("staff")}
          data-tooltip="Staff Management"
        >

          <span className="nav-icon">
            <UserRoundPen size={19} />
          </span>

          <span className="nav-text">
            Staff Management
          </span>

        </button>


        {/* Reports */}

        <button
          type="button"
          className={`nav-item ${
            activePage === "reports"
              ? "active"
              : ""
          }`}
          onClick={() => handleNavigation("reports")}
          data-tooltip="Reports & Overview"
        >

          <span className="nav-icon">
            <FileChartColumn size={19} />
          </span>

          <span className="nav-text">
            Reports & Overview
          </span>

        </button>


        {/* =================================================
            ACCOUNT
        ================================================= */}

        <p className="nav-label nav-label-space">
          ACCOUNT
        </p>


        {/* Profile */}

        <button
          type="button"
          className={`nav-item ${
            activePage === "profile"
              ? "active"
              : ""
          }`}
          onClick={() => handleNavigation("profile")}
          data-tooltip="Profile"
        >

          <span className="nav-icon">
            <UserRound size={19} />
          </span>

          <span className="nav-text">
            Profile
          </span>

        </button>

      </nav>


      {/* =====================================================
          BOTTOM SECTION
      ===================================================== */}

      <div className="sidebar-bottom">

        <div className="sidebar-status">

          <span className="sidebar-status-dot"></span>

          <span className="sidebar-status-text">
            System Online
          </span>

        </div>


        {/* Logout */}

        <button
          type="button"
          className="nav-item logout"
          onClick={handleLogout}
          data-tooltip="Logout"
        >

          <span className="nav-icon">
            <LogOut size={19} />
          </span>

          <span className="nav-text">
            Logout
          </span>

        </button>

      </div>

    </aside>
  );
}

export default Sidebar;
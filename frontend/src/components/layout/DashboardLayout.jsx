import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardSidebar from "./DashboardSidebar";
import DashboardTopbar from "./DashboardTopbar";

import "./css/DashboardLayout.css";

/**
 * <DashboardLayout> — the ONE shell used by every dashboard.
 *
 *   config       role config from dashboardConfigs.js
 *   activeTab    currently selected page id
 *   setActiveTab page switcher (the dashboard still owns its own state)
 *   onLogout     optional; defaults to clearing the session and going to "/"
 *   user         optional; overrides the user shown in the topbar
 *   children     the page content for the active tab
 */
const DashboardLayout = ({
  config,
  activeTab,
  setActiveTab,
  onLogout,
  user,
  children,
}) => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout =
    onLogout ||
    (() => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      navigate("/", { replace: true });
    });

  const profileId = config.profileId || "profile";

  return (
    <div className="dash-layout">
      <DashboardSidebar
        config={config}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <main className={`dash-main ${collapsed ? "sidebar-collapsed" : ""}`}>
        <DashboardTopbar
          config={config}
          user={user}
          onProfile={() => setActiveTab(profileId)}
        />

        <div className="dash-page-content">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardSidebar from "./DashboardSidebar";
import DashboardTopbar from "./DashboardTopbar";

import "./css/DashboardLayout.css";

/**
 * <DashboardLayout> — the ONE luxury shell used by every dashboard.
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
  const [isMobile, setIsMobile] = useState(() =>
    window.matchMedia("(max-width: 600px)").matches
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 600px)");
    const handleMediaChange = (event) => {
      setIsMobile(event.matches);
      if (!event.matches) setMobileSidebarOpen(false);
    };

    handleMediaChange(mediaQuery);
    mediaQuery.addEventListener("change", handleMediaChange);
    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, []);

  const handleSetActiveTab = (tab) => {
    setActiveTab(tab);
    if (isMobile) setMobileSidebarOpen(false);
  };

  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileSidebarOpen((open) => !open);
      return;
    }

    setCollapsed((value) => !value);
  };

  const handleLogout =
    onLogout ||
    (() => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      navigate("/", { replace: true });
    });

  const profileId = config?.profileId || "profile";

  return (
    <div className="dash-layout">
      <DashboardSidebar
        config={config}
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        onLogout={handleLogout}
        collapsed={collapsed && !isMobile}
        mobileOpen={mobileSidebarOpen}
      />

      <main className={`dash-main ${collapsed ? "sidebar-collapsed" : ""}`}>
        <DashboardTopbar
          config={config}
          user={user}
          onProfile={() => handleSetActiveTab(profileId)}
          onToggleSidebar={handleToggleSidebar}
        />

        <div className="dash-page-content">{children}</div>
      </main>

      {isMobile && mobileSidebarOpen && (
        <button
          type="button"
          className="dash-sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}
    </div>
  );
};

export default DashboardLayout;

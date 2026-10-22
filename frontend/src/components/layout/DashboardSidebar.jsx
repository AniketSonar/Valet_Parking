import React from "react";
import {
  UserRoundPen,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import "./css/DashboardLayout.css";

/**
 * Shared sidebar for every dashboard.
 * Everything role-specific comes from `config` (see dashboardConfigs.js).
 */
const DashboardSidebar = ({
  config,
  activeTab,
  setActiveTab,
  onLogout,
  collapsed,
  setCollapsed,
}) => {
  const profileId = config.profileId || "profile";

  return (
    <aside className={`dash-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      {/* BRAND */}
      <div className="dash-brand">
        <div className="dash-brand-logo">
          <img src="/aura-logo.svg" alt="Aura Valet Parking" />
        </div>

        <div className="dash-brand-title">
          <h2>AURA</h2>
          <span>{config.brandSubtitle}</span>
        </div>
      </div>

      <div className="dash-sidebar-content">
        {/* MAIN MENU */}
        <div className="dash-sidebar-section">
          <span className="dash-section-label">
            {config.menuLabel || "MAIN MENU"}
          </span>

          <nav className="dash-menu-list">
            {config.menu.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`dash-menu-item ${active ? "active" : ""}`}
                  onClick={() => setActiveTab(item.id)}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="dash-item-icon">
                    <Icon size={18} strokeWidth={active ? 2.2 : 1.9} />
                  </span>

                  <span className="dash-item-text">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* ACCOUNT */}
        <div className="dash-sidebar-section dash-account-section">
          <span className="dash-section-label">ACCOUNT</span>

          <button
            type="button"
            className={`dash-menu-item ${
              activeTab === profileId ? "active" : ""
            }`}
            onClick={() => setActiveTab(profileId)}
            title={collapsed ? "Profile" : undefined}
          >
            <span className="dash-item-icon">
              <UserRoundPen
                size={18}
                strokeWidth={activeTab === profileId ? 2.2 : 1.9}
              />
            </span>

            <span className="dash-item-text">Profile</span>
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <div className="dash-sidebar-footer">
        <button
          type="button"
          className="dash-collapse-btn"
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="dash-item-icon">
            {collapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <PanelLeftClose size={17} />
            )}
          </span>

          <span className="dash-item-text">Collapse sidebar</span>
        </button>

        <button
          type="button"
          className="dash-logout-btn"
          onClick={onLogout}
          title={collapsed ? "Logout" : undefined}
        >
          <span className="dash-item-icon">
            <LogOut size={18} />
          </span>

          <span className="dash-item-text">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;

import React from "react";
import {
  UserRoundPen,
  LogOut,
} from "lucide-react";

import "./css/DashboardLayout.css";

/**
 * Shared Luxury Sidebar (matching Image 1 & Image 2)
 * Features:
 * - Deep crimson silk velvet wave background texture
 * - Gold stylized 'V' monogram logo with 'VALET PARKING / PREMIUM SERVICE'
 * - Gold outline icons and a gold active menu pill
 * - 'EXCLUSIVE PARKING FOR A BETTER EXPERIENCE' footer branding
 */
const DashboardSidebar = ({
  config,
  activeTab,
  setActiveTab,
  onLogout,
  collapsed,
  mobileOpen,
}) => {
  const profileId = config.profileId || "profile";

  return (
    <aside
      className={`dash-sidebar ${collapsed ? "is-collapsed" : ""} ${
        mobileOpen ? "is-mobile-open" : ""
      }`}
    >
      {/* ========================================================
          1. LUXURY CONRAD PUNE BRAND LOGO (OFFICIAL ATTACHED LOGO)
      ======================================================== */}
      <div className="dash-brand">
        {collapsed ? (
          <div className="dash-brand-collapsed-logo" title="CONRAD PUNE">
            <img
              src="/conrad-logo-gold.png"
              alt="Conrad Pune"
              style={{
                width: "48px",
                objectFit: "contain",
                filter: "brightness(1.15)"
              }}
            />
          </div>
        ) : (
          <div className="dash-brand-full">
            <div className="dash-brand-text-block" style={{ padding: "8px 0 4px" }}>
              <img
                src="/conrad-logo-gold.png"
                alt="CONRAD PUNE"
                style={{
                  height: "38px",
                  maxWidth: "205px",
                  objectFit: "contain",
                  filter: "brightness(1.18)"
                }}
              />
            </div>

            <div className="dash-brand-gold-line" />
          </div>
        )}
      </div>

      {/* ========================================================
          2. MENU ITEMS WITH GOLD ICONS & WINE VELVET ACTIVE PILL
      ======================================================== */}
      <div className="dash-sidebar-content">
        <div className="dash-sidebar-section">
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

        {/* ACCOUNT TAB (Only shown if Settings/Profile is not already an explicit menu item) */}
        {!config.menu?.some((m) => m.id === profileId || m.id === "settings") && (
          <div className="dash-sidebar-section dash-account-section">
            <button
              type="button"
              className={`dash-menu-item ${
                activeTab === profileId ? "active" : ""
              }`}
              onClick={() => setActiveTab(profileId)}
              title={collapsed ? "Settings / Profile" : undefined}
            >
              <span className="dash-item-icon">
                <UserRoundPen
                  size={18}
                  strokeWidth={activeTab === profileId ? 2.2 : 1.9}
                />
              </span>

              <span className="dash-item-text">Settings</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================
          3. SIDEBAR FOOTER & EXCLUSIVE BRANDING (IMAGE 1)
      ======================================================== */}
      <div className="dash-sidebar-footer">
        {!collapsed && (
          <div className="dash-sidebar-exclusive-badge">
            <div className="dash-badge-gold-line" />
            <span className="dash-badge-text-line1">EXCLUSIVE PARKING</span>
            <span className="dash-badge-text-line2">FOR A BETTER EXPERIENCE</span>
            <div className="dash-badge-gold-line" />
          </div>
        )}

        <div className="dash-footer-controls">

          <button
            type="button"
            className="dash-logout-btn"
            onClick={onLogout}
            title={collapsed ? "Logout" : undefined}
          >
            <span className="dash-item-icon">
              <LogOut size={16} />
            </span>

            <span className="dash-item-text">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;

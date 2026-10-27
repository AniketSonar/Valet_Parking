import React from "react";
import {
  UserRoundPen,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import "./css/DashboardLayout.css";

/**
 * Shared Luxury Sidebar (matching Image 1 & Image 2)
 * Features:
 * - Deep crimson silk velvet wave background texture
 * - Gold stylized 'V' monogram logo with 'VALET PARKING / PREMIUM SERVICE'
 * - Gold outline icons and deep wine velvet active pill button
 * - 'EXCLUSIVE PARKING FOR A BETTER EXPERIENCE' footer branding
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
      {/* ========================================================
          1. LUXURY GOLD BRAND LOGO (EXACT MATCH TO IMAGE 1)
      ======================================================== */}
      <div className="dash-brand">
        {collapsed ? (
          <div className="dash-brand-collapsed-logo" title="VALET PARKING - PREMIUM SERVICE">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              {/* Crown / Stars */}
              <circle cx="14" cy="6" r="1.8" fill="#dfb76c" />
              <circle cx="20" cy="4" r="2.2" fill="#dfb76c" />
              <circle cx="26" cy="6" r="1.8" fill="#dfb76c" />
              {/* Stylized Serif V */}
              <path
                d="M8 12 H14 L20 30 L26 12 H32 M18 12 L20 24 L22 12"
                stroke="#dfb76c"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : (
          <div className="dash-brand-full">
            <div className="dash-brand-emblem-wrap">
              <svg width="38" height="34" viewBox="0 0 44 40" fill="none" className="dash-gold-v-svg">
                {/* Crown / Stars */}
                <circle cx="16" cy="6" r="1.8" fill="#dfb76c" />
                <circle cx="22" cy="4" r="2.4" fill="#dfb76c" />
                <circle cx="28" cy="6" r="1.8" fill="#dfb76c" />
                {/* Stylized Serif V */}
                <path
                  d="M9 12 H15 L22 32 L29 12 H35"
                  stroke="url(#goldGrad)"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 12 L22 24 L24 12"
                  stroke="url(#goldGrad)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f7dc9a" />
                    <stop offset="50%" stopColor="#dfb76c" />
                    <stop offset="100%" stopColor="#b8862d" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="dash-brand-text-block">
              <h2 className="dash-brand-title-gold">VALET PARKING</h2>
              <span className="dash-brand-subtitle-gold">PREMIUM SERVICE</span>
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

        {/* ACCOUNT TAB */}
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
            className="dash-collapse-btn"
            onClick={() => setCollapsed((value) => !value)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="dash-item-icon">
              {collapsed ? (
                <PanelLeftOpen size={16} />
              ) : (
                <PanelLeftClose size={16} />
              )}
            </span>

            <span className="dash-item-text">Collapse</span>
          </button>

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

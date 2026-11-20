import React from "react";
import {
  LayoutDashboard,
  ParkingSquare,
  CarFront,
  ClipboardList,
  History,
  UserRoundPen,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldAlert,
  Settings,
  Star,
} from "lucide-react";

import "./css/ValetSidebar.css";

const ValetSidebar = ({
  activeTab,
  setActiveTab,
  onLogout,
  collapsed,
  setCollapsed,
}) => {
  const mainMenu = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "security-dashboard",
      label: "Check-In",
      icon: ClipboardList,
    },
    {
      id: "my-vehicles",
      label: "My Vehicles",
      icon: CarFront,
    },
    {
      id: "parking-slots",
      label: "Parking Slots",
      icon: ParkingSquare,
    },
    {
      id: "retrieval-requests",
      label: "Retrieval Requests",
      icon: History,
    },
    {
      id: "completed-returns",
      label: "Completed Returns",
      icon: History,
    },
    {
      id: "regular-guests",
      label: "Regular / Event Guests",
      icon: Star,
    },
    {
      id: "incidents",
      label: "Incident Management",
      icon: ShieldAlert,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`valet-sidebar ${
        collapsed ? "is-collapsed" : ""
      }`}
    >
      {/* BRAND */}
      <div className="valet-brand">
        <div className="valet-brand-title" style={{ padding: "8px 0" }}>
          <img
            src="/conrad-logo-gold.png"
            alt="CONRAD PUNE"
            style={{ height: "30px", maxWidth: "180px", objectFit: "contain", filter: "brightness(1.15)" }}
          />
        </div>
      </div>

      {/* MAIN MENU */}
      <div className="valet-sidebar-section">
        <span className="valet-section-label">
          MAIN MENU
        </span>

        <nav className="valet-menu-list">
          {mainMenu.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`valet-menu-item ${
                  active ? "active" : ""
                }`}
                onClick={() => setActiveTab(item.id)}
                title={
                  collapsed
                    ? item.label
                    : undefined
                }
              >
                <span className="valet-item-icon">
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.2 : 1.9}
                  />
                </span>

                <span className="valet-item-text">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ACCOUNT */}
      <div className="valet-sidebar-section valet-account-section">
        <span className="valet-section-label">
          ACCOUNT
        </span>

        <button
          type="button"
          className={`valet-menu-item ${
            activeTab === "profile" ? "active" : ""
          }`}
          onClick={() => setActiveTab("profile")}
          title={collapsed ? "Profile" : undefined}
        >
          <span className="valet-item-icon">
            <UserRoundPen
              size={18}
              strokeWidth={
                activeTab === "profile"
                  ? 2.2
                  : 1.9
              }
            />
          </span>

          <span className="valet-item-text">
            Profile
          </span>
        </button>
      </div>

      {/* FOOTER */}
      <div className="valet-sidebar-footer">
        <button
          type="button"
          className="valet-collapse-btn"
          onClick={() =>
            setCollapsed((value) => !value)
          }
          title={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
        >
          <span className="valet-item-icon">
            {collapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <PanelLeftClose size={17} />
            )}
          </span>

          <span className="valet-item-text">
            Collapse sidebar
          </span>
        </button>

        <button
          type="button"
          className="valet-logout-btn"
          onClick={onLogout}
          title={collapsed ? "Logout" : undefined}
        >
          <span className="valet-item-icon">
            <LogOut size={18} />
          </span>

          <span className="valet-item-text">
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
};

export default ValetSidebar;
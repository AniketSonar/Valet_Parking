import React from "react";
import {
  LayoutDashboard,
  Users,
  Car,
  ClipboardList,
  KeyRound,
  UserRoundPen,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  CreditCard,
} from "lucide-react";
import "./css/ReceptionSidebar.css";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "sessions", label: "Active Sessions", icon: ClipboardList },
  { id: "customers", label: "Customers", icon: Users },
  { id: "vehicles", label: "Vehicles", icon: Car },
  { id: "payments", label: "Payments & Invoices", icon: CreditCard },
];

const ReceptionSidebar = ({ activeTab, setActiveTab, onLogout, collapsed, setCollapsed }) => {
  return (
    <aside className={`app-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      {/* BRAND */}
      <div className="app-brand">
        <div className="brand-logo-wrapper">
          <img src="/valet-logo.svg" alt="Valet Parking" className="brand-logo" />
        </div>
        <div className="brand-title">
          <h2>VALET</h2>
          <span>RECEPTION DESK</span>
        </div>
      </div>

      {/* MAIN MENU */}
      <div className="sidebar-section">
        <span className="section-label">OPERATIONS</span>
        <nav className="menu-list">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`menu-item ${isActive ? "active" : ""}`}
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="item-icon">
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.9} />
                </span>
                <span className="item-text">{item.label}</span>
              </button>
            );
          })}
        </nav>


        {/* ACCOUNT */}
        <div className="sidebar-section account-section">
          <span className="section-label">ACCOUNT</span>
          <button
            type="button"
            className={`menu-item ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <span className="item-icon">
              <UserRoundPen size={18} strokeWidth={activeTab === "profile" ? 2.2 : 1.9} />
            </span>
            <span className="item-text">Profile</span>
          </button>
        </div>
      </div>



      {/* LOGOUT */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="item-icon">
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </span>
          <span className="item-text">Collapse sidebar</span>
        </button>
        <button type="button" className="logout-btn" onClick={onLogout}>
          <span className="item-icon"><LogOut /></span>
          <span className="item-text">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default ReceptionSidebar;

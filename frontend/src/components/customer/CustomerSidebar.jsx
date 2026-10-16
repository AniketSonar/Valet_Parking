import {
  LayoutDashboard,
  CarFront,
  History,
  UserRound,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  CreditCard,
} from "lucide-react";

import "./css/CustomerPortal.css";

const items = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "vehicles",
    label: "My Vehicles",
    icon: CarFront,
  },
  {
    id: "history",
    label: "Parking History",
    icon: History,
  },
  {
    id: "payments",
    label: "Payments",
    icon: CreditCard,
  },
  {
    id: "feedback",
    label: "Feedback",
    icon: MessageSquare,
  },
];

function CustomerSidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  onLogout,
}) {
  return (
    <aside
      className={`customer-sidebar ${
        collapsed ? "is-collapsed" : ""
      }`}
    >
      <div className="customer-brand">
        <div className="customer-brand-logo">
          <img
            src="/aura-logo.svg"
            alt="Aura Valet Parking"
          />
        </div>

        <div className="customer-brand-title">
          <strong>AURA</strong>
          <span>CUSTOMER PORTAL</span>
        </div>
      </div>

      <div className="customer-sidebar-section">
        <span className="customer-section-label">
          MY ACCOUNT
        </span>

        <nav className="customer-menu-list">
          {items.map(
            ({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`customer-menu-item ${
                  activeTab === id ? "active" : ""
                }`}
                onClick={() => setActiveTab(id)}
                title={collapsed ? label : undefined}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            )
          )}
        </nav>
      </div>

      <div className="customer-sidebar-account">
        <button
          type="button"
          className={`customer-menu-item ${
            activeTab === "profile" ? "active" : ""
          }`}
          onClick={() => setActiveTab("profile")}
          title={collapsed ? "Profile" : undefined}
        >
          <UserRound size={18} />
          <span>Profile</span>
        </button>
      </div>

      <div className="customer-sidebar-footer">
        <button
          type="button"
          className="customer-menu-item"
          onClick={() =>
            setCollapsed((value) => !value)
          }
          title={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
        >
          {collapsed ? (
            <PanelLeftOpen size={18} />
          ) : (
            <PanelLeftClose size={18} />
          )}

          <span>Collapse sidebar</span>
        </button>

        <button
          type="button"
          className="customer-menu-item customer-logout"
          onClick={onLogout}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default CustomerSidebar;
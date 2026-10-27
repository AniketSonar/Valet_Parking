
import { useEffect, useState } from "react";

import DashboardLayout from "../layout/DashboardLayout";
import { adminConfig } from "../layout/dashboardConfigs";
import StatCard from "./StatCard";
import StaffManagement from "./StaffManagement";
import AreaManagement from "./AreaManagement";
import Reports from "./Reports";
import Profile from "./Profile";

import {
  LayoutDashboard,
  ParkingSquare,
  ChartNoAxesCombined,
  UsersRound,
  Car,
  User,
  Clock3,
  CircleAlert,
  CircleCheckBig
} from "lucide-react";

import { getDashboardStats } from "../../api/adminApi";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";

import "./Dashboard.css";

const getCurrentDate = () => {
  return new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function Dashboard() {
  const [activePage, setActivePage] = useState("dashboard");

  const [dashboardStats, setDashboardStats] = useState({
    totalStaff: 0,
    activeStaff: 0,
    totalCustomers: 0,
    activeParkingSessions: 0,
    openIncidents: 0,
    todayRevenue: 0,
  });

  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  const loadDashboardStats = async (silent = false) => {
    try {
      if (!silent) setDashboardLoading(true);
      setDashboardError("");

      const response = await getDashboardStats();

      console.log(
        "Dashboard stats response:",
        response
      );

      if (!response?.success) {
        throw new Error(
          response?.message ||
          "Failed to load dashboard statistics."
        );
      }

      setDashboardStats({
        totalStaff:
          response?.stats?.totalStaff ?? 0,
        activeStaff:
          response?.stats?.activeStaff ?? 0,
        totalCustomers:
          response?.stats?.totalCustomers ?? 0,
        activeParkingSessions:
          response?.stats?.activeParkingSessions ?? 0,
        openIncidents:
          response?.stats?.openIncidents ?? 0,
        todayRevenue:
          response?.stats?.todayRevenue ?? 0,
      });
    } catch (error) {
      console.error(
        "Dashboard stats error:",
        error
      );

      if (!silent) {
        setDashboardError(
          error?.message ||
          "Failed to load dashboard statistics."
        );
      }
    } finally {
      if (!silent) setDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (activePage === "dashboard") {
      loadDashboardStats();
    }
  }, [activePage]);

  useRealtimeSync({
    tables: ["parking_sessions", "parking_slots", "payments", "users"],
    onUpdate: () => {
      if (activePage === "dashboard") {
        loadDashboardStats(true);
      }
    },
    interval: 4000,
    enabled: activePage === "dashboard",
  });

  const formattedRevenue =
    Number(
      dashboardStats.todayRevenue || 0
    ).toLocaleString("en-IN");

  return (
    <DashboardLayout
      config={adminConfig}
      activeTab={activePage}
      setActiveTab={setActivePage}
    >
        <div className="dashboard-content">
          {activePage === "dashboard" && (
            <>
              <section className="dashboard-header">
                <div className="dashboard-heading">
                  <span className="dashboard-eyebrow">
                    SYSTEM OVERVIEW
                  </span>

                  <h1>
                    Good morning, Super Admin
                    <span className="wave"></span>
                  </h1>

                  <p>
                    Here's what's happening across
                    your valet parking system today.
                  </p>
                </div>

                <div className="dashboard-date">
                  <span>
                    TODAY
                  </span>

                  <strong>
                    {getCurrentDate()}
                  </strong>
                </div>
              </section>

              {dashboardError && (
                <div className="dashboard-error">
                  <div className="dashboard-error-message">
                    <span className="dashboard-error-icon">
                      !
                    </span>

                    <span>
                      {dashboardError}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={loadDashboardStats}
                    disabled={dashboardLoading}
                  >
                    {dashboardLoading
                      ? "Retrying..."
                      : "Retry"}
                  </button>
                </div>
              )}

              <section className="stats-section">
                <div className="section-heading">
                  <div>
                    <span>
                      PERFORMANCE
                    </span>

                    <h2>
                      Today's overview
                    </h2>
                  </div>
                </div>

                <div className="stats-grid">
                  <StatCard
                    icon="staff"
                    title="Total Staff"
                    value={
                      dashboardLoading
                        ? "--"
                        : dashboardStats.totalStaff
                    }
                    description="Registered staff members"
                  />

                  <StatCard
                    icon="active"
                    title="Active Staff"
                    value={
                      dashboardLoading
                        ? "--"
                        : dashboardStats.activeStaff
                    }
                    description="Currently active"
                  />

                  <StatCard
                    icon="customers"
                    title="Total Customers"
                    value={
                      dashboardLoading
                        ? "--"
                        : dashboardStats.totalCustomers
                    }
                    description="Registered customers"
                  />

                  <StatCard
                    icon="parking"
                    title="Active Sessions"
                    value={
                      dashboardLoading
                        ? "--"
                        : dashboardStats.activeParkingSessions
                    }
                    description="Vehicles currently parked"
                  />

                  <StatCard
                    icon="incident"
                    title="Open Incidents"
                    value={
                      dashboardLoading
                        ? "--"
                        : dashboardStats.openIncidents
                    }
                    description="Requires attention"
                    warning
                  />

                  <StatCard
                    icon="revenue"
                    title="Today's Revenue"
                    value={
                      dashboardLoading
                        ? "₹ --"
                        : `₹ ${formattedRevenue}`
                    }
                    description="Revenue generated today"
                    revenue
                  />
                </div>
              </section>

              <section className="dashboard-grid">
                <div className="dashboard-panel system-panel">
                  <div className="panel-header">
                    <div>
                      <span className="panel-kicker">
                        SYSTEM STATUS
                      </span>

                      <h3>
                        Parking system overview
                      </h3>

                      <p>
                        Current performance of the
                        parking management system.
                      </p>
                    </div>

                    <button
                      className="panel-action"
                      type="button"
                      onClick={() =>
                        setActivePage("reports")
                      }
                    >
                      View reports
                      <span>→</span>
                    </button>
                  </div>

                  <div className="system-content">
                    <div className="system-status">
                      <div className="status-icon">
                        <CircleCheckBig />
                      </div>

                      <div className="status-text">
                        <strong>
                          System Operational
                        </strong>

                        <span>
                          All core services are
                          running normally
                        </span>
                      </div>

                      <span className="status-badge">
                        Online
                      </span>
                    </div>

                    <div className="system-metrics">
                      <div className="system-metric">
                        <div className="metric-icon blue">
                          <ParkingSquare />
                        </div>

                        <div>
                          <span>
                            Parking Capacity
                          </span>

                          <strong>
                            --
                          </strong>
                        </div>
                      </div>

                      <div className="system-metric">
                        <div className="metric-icon green">
                          <Car />
                        </div>

                        <div>
                          <span>
                            Active Sessions
                          </span>

                          <strong>
                            {dashboardLoading
                              ? "--"
                              : dashboardStats.activeParkingSessions}
                          </strong>
                        </div>
                      </div>

                      <div className="system-metric">
                        <div className="metric-icon orange">
                          <CircleAlert />
                        </div>

                        <div>
                          <span>
                            Open Incidents
                          </span>

                          <strong>
                            {dashboardLoading
                              ? "--"
                              : dashboardStats.openIncidents}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dashboard-panel activity-panel">
                  <div className="panel-header">
                    <div>
                      <span className="panel-kicker">
                        ACTIVITY
                      </span>

                      <h3>
                        Recent activity
                      </h3>

                      <p>
                        Latest administrative events.
                      </p>
                    </div>
                  </div>

                  <div className="activity-list">
                    <div className="empty-activity">
                      <div className="empty-icon">
                        <Clock3 />
                      </div>

                      <strong>
                        No recent activity
                      </strong>

                      <span>
                        Administrative activity will
                        appear here.
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="quick-section">
                <div className="section-heading">
                  <div>
                    <span>
                      QUICK ACCESS
                    </span>

                    <h2>
                      Manage your system
                    </h2>
                  </div>
                </div>

                <div className="quick-grid">
                  <button
                    type="button"
                    className="quick-card"
                    onClick={() =>
                      setActivePage("staff")
                    }
                  >
                    <div className="quick-icon staff-icon">
                      <UsersRound />
                    </div>

                    <div>
                      <strong>
                        Staff Management
                      </strong>

                      <span>
                        Manage system staff
                      </span>
                    </div>

                    <span className="quick-arrow">
                      →
                    </span>
                  </button>

                  <button
                    type="button"
                    className="quick-card"
                    onClick={() =>
                      setActivePage("reports")
                    }
                  >
                    <div className="quick-icon report-icon">
                      <ChartNoAxesCombined />
                    </div>

                    <div>
                      <strong>
                        Reports & Analytics
                      </strong>

                      <span>
                        View system performance
                      </span>
                    </div>

                    <span className="quick-arrow">
                      →
                    </span>
                  </button>

                  <button
                    type="button"
                    className="quick-card"
                    onClick={() =>
                      setActivePage("profile")
                    }
                  >
                    <div className="quick-icon profile-icon">
                      <User />
                    </div>

                    <div>
                      <strong>
                        Admin Profile
                      </strong>

                      <span>
                        Manage your account
                      </span>
                    </div>

                    <span className="quick-arrow">
                      →
                    </span>
                  </button>
                </div>
              </section>
            </>
          )}

          {activePage === "staff" && (
            <StaffManagement />
          )}

          {activePage === "areas" && (
            <AreaManagement />
          )}

          {activePage === "reports" && (
            <Reports />
          )}

          {activePage === "profile" && (
            <Profile />
          )}
        </div>
    </DashboardLayout>
  );
}

export default Dashboard;

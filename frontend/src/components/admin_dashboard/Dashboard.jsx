import { useEffect, useState } from "react";

import DashboardLayout from "../layout/DashboardLayout";
import { adminConfig } from "../layout/dashboardConfigs";
import StaffManagement from "./StaffManagement";
import AreaManagement from "./AreaManagement";
import ReceptionPayments from "../reception/ReceptionPayments";
import Reports from "./Reports";
import Profile from "./Profile";
import LuxuryDashboardView from "./LuxuryDashboardView";

import { getDashboardStats, getDashboardAnalytics } from "../../api/adminApi";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";

import "./Dashboard.css";

function Dashboard() {
  const [activePage, setActivePage] = useState("dashboard");

  const [dashboardStats, setDashboardStats] = useState({
    totalStaff: 0,
    activeStaff: 0,
    totalCustomers: 0,
    activeParkingSessions: 0,
    openIncidents: 0,
    todayRevenue: 0,
    totalVehicles: 0,
    todayCheckouts: 0,
  });

  const [analyticsData, setAnalyticsData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  const loadDashboardStats = async (silent = false) => {
    try {
      if (!silent) setDashboardLoading(true);
      setDashboardError("");

      const [statsRes, analyticsRes] = await Promise.allSettled([
        getDashboardStats(),
        getDashboardAnalytics(),
      ]);

      if (statsRes.status === "fulfilled" && statsRes.value?.success) {
        const stats = statsRes.value.stats || {};
        setDashboardStats((prev) => ({
          ...prev,
          totalStaff: stats.totalStaff ?? 0,
          activeStaff: stats.activeStaff ?? 0,
          totalCustomers: stats.totalCustomers ?? 0,
          activeParkingSessions: stats.activeParkingSessions ?? 0,
          openIncidents: stats.openIncidents ?? 0,
          todayRevenue: stats.todayRevenue ?? 0,
          totalVehicles: stats.totalVehicles ?? prev.totalVehicles,
          todayCheckouts: stats.todayCheckouts ?? prev.todayCheckouts,
        }));
      }

      if (analyticsRes.status === "fulfilled" && analyticsRes.value?.success) {
        setAnalyticsData(analyticsRes.value.analytics);
      }
    } catch (error) {
      console.error("Dashboard stats error:", error);
      if (!silent) {
        setDashboardError(
          error?.message || "Failed to load dashboard statistics."
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

  // Real-time synchronization on any database change
  useRealtimeSync({
    tables: [
      "parking_sessions",
      "vehicles",
      "parking_slots",
      "payments",
      "feedback",
      "users",
    ],
    onUpdate: () => {
      if (activePage === "dashboard") {
        loadDashboardStats(true);
      }
    },
    interval: 3500,
    enabled: activePage === "dashboard",
  });

  return (
    <DashboardLayout
      config={adminConfig}
      activeTab={activePage}
      setActiveTab={setActivePage}
    >
      <div className="dashboard-content">
        {dashboardError && (
          <div className="dashboard-error">
            <div className="dashboard-error-message">
              <span className="dashboard-error-icon">!</span>
              <span>{dashboardError}</span>
            </div>
            <button
              type="button"
              onClick={() => loadDashboardStats(false)}
              disabled={dashboardLoading}
            >
              {dashboardLoading ? "Retrying..." : "Retry"}
            </button>
          </div>
        )}

        {/* EXACT LUXURY GRAPHICAL ANALYSIS DASHBOARD (MATCHING IMAGE 2) */}
        {activePage === "dashboard" && (
          <LuxuryDashboardView
            stats={dashboardStats}
            analytics={analyticsData}
            loading={dashboardLoading}
          />
        )}

        {activePage === "staff" && <StaffManagement />}
        {activePage === "areas" && <AreaManagement />}
        {activePage === "revenue" && <ReceptionPayments />}
        {activePage === "reports" && <Reports />}
        {activePage === "profile" && <Profile />}
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;

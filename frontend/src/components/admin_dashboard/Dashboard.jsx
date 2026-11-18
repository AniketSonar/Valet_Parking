import { useEffect, useState, useCallback } from "react";

import DashboardLayout from "../layout/DashboardLayout";
import { adminConfig } from "../layout/dashboardConfigs";
import InfraManagement from "./InfraManagement";
import VehiclesOperations from "../parkingAdmin/VehicleOperations";
import ParkingSlots from "../parkingAdmin/ParkingSlots";
import IncidentManagement from "../parkingAdmin/IncidentManagement";
import RevenueOverview from "../revenue/RevenueOverview";
import Reports from "./Reports";
import AdminNotifications from "./AdminNotifications";
import Profile from "./Profile";
import LuxuryDashboardView from "./LuxuryDashboardView";

import { getDashboardStats, getDashboardAnalytics } from "../../api/adminApi";
import { getBuildings } from "../../api/areaApi";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";

import "./Dashboard.css";

function Dashboard() {
  const [activePage, setActivePage] = useState("dashboard");

  // Multi-hotel state
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState("all");

  const [dashboardStats, setDashboardStats] = useState({
    totalStaff: 0, activeStaff: 0, totalCustomers: 0,
    activeParkingSessions: 0, openIncidents: 0,
    todayRevenue: 0, totalVehicles: 0, todayCheckouts: 0,
    availableSlots: 0, revenueToday: 0,
  });

  const [analyticsData, setAnalyticsData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  // Load hotels on mount
  useEffect(() => {
    getBuildings()
      .then((res) => {
        console.log("[Dashboard] getBuildings response:", res);
        if (res?.buildings && Array.isArray(res.buildings)) {
          setHotels(res.buildings);
        } else {
          console.warn("[Dashboard] No buildings array in response:", res);
        }
      })
      .catch((err) => console.error("[Dashboard] Error loading hotel branches:", err));
  }, []);

  const loadDashboardStats = useCallback(async (silent = false) => {
    try {
      if (!silent) setDashboardLoading(true);
      setDashboardError("");

      const [statsRes, analyticsRes] = await Promise.allSettled([
        getDashboardStats(selectedHotel),
        getDashboardAnalytics(selectedHotel),
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
          availableSlots: stats.availableSlots ?? 0,
          revenueToday: stats.revenueToday ?? stats.todayRevenue ?? 0,
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
  }, [selectedHotel]);

  useEffect(() => {
    if (activePage === "dashboard") {
      loadDashboardStats();
    }
  }, [activePage, loadDashboardStats]);

  // Real-time synchronization on any database change
  useRealtimeSync({
    tables: [
      "parking_sessions",
      "vehicles",
      "parking_slots",
      "payments",
      "feedback",
      "users",
      "incidents",
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
      <div
        className={`dashboard-content ${
          activePage === "revenue" ? "dashboard-content-revenue" : ""
        }`}
      >
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

        {/* 1. DASHBOARD */}
        {activePage === "dashboard" && (
          <LuxuryDashboardView
            stats={dashboardStats}
            analytics={analyticsData}
            loading={dashboardLoading}
            hotels={hotels}
            selectedHotel={selectedHotel}
            onHotelChange={setSelectedHotel}
          />
        )}

        {/* 2. INFRA MANAGEMENT (A. Add Hotels & Config, B. Staff Members) */}
        {activePage === "infra" && <InfraManagement />}

        {/* 3. PARKING OPERATIONS */}
        {activePage === "parking-operations" && (
          <VehiclesOperations scope="admin" />
        )}

        {/* 4. PARKING SLOTS */}
        {activePage === "parking-slots" && (
          <ParkingSlots scope="admin" />
        )}

        {/* 5. REVENUE */}
        {activePage === "revenue" && <RevenueOverview />}

        {/* 6. INCIDENT MANAGEMENT (Read-only for Admin) */}
        {activePage === "incidents" && (
          <IncidentManagement canReport={false} canUpdateStatus={false} />
        )}

        {/* 7. REPORTS */}
        {activePage === "reports" && <Reports />}

        {/* 8. NOTIFICATIONS */}
        {activePage === "notifications" && <AdminNotifications />}

        {/* 9. SETTINGS */}
        {(activePage === "settings" || activePage === "profile") && <Profile />}
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;

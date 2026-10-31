import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpRight,
  Car,
  CheckCircle2,
  CircleParking,
  Clock3,
  Construction,
  LayoutDashboard,
  RefreshCw,
  Settings,
  TrendingUp,
} from "lucide-react";

import DashboardLayout from "../layout/DashboardLayout";
import { parkingAdminConfig } from "../layout/dashboardConfigs";
import LuxuryDashboardView from "../admin_dashboard/LuxuryDashboardView";
import ParkingAdminStatcard from "./ParkingAdminStatcard";
import ParkingSlots from "./ParkingSlots";
import VehicleOperations from "./VehicleOperations";
import RetrievalRequests from "./RetrievalRequests";
import ParkingHistory from "./ParkingHistory";
import ValetManagement from "./ValetManagement";
import ValetPosts from "./ValetPosts";
import ReceptionPayments from "../reception/ReceptionPayments";
import ParkingReports from "./ParkingReports";
import ParkingAdminProfile from "./ParkingAdminProfile";
import ParkingSessions from "./ParkingSessions";
import IncidentManagement from "./IncidentManagement";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import FeedbackManagement from "./FeedbackManagement";

import apiClient from "../../api/apiClient";

import "./css/ParkingAdminDashboard.css";

const ParkingAdminDashboard = ({ onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    if (onLogout) {
      onLogout();
    } else {
      navigate("/", { replace: true });
    }
  };

  const [dashboardStats, setDashboardStats] = useState({
    totalSlots: 0,
    availableSlots: 0,
    occupiedSlots: 0,
    maintenanceSlots: 0,
    activeSessions: 0,
    pendingRetrievals: 0,
    todayCheckIns: 0,
    todayCompletedReturns: 0,
    todayRevenue: 0,
  });

  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ============================================================
  // FETCH DASHBOARD DATA
  // ============================================================

  const fetchDashboardStats = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");

      const [dashRes, analyticsRes] = await Promise.allSettled([
        apiClient("/api/parking-admin/dashboard"),
        apiClient("/api/admin/dashboard-analytics"),
      ]);

      if (dashRes.status === "fulfilled" && dashRes.value?.success) {
        const stats = dashRes.value.stats || {};
        setDashboardStats({
          totalSlots: stats.totalSlots ?? 0,
          availableSlots: stats.availableSlots ?? 0,
          occupiedSlots: stats.occupiedSlots ?? 0,
          maintenanceSlots: stats.maintenanceSlots ?? 0,
          activeSessions: stats.activeSessions ?? 0,
          pendingRetrievals: stats.pendingRetrievals ?? 0,
          todayCheckIns: stats.todayCheckIns ?? 0,
          todayCompletedReturns:
            stats.todayCompletedReturns ?? 0,
          todayRevenue: stats.todayRevenue ?? 0,
        });
      }

      if (analyticsRes.status === "fulfilled" && analyticsRes.value?.success) {
        setAnalyticsData(analyticsRes.value.analytics);
      }
    } catch (err) {
      console.error(
        "Parking Admin dashboard error:",
        err
      );

      if (!silent) {
        setError(
          err?.message ||
          "Unable to load dashboard statistics."
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useRealtimeSync({
    tables: ["parking_sessions", "vehicles", "parking_slots", "payments", "feedback", "retrieval_requests"],
    onUpdate: () => {
      fetchDashboardStats(true);
    },
    interval: 4000,
  });

  // ============================================================
  // OCCUPANCY
  // ============================================================

  const occupancyPercentage =
    dashboardStats.totalSlots > 0
      ? Math.round(
        (dashboardStats.occupiedSlots /
          dashboardStats.totalSlots) *
        100
      )
      : 0;

  // ============================================================
  // KPI CARDS
  // ============================================================

  const summaryCards = [
    {
      label: "Total Parking Slots",
      value: loading
        ? "..."
        : dashboardStats.totalSlots,
      subtext: "Total configured slots",
      icon: CircleParking,
      theme: "purple",
    },
    {
      label: "Available Slots",
      value: loading
        ? "..."
        : dashboardStats.availableSlots,
      subtext: "Currently available",
      icon: CheckCircle2,
      theme: "green",
    },
    {
      label: "Occupied Slots",
      value: loading
        ? "..."
        : dashboardStats.occupiedSlots,
      subtext: "Currently occupied",
      icon: Car,
      theme: "purple",
    },
    {
      label: "Maintenance Slots",
      value: loading
        ? "..."
        : dashboardStats.maintenanceSlots,
      subtext: "Unavailable for parking",
      icon: Construction,
      theme: "amber",
    },
    {
      label: "Vehicles Parked",
      value: loading
        ? "..."
        : dashboardStats.activeSessions,
      subtext: "Currently inside facility",
      icon: Activity,
      theme: "purple",
    },
    {
      label: "Pending Retrievals",
      value: loading
        ? "..."
        : dashboardStats.pendingRetrievals,
      subtext: "Requests awaiting action",
      icon: Clock3,
      theme: "red",
    },
    {
      label: "Today's Check-ins",
      value: loading
        ? "..."
        : dashboardStats.todayCheckIns,
      subtext: "Vehicles checked in today",
      icon: ArrowDownToLine,
      theme: "green",
    },
    {
      label: "Completed Returns",
      value: loading
        ? "..."
        : dashboardStats.todayCompletedReturns,
      subtext: "Vehicles returned today",
      icon: CheckCircle2,
      theme: "green",
    },
  ];



  const renderView = () => {
    switch (activeTab) {


      case "dashboard":
        return (
          <LuxuryDashboardView
            stats={{
              totalVehicles: dashboardStats.todayCheckIns || 124,
              activeParkingSessions: dashboardStats.activeSessions || 38,
              todayCheckouts: dashboardStats.todayCompletedReturns || 32,
            }}
            analytics={analyticsData}
            loading={loading}
          />
        );

      case "parking-slots":
        return <ParkingSlots />;

      // ========================================================
      // PARKING SESSIONS
      // ========================================================

      case "parking-sessions":
        return <ParkingSessions />;

      // ========================================================
      // PARKING OPERATIONS
      // ========================================================

      case "parking-operations":
        return <VehicleOperations />;

      // ========================================================
      // RETRIEVAL REQUESTS
      // ========================================================

      case "retrievals":
        return <RetrievalRequests />;

      // ========================================================
      // PARKING HISTORY
      // ========================================================

      case "history":
        return <ParkingHistory />;

      // ========================================================
      // VALET MANAGEMENT
      // ========================================================

      case "valet-management":
        return <ValetManagement />;

      // ========================================================
      // VALET POSITIONS
      // ========================================================

      case "valet-positions":
        return <ValetPosts />;

      // ========================================================
      // REPORTS
      // ========================================================

      case "reports":
        return <ParkingReports />;

      // ========================================================
      // INCIDENT MANAGEMENT
      // ========================================================
      case "incidents":
        return <IncidentManagement />;

     
      // INCIDENT MANAGEMENT

      case "feedback":
        return <FeedbackManagement />;

      // ========================================================
      // REVENUE & PAYMENTS
      // ========================================================
      case "revenue":
        return <ReceptionPayments />;

      // ========================================================
      // PROFILE
      // ========================================================

      case "profile":
        return (
          <ParkingAdminProfile
            onLogout={handleLogout}
          />
        );

      // ========================================================
      // SECURITY
      // ========================================================

      case "security":
        return (
          <ParkingAdminProfile
            onLogout={handleLogout}
          />
        );

      default:
        return null;
    }
  };

  // ============================================================
  // MAIN LAYOUT
  // ============================================================

  return (
    <DashboardLayout
      config={parkingAdminConfig}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={handleLogout}
    >
      <div className="parking-admin-body">
        {renderView()}
      </div>
    </DashboardLayout>
  );
};

export default ParkingAdminDashboard;
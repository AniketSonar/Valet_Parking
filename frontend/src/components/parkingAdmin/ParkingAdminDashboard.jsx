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

import ParkingAdminSidebar from "./ParkingAdminSidebar";
import ParkingAdminTopbar from "./ParkingAdminTopbar";
import ParkingAdminStatcard from "./ParkingAdminStatcard";
import ParkingSlots from "./ParkingSlots";
import VehicleOperations from "./VehicleOperations";
import RetrievalRequests from "./RetrievalRequests";
import ParkingHistory from "./ParkingHistory";
import ValetManagement from "./ValetManagement";
import ParkingReports from "./ParkingReports";
import ParkingAdminProfile from "./ParkingAdminProfile";
import ParkingSessions from "./ParkingSessions";
import IncidentManagement from "./IncidentManagement";
import FeedbackManagement from "./FeedbackManagement";

import apiClient from "../../api/apiClient";

import "./css/ParkingAdminDashboard.css";

const ParkingAdminDashboard = ({ onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ============================================================
  // FETCH DASHBOARD DATA
  // ============================================================

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiClient(
        "/api/parking-admin/dashboard"
      );

      if (!data?.success) {
        throw new Error(
          data?.message ||
          "Failed to fetch dashboard statistics."
        );
      }

      const stats = data.stats || {};

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
    } catch (err) {
      console.error(
        "Parking Admin dashboard error:",
        err
      );

      setError(
        err?.message ||
        "Unable to load dashboard statistics."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

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
          <div className="dashboard-wrapper">

            <div className="dashboard-top-bar">

              <div className="dashboard-heading">

                <span className="dashboard-eyebrow">
                  PARKING OPERATIONS
                </span>

                <h1 className="dashboard-main-title">
                  Parking Admin Dashboard
                </h1>

                <p className="dashboard-sub-text">
                  Monitor parking operations, vehicles,
                  slots and retrieval activity.
                </p>

              </div>

              <div className="dashboard-header-actions">

                <button
                  type="button"
                  className="dashboard-refresh-btn"
                  onClick={fetchDashboardStats}
                  disabled={loading}
                  title="Refresh dashboard"
                >
                  <RefreshCw
                    size={15}
                    className={
                      loading
                        ? "refresh-spinning"
                        : ""
                    }
                  />

                  <span>
                    {loading
                      ? "Refreshing..."
                      : "Refresh"}
                  </span>
                </button>

                <div className="today-date-badge">

                  <span>Today</span>

                  <strong>
                    {new Date().toLocaleDateString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </strong>

                </div>

              </div>

            </div>

            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (
              <div className="dashboard-error">

                <div className="dashboard-error-icon">
                  <AlertCircle size={17} />
                </div>

                <div className="dashboard-error-content">
                  <strong>
                    Unable to load dashboard
                  </strong>

                  <span>{error}</span>
                </div>

                <button
                  type="button"
                  onClick={fetchDashboardStats}
                >
                  Try Again
                </button>

              </div>
            )}

            {/* ==================================================
                KPI CARDS
            ================================================== */}

            <div className="kpi-cards-grid">

              {summaryCards.map((card, idx) => (
                <ParkingAdminStatcard
                  key={idx}
                  {...card}
                />
              ))}

            </div>

            <div className="dashboard-bottom-grid">


              <div className="dashboard-widget-card">

                <div className="widget-header">

                  <div className="widget-title-group">

                    <div className="widget-icon">
                      <TrendingUp size={17} />
                    </div>

                    <div>
                      <h3>
                        Parking Occupancy
                      </h3>

                      <p>
                        Current facility utilization
                      </p>
                    </div>

                  </div>

                  <button
                    type="button"
                    className="widget-link-btn"
                    onClick={() =>
                      setActiveTab("parking-slots")
                    }
                  >
                    View Slots
                    <ArrowUpRight size={14} />
                  </button>

                </div>

                <div className="occupancy-widget-body">

                  <div className="donut-chart-container">

                    <svg
                      viewBox="0 0 36 36"
                      className="donut-svg"
                    >

                      <path
                        className="circle-bg"
                        d="M18 2.0845
                           a 15.9155 15.9155 0 0 1 0 31.831
                           a 15.9155 15.9155 0 0 1 0 -31.831"
                      />

                      <path
                        className="circle-fill"
                        strokeDasharray={`${occupancyPercentage}, 100`}
                        d="M18 2.0845
                           a 15.9155 15.9155 0 0 1 0 31.831
                           a 15.9155 15.9155 0 0 1 0 -31.831"
                      />

                    </svg>

                    <div className="donut-center-text">

                      <h2>
                        {loading
                          ? "..."
                          : `${occupancyPercentage}%`}
                      </h2>

                      <span>
                        Occupied
                      </span>

                    </div>

                  </div>

                  {/* Occupancy Legend */}

                  <div className="occupancy-legend">

                    <div className="legend-item">

                      <span className="dot dot-green" />

                      <strong>
                        {loading
                          ? "..."
                          : dashboardStats.availableSlots}
                      </strong>

                      <span>
                        Available
                      </span>

                    </div>

                    <div className="legend-item">

                      <span className="dot dot-purple" />

                      <strong>
                        {loading
                          ? "..."
                          : dashboardStats.occupiedSlots}
                      </strong>

                      <span>
                        Occupied
                      </span>

                    </div>

                    <div className="legend-item">

                      <span className="dot dot-amber" />

                      <strong>
                        {loading
                          ? "..."
                          : dashboardStats.maintenanceSlots}
                      </strong>

                      <span>
                        Maintenance
                      </span>

                    </div>

                  </div>

                </div>

              </div>

              {/* ==================================================
                  RETRIEVAL SUMMARY
              ================================================== */}

              <div className="dashboard-widget-card">

                <div className="widget-header">

                  <div className="widget-title-group">

                    <div className="widget-icon retrieval-icon">
                      <Clock3 size={17} />
                    </div>

                    <div>

                      <h3>
                        Retrieval Requests
                      </h3>

                      <p>
                        Current vehicle retrieval activity
                      </p>

                    </div>

                  </div>

                  <button
                    type="button"
                    className="widget-link-btn"
                    onClick={() =>
                      setActiveTab("retrievals")
                    }
                  >
                    View All
                    <ArrowUpRight size={14} />
                  </button>

                </div>

                <div className="retrievals-widget-list">

                  {loading ? (

                    <div className="retrieval-item-row">

                      <div className="item-icon-box loading-icon">
                        <RefreshCw
                          size={16}
                          className="refresh-spinning"
                        />
                      </div>

                      <div className="item-details">

                        <strong>
                          Loading retrieval requests...
                        </strong>

                        <span>
                          Fetching latest parking activity
                        </span>

                      </div>

                    </div>

                  ) : dashboardStats.pendingRetrievals ===
                    0 ? (

                    <div className="retrieval-item-row">

                      <div className="item-icon-box success-icon">
                        <CheckCircle2 size={17} />
                      </div>

                      <div className="item-details">

                        <strong>
                          No pending retrievals
                        </strong>

                        <span>
                          All current retrieval requests
                          have been handled.
                        </span>

                      </div>

                      <span className="status-pill badge-ready">
                        Clear
                      </span>

                    </div>

                  ) : (

                    <div className="retrieval-item-row">

                      <div className="item-icon-box pending-icon">
                        <Clock3 size={17} />
                      </div>

                      <div className="item-details">

                        <strong>

                          {dashboardStats.pendingRetrievals}{" "}

                          Pending Retrieval
                          {dashboardStats.pendingRetrievals !==
                            1
                            ? "s"
                            : ""}

                        </strong>

                        <span>
                          Requests awaiting action
                        </span>

                      </div>

                      <span className="status-pill badge-pending">
                        Pending
                      </span>

                    </div>

                  )}

                </div>

              </div>

            </div>

          </div>
        );

      // ========================================================
      // PARKING SLOTS
      // ========================================================

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
    <div className={`parking-admin-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>

      <ParkingAdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      <div className="parking-admin-main">

        <ParkingAdminTopbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
        />

        <main className="parking-admin-body">
          {renderView()}
        </main>

      </div>

    </div>
  );
};

export default ParkingAdminDashboard;
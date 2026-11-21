import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Car,
  Clock,
  LogOut,
  Star,
  TrendingUp,
  BarChart2,
  PieChart,
  Calendar,
  ChevronDown,
  CheckCircle2,
  ArrowUpRight,
  Shield,
  KeyRound,
  Eye,
  Building2,
  Check,
  Users,
} from "lucide-react";
import { getBuildings } from "../../api/areaApi";
import { getSystemReports } from "../../api/adminApi";
import "./LuxuryDashboardView.css";

function LuxuryDashboardView({
  stats = {},
  analytics: directAnalytics = null,
  loading = false,
  hotels = [],
  selectedHotel = "all",
  onHotelChange = () => {},
}) {
  const [internalHotels, setInternalHotels] = useState(hotels || []);

  useEffect(() => {
    if (hotels && hotels.length > 0) {
      setInternalHotels(hotels);
    } else {
      getBuildings()
        .then((res) => {
          if (res?.buildings && Array.isArray(res.buildings) && res.buildings.length > 0) {
            setInternalHotels(res.buildings);
          }
        })
        .catch((err) => console.error("Error loading hotels in LuxuryDashboardView:", err));
    }
  }, [hotels]);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const isManager = user?.role === "manager" || user?.role === "parking_admin";

  // Hotel-Wise Comparison Data (from reports)
  const [hotelReports, setHotelReports] = useState([]);

  useEffect(() => {
    if (isManager) {
      setHotelReports([]);
      return undefined;
    }

    let cancelled = false;
    getSystemReports({ hotelId: selectedHotel, period: "month" })
      .then((res) => {
        if (!cancelled && res?.success && Array.isArray(res?.reports?.hotelReports)) {
          setHotelReports(res.reports.hotelReports);
        }
      })
      .catch((err) => console.warn("Failed to load hotel reports for dashboard:", err));
    return () => {
      cancelled = true;
    };
  }, [isManager, selectedHotel]);

  const rawHotels = internalHotels.length > 0 ? internalHotels : hotels;

  const displayHotels = useMemo(() => {
    if (!isManager) return rawHotels;
    if (user?.assigned_hotel_id) {
      const match = rawHotels.filter((h) => h.id === user.assigned_hotel_id);
      if (match.length > 0) return match;
    }
    if (user?.assigned_hotel_name) {
      const matchName = rawHotels.filter(
        (h) => (h.building_name || h.name || "").toLowerCase() === user.assigned_hotel_name.toLowerCase()
      );
      if (matchName.length > 0) return matchName;
    }
    if (hotels && hotels.length === 1) return hotels;
    if (rawHotels.length === 1) return rawHotels;
    return rawHotels.slice(0, 1);
  }, [rawHotels, hotels, isManager, user?.assigned_hotel_id, user?.assigned_hotel_name]);

  // If user is a branch manager, auto-select their branch if 'all' is selected
  useEffect(() => {
    if (isManager && displayHotels.length > 0) {
      if (selectedHotel === "all" || !selectedHotel || selectedHotel !== displayHotels[0].id) {
        onHotelChange(displayHotels[0].id);
      }
    }
  }, [isManager, selectedHotel, displayHotels, onHotelChange]);

  const [timeFilter, setTimeFilter] = useState("Today");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [activeSegment, setActiveSegment] = useState(null);

  const activeHotelLabel = useMemo(() => {
    if (!selectedHotel || selectedHotel === "all") {
      if (isManager && displayHotels.length > 0) {
        return displayHotels[0].building_name || displayHotels[0].name || user?.assigned_hotel_name || "Hotel Branch";
      }
      return "All Hotels";
    }
    const found = displayHotels.find((h) => h.id === selectedHotel) || rawHotels.find((h) => h.id === selectedHotel);
    return found?.building_name || found?.name || user?.assigned_hotel_name || "Hotel Branch";
  }, [selectedHotel, displayHotels, rawHotels, isManager, user?.assigned_hotel_name]);

  // Extract analytics from either direct prop or stats wrapper
  const analytics = directAnalytics || stats?.analytics || null;

  // Real-time KPI values with safe fallbacks
  const kpiTotalVehicles = analytics?.totalVehiclesToday ?? stats?.totalVehicles ?? 0;
  const kpiActiveParked = analytics?.activeParkingSessions ?? stats?.activeParkingSessions ?? 0;
  const kpiEmptySlots = analytics?.availableSlots ?? stats?.availableSlots ?? 0;
  const kpiRevenueToday = analytics?.revenueToday ?? stats?.revenueToday ?? 0;
  const kpiTotalHotels = displayHotels.length || stats?.totalHotels || 1;
  const kpiTotalStaff = stats?.totalStaff ?? (displayHotels.reduce((acc, h) => acc + (h.staff_count || 0), 0) || 12);

  // Default fallback trend matching Image 2 curve
  const defaultTrendData = useMemo(() => [
    { time: "8 AM", value: 6, label: "6 vehicles" },
    { time: "10 AM", value: 12, label: "12 vehicles" },
    { time: "12 PM", value: 19, label: "19 vehicles" },
    { time: "2 PM", value: 24, label: "24 vehicles" },
    { time: "4 PM", value: 31, label: "31 vehicles (Peak)" },
    { time: "6 PM", value: 23, label: "23 vehicles" },
    { time: "8 PM", value: 21, label: "21 vehicles" },
    { time: "10 PM", value: 32, label: "32 vehicles" },
  ], []);

  // Time trend data points (Hourly today or Weekly)
  const trendData = useMemo(() => {
    const rawTrend =
      timeFilter === "This Week"
        ? analytics?.weeklyTrend
        : analytics?.hourlyTrend;

    if (rawTrend && rawTrend.length > 0) {
      const peakVal = Math.max(...rawTrend.map((t) => t.value));
      return rawTrend.map((t) => ({
        ...t,
        label: `${t.value} vehicle${t.value === 1 ? "" : "s"}${
          t.value === peakVal && t.value > 0 ? " (Peak)" : ""
        }`,
      }));
    }
    return defaultTrendData;
  }, [timeFilter, analytics?.hourlyTrend, analytics?.weeklyTrend, defaultTrendData]);

  // SVG Chart dimensions & dynamic path calculation
  const chartWidth = 620;
  const chartHeight = 200;

  // Calculate dynamic maxY so chart never clips and scales smoothly
  const maxY = useMemo(() => {
    const maxVal = Math.max(...trendData.map((d) => d.value), 0);
    if (maxVal <= 2) return 4;
    if (maxVal <= 5) return 10;
    if (maxVal <= 15) return 20;
    if (maxVal <= 30) return 40;
    return Math.ceil((maxVal + 5) / 10) * 10;
  }, [trendData]);

  const gridValues = useMemo(() => {
    const step = maxY / 4;
    return [maxY, Math.round(step * 3), Math.round(step * 2), Math.round(step), 0];
  }, [maxY]);

  // Convert data points to SVG coordinates
  const points = useMemo(() => {
    return trendData.map((d, index) => {
      const x = 30 + (index / (trendData.length - 1)) * (chartWidth - 60);
      const y = chartHeight - 25 - (d.value / maxY) * (chartHeight - 45);
      return { x, y, ...d };
    });
  }, [trendData, maxY]);

  // Generate smooth cubic bezier SVG curve
  const pathD = useMemo(() => {
    if (!points.length) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [points]);

  // Area path (closed at the bottom for gradient fill)
  const areaPathD = useMemo(() => {
    if (!points.length) return "";
    const lastPoint = points[points.length - 1];
    return `${pathD} L ${lastPoint.x} ${chartHeight - 15} L ${points[0].x} ${chartHeight - 15} Z`;
  }, [pathD, points]);

  const BRAND_VEHICLE_COLORS = useMemo(() => ({
    Sedan: "#42235e",
    SUV: "#bc9b6a",
    Luxury: "#6c3a8c",
    Sports: "#d4aa70",
    Others: "#1a0a2e",
  }), []);

  // Vehicle type distribution with real-time support
  const defaultVehicleTypes = useMemo(() => [
    { label: "Sedan", percentage: 48, color: "#42235e", count: 60 },
    { label: "SUV", percentage: 28, color: "#bc9b6a", count: 35 },
    { label: "Luxury", percentage: 12, color: "#6c3a8c", count: 15 },
    { label: "Sports", percentage: 7, color: "#d4aa70", count: 9 },
    { label: "Others", percentage: 5, color: "#1a0a2e", count: 5 },
  ], []);

  const vehicleTypes = useMemo(() => {
    if (analytics?.vehicleTypes && analytics.vehicleTypes.length > 0) {
      const totalCount = analytics.vehicleTypes.reduce((a, b) => a + (b.count || 0), 0);
      return analytics.vehicleTypes.map((t) => ({
        ...t,
        color: BRAND_VEHICLE_COLORS[t.label] || t.color || "#42235e",
        percentage: totalCount > 0 ? Math.round(((t.count || 0) / totalCount) * 100) : 0,
      }));
    }
    return defaultVehicleTypes;
  }, [analytics?.vehicleTypes, defaultVehicleTypes, BRAND_VEHICLE_COLORS]);

  const totalDonutCount = useMemo(() => {
    if (analytics?.vehicleTypes && analytics.vehicleTypes.length > 0) {
      const sum = analytics.vehicleTypes.reduce((a, b) => a + (b.count || 0), 0);
      return sum;
    }
    if (analytics?.totalVehiclesAllTime !== undefined) {
      return analytics.totalVehiclesAllTime;
    }
    return stats?.totalVehicles ?? 0;
  }, [analytics?.vehicleTypes, analytics?.totalVehiclesAllTime, stats?.totalVehicles]);

  // SVG Donut calculation
  const totalPercentage = 100;
  const radius = 70;
  const strokeWidth = 28;
  const circumference = 2 * Math.PI * radius;

  const donutSegments = useMemo(() => {
    const activeTypes = vehicleTypes.filter((t) => (t.count || 0) > 0 || (t.percentage || 0) > 0);
    if (!activeTypes.length) {
      return [{
        label: "Empty",
        color: "#271239",
        strokeDasharray: `${circumference} ${circumference}`,
        strokeDashoffset: 0,
      }];
    }

    if (activeTypes.length === 1) {
      return [{
        ...activeTypes[0],
        strokeDasharray: `${circumference} ${circumference}`,
        strokeDashoffset: 0,
      }];
    }

    let cumulativePercent = 0;
    return activeTypes.map((type) => {
      const pct = Math.max(type.percentage, 1);
      const strokeDasharray = `${(pct / totalPercentage) * circumference} ${circumference}`;
      const strokeDashoffset = -((cumulativePercent / totalPercentage) * circumference);
      cumulativePercent += pct;
      return { ...type, strokeDasharray, strokeDashoffset };
    });
  }, [vehicleTypes, circumference]);

  // Real-time dynamic greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning,";
    if (hour < 17) return "Good Afternoon,";
    return "Good Evening,";
  }, []);

  const recentActivities = useMemo(() => {
    if (analytics?.recentActivity && Array.isArray(analytics.recentActivity)) {
      return analytics.recentActivity.slice(0, 10);
    }
    return [];
  }, [analytics?.recentActivity]);

  return (
    <div className="lux-dashboard">
      {/* ========================================================
          1. WELCOME HERO BANNER (MATCHING IMAGE 1 & 2)
      ======================================================== */}
      <section className="lux-welcome-banner">
        <div className="lux-welcome-text">
          <span className="lux-welcome-greeting">{greeting}</span>
          <h1 className="lux-welcome-title">Welcome Back!</h1>

          {/* Hotel / Branch Visible Selector (Single Row spanning across banner) */}
          <div style={{ marginTop: "12px", width: "100%" }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "nowrap",
                overflowX: "auto",
                whiteSpace: "nowrap",
                paddingBottom: "4px",
                width: "100%",
                scrollbarWidth: "none"
              }}>
                {/* All Branches Button (Hidden for Managers - only Super Admin sees All) */}
                {!isManager && (
                  <button
                    type="button"
                    onClick={() => onHotelChange("all")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "7px",
                      padding: "7px 15px",
                      borderRadius: "24px",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                      border: selectedHotel === "all" ? "2px solid #bc9b6a" : "1.5px solid rgba(212, 194, 230, 0.9)",
                      background: selectedHotel === "all"
                        ? "linear-gradient(135deg, #42235e 0%, #28103c 100%)"
                        : "rgba(255, 255, 255, 0.92)",
                      backdropFilter: "blur(6px)",
                      color: selectedHotel === "all" ? "#ffffff" : "#42235e",
                      fontWeight: "700",
                      fontSize: "12.5px",
                      cursor: "pointer",
                      boxShadow: selectedHotel === "all"
                        ? "0 4px 14px rgba(66, 35, 94, 0.35)"
                        : "0 2px 8px rgba(66, 35, 94, 0.08)",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <Building2 size={14} style={{ color: selectedHotel === "all" ? "#bc9b6a" : "#42235e" }} />
                    <span>All Branches</span>
                    {displayHotels.length > 0 && (
                      <span style={{
                        fontSize: "10.5px",
                        fontWeight: "800",
                        padding: "2px 6px",
                        borderRadius: "10px",
                        background: selectedHotel === "all" ? "#bc9b6a" : "#ebdcf3",
                        color: selectedHotel === "all" ? "#28103c" : "#42235e"
                      }}>
                        {displayHotels.length}
                      </span>
                    )}
                  </button>
                )}

                {/* Individual Branch Buttons */}
                {displayHotels.map((h) => {
                  const name = h.building_name || h.name || "Hotel Branch";
                  const loc = h.location && h.location !== name ? h.location : "";
                  const isSelected = selectedHotel === h.id;

                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => onHotelChange(h.id)}
                      title={`Click to view ${name} dashboard`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "7px",
                        padding: "7px 15px",
                        borderRadius: "24px",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                        border: isSelected ? "2px solid #bc9b6a" : "1.5px solid rgba(212, 194, 230, 0.9)",
                        background: isSelected
                          ? "linear-gradient(135deg, #42235e 0%, #28103c 100%)"
                          : "rgba(255, 255, 255, 0.92)",
                        backdropFilter: "blur(6px)",
                        color: isSelected ? "#ffffff" : "#28103c",
                        fontWeight: "700",
                        fontSize: "12.5px",
                        cursor: "pointer",
                        boxShadow: isSelected
                          ? "0 4px 14px rgba(66, 35, 94, 0.35)"
                          : "0 2px 8px rgba(66, 35, 94, 0.08)",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <span style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: isSelected ? "#bc9b6a" : "#42235e",
                        boxShadow: isSelected ? "0 0 6px rgba(188, 155, 106, 0.9)" : "none"
                      }} />
                      <span>{name}</span>
                      {!isManager && loc ? (
                        <span style={{
                          fontSize: "10.5px",
                          fontWeight: "600",
                          padding: "2px 6px",
                          borderRadius: "6px",
                          background: isSelected ? "rgba(188, 155, 106, 0.25)" : "#f5edf9",
                          color: isSelected ? "#f2e5cc" : "#42235e"
                        }}>
                          {loc}
                        </span>
                      ) : null}
                    </button>
                  );
                })}

                {displayHotels.length === 0 && (
                  <span style={{ fontSize: "12px", color: "#6b567b", fontStyle: "italic" }}>
                    Loading hotel branches...
                  </span>
                )}
              </div>
          </div>
        </div>

        <div className="lux-welcome-visual">
          <img
            src="/welcome-hero-banner.jpg"
            alt="Valet Parking Luxury Service"
            className="lux-welcome-img"
          />
          <div className="lux-welcome-overlay dashboard-hero-feather" />
        </div>
      </section>

      {/* ========================================================
          2. KPI STAT CARDS
      ======================================================== */}
      <section className="lux-stats-grid">
        {/* Card 1: Total Hotels */}
        <div className="lux-kpi-card">
          <div className="lux-kpi-icon-wrap rose">
            <Building2 size={16} className="lux-kpi-icon" />
          </div>
          <div className="lux-kpi-content-row">
            <div className="lux-kpi-left-col">
              <div className="lux-kpi-value">
                {loading ? "--" : isManager ? "1" : kpiTotalHotels}
              </div>
              <div className="lux-kpi-title">Total Hotels</div>
            </div>
            <div className="lux-kpi-right-col">
              <div className="lux-kpi-badge green">
                <span className="lux-trend-arrow">↑</span>
                <span className="lux-trend-num">Active</span>
              </div>
              <div className="lux-kpi-compare">all locations</div>
            </div>
          </div>
        </div>

        {/* Card 2: Total Staff */}
        <div className="lux-kpi-card">
          <div className="lux-kpi-icon-wrap rose">
            <Users size={16} className="lux-kpi-icon" />
          </div>
          <div className="lux-kpi-content-row">
            <div className="lux-kpi-left-col">
              <div className="lux-kpi-value">
                {loading ? "--" : kpiTotalStaff}
              </div>
              <div className="lux-kpi-title">Total Staff</div>
            </div>
            <div className="lux-kpi-right-col">
              <div className="lux-kpi-badge green">
                <span className="lux-trend-arrow">↑</span>
                <span className="lux-trend-num">Duty</span>
              </div>
              <div className="lux-kpi-compare">team active</div>
            </div>
          </div>
        </div>

        {/* Card 3: Active Parked Vehicles */}
        <div className="lux-kpi-card">
          <div className="lux-kpi-icon-wrap rose">
            <Clock size={16} className="lux-kpi-icon" />
          </div>
          <div className="lux-kpi-content-row">
            <div className="lux-kpi-left-col">
              <div className="lux-kpi-value">
                {loading ? "--" : kpiActiveParked}
              </div>
              <div className="lux-kpi-title">Active Parked Vehicles</div>
            </div>
            <div className="lux-kpi-right-col">
              <div className="lux-kpi-badge green">
                <span className="lux-trend-arrow">↑</span>
                <span className="lux-trend-num">8%</span>
              </div>
              <div className="lux-kpi-compare">vs. yesterday</div>
            </div>
          </div>
        </div>

        {/* Card 4: Total Vehicles Today */}
        <div className="lux-kpi-card">
          <div className="lux-kpi-icon-wrap rose">
            <Car size={16} className="lux-kpi-icon" />
          </div>
          <div className="lux-kpi-content-row">
            <div className="lux-kpi-left-col">
              <div className="lux-kpi-value">
                {loading ? "--" : kpiTotalVehicles}
              </div>
              <div className="lux-kpi-title">Total Vehicles Today</div>
            </div>
            <div className="lux-kpi-right-col">
              <div className="lux-kpi-badge green">
                <span className="lux-trend-arrow">↑</span>
                <span className="lux-trend-num">12%</span>
              </div>
              <div className="lux-kpi-compare">vs. yesterday</div>
            </div>
          </div>
        </div>

        {/* Card 5: Empty Slots Available */}
        <div className="lux-kpi-card">
          <div className="lux-kpi-icon-wrap rose">
            <Shield size={16} className="lux-kpi-icon" />
          </div>
          <div className="lux-kpi-content-row">
            <div className="lux-kpi-left-col">
              <div className="lux-kpi-value">
                {loading ? "--" : kpiEmptySlots}
              </div>
              <div className="lux-kpi-title">Empty Slots Available</div>
            </div>
            <div className="lux-kpi-right-col">
              <div className="lux-kpi-badge green">
                <span className="lux-trend-arrow">↑</span>
                <span className="lux-trend-num">Live</span>
              </div>
              <div className="lux-kpi-compare">current status</div>
            </div>
          </div>
        </div>

        {/* Card 6: Revenue Today */}
        <div className="lux-kpi-card">
          <div className="lux-kpi-icon-wrap rose">
            <TrendingUp size={16} className="lux-kpi-icon" />
          </div>
          <div className="lux-kpi-content-row">
            <div className="lux-kpi-left-col">
              <div className="lux-kpi-value">
                ₹{loading ? "--" : (kpiRevenueToday?.toLocaleString?.() ?? kpiRevenueToday)}
              </div>
              <div className="lux-kpi-title">Revenue Today</div>
            </div>
            <div className="lux-kpi-right-col">
              <div className="lux-kpi-badge green">
                <span className="lux-trend-arrow">↑</span>
                <span className="lux-trend-num">today</span>
              </div>
              <div className="lux-kpi-compare">vs. yesterday</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          3. GRAPHICAL ANALYSIS ROW (TREND AREA CHART & DONUT CHART)
      ======================================================== */}
      <section className="lux-analytics-row">
        {/* Left: Vehicle Trend Area Chart */}
        <div className="lux-card lux-chart-card">
          <div className="lux-card-topbar">
            <div className="lux-card-title-group">
              <BarChart2 size={18} className="lux-card-header-icon" />
              <h3>Vehicle Trend</h3>
            </div>

            <div className="lux-dropdown-container" style={{ position: "relative" }}>
              <button
                type="button"
                className="lux-dropdown-pill"
                onClick={() => setShowFilterMenu((prev) => !prev)}
                style={{ cursor: "pointer", background: "none" }}
              >
                <Calendar size={14} />
                <span>{timeFilter}</span>
                <ChevronDown size={14} />
              </button>
              {showFilterMenu && (
                <div
                  className="lux-filter-menu"
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "6px",
                    background: "#ffffff",
                    border: "1px solid #ebdcd5",
                    borderRadius: "10px",
                    boxShadow: "0 8px 24px rgba(60, 10, 20, 0.12)",
                    padding: "6px",
                    zIndex: 20,
                    minWidth: "120px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  {["Today", "This Week"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setTimeFilter(opt);
                        setShowFilterMenu(false);
                      }}
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: timeFilter === opt ? "700" : "500",
                        color: timeFilter === opt ? "#42235e" : "#4a4a4a",
                        backgroundColor: timeFilter === opt ? "#f5edf9" : "transparent",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lux-svg-chart-container">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="lux-area-chart-svg"
            >
              <defs>
                <linearGradient
                  id="goldGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#bc9b6a"
                    stopOpacity="0.32"
                  />
                  <stop
                    offset="100%"
                    stopColor="#bc9b6a"
                    stopOpacity="0.01"
                  />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              {gridValues.map((val) => {
                const yPos =
                  chartHeight - 25 - (val / maxY) * (chartHeight - 45);
                return (
                  <g key={val}>
                    <line
                      x1="30"
                      y1={yPos}
                      x2={chartWidth - 20}
                      y2={yPos}
                      className="lux-grid-line"
                    />
                    <text
                      x="18"
                      y={yPos + 4}
                      className="lux-axis-label y"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Area fill */}
              <path d={areaPathD} fill="url(#goldGradient)" />

              {/* Line curve */}
              <path
                d={pathD}
                fill="none"
                stroke="#bc9b6a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {points.map((pt, idx) => (
                <g key={idx} className="lux-chart-point-group">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    className="lux-chart-dot"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  {/* X-axis label */}
                  <text
                    x={pt.x}
                    y={chartHeight - 2}
                    textAnchor="middle"
                    className="lux-axis-label x"
                  >
                    {pt.time}
                  </text>
                </g>
              ))}
            </svg>

            {/* Interactive Tooltip */}
            {hoveredPoint && (
              <div
                className="lux-chart-tooltip"
                style={{
                  left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                  top: `${(hoveredPoint.y / chartHeight) * 100}%`,
                }}
              >
                <strong>{hoveredPoint.time}</strong>
                <span>{hoveredPoint.label}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Vehicle Type Donut Chart */}
        <div className="lux-card lux-donut-card">
          <div className="lux-card-topbar">
            <div className="lux-card-title-group">
              <Car size={18} className="lux-card-header-icon" />
              <h3>Vehicle Type</h3>
            </div>
          </div>

          <div className="lux-donut-content-row">
            {/* SVG Donut */}
            <div className="lux-donut-svg-wrap">
              <svg viewBox="0 0 170 170" className="lux-donut-svg">
                <g transform="rotate(-90 85 85)">
                  {donutSegments.map((seg, idx) => (
                    <circle
                      key={idx}
                      cx="85"
                      cy="85"
                      r={radius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      className={`lux-donut-segment ${
                        activeSegment === seg.label ? "active" : ""
                      }`}
                      onMouseEnter={() => setActiveSegment(seg.label)}
                      onMouseLeave={() => setActiveSegment(null)}
                    />
                  ))}
                </g>
              </svg>

              {/* Center count in Donut */}
              <div className="lux-donut-center">
                <span className="lux-donut-count">{totalDonutCount}</span>
                <span className="lux-donut-total">Total</span>
              </div>
            </div>

            {/* Legend list */}
            <div className="lux-donut-legend">
              {vehicleTypes.map((t, idx) => (
                <div
                  key={idx}
                  className={`lux-legend-item ${
                    activeSegment === t.label ? "highlighted" : ""
                  }`}
                  onMouseEnter={() => setActiveSegment(t.label)}
                  onMouseLeave={() => setActiveSegment(null)}
                >
                  <span
                    className="lux-legend-dot"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="lux-legend-name">{t.label}</span>
                  <span className="lux-legend-percent">
                    {t.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          4. BOTTOM ROW: RECENT ACTIVITY & PROMO BANNER (IMAGE 2)
      ======================================================== */}
      <section className="lux-bottom-row">
        {/* Left: Recent Activity Table */}
        <div className="lux-card lux-activity-card">
          <div className="lux-card-topbar">
            <div className="lux-card-title-group">
              <Clock size={18} className="lux-card-header-icon" />
              <h3>Recent Activity</h3>
            </div>
          </div>

          <div className="lux-table-wrapper">
            <table className="lux-activity-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Vehicle No.</th>
                  <th>Type</th>
                  <th>Action</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentActivities.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "28px 12px", color: "#8a757b", fontSize: "0.9rem" }}>
                      No parking activity recorded yet today.
                    </td>
                  </tr>
                ) : (
                  recentActivities.map((row, idx) => (
                    <tr key={row.id || idx}>
                      <td className="lux-td-time">
                        <Car size={14} className="lux-car-mini-icon" />
                        <span>{row.time}</span>
                      </td>
                      <td className="lux-td-plate">
                        <strong>{row.vehicleNo}</strong>
                      </td>
                      <td className="lux-td-type">{row.type}</td>
                      <td className="lux-td-action">{row.action}</td>
                      <td className="lux-td-status">
                        <span className={`lux-status-pill ${row.statusClass}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Operational Performance & Slot Analysis Card (Pie Chart) */}
        <div className="lux-card lux-analysis-panel" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
          <div>
            <div className="lux-card-topbar" style={{ marginBottom: "12px" }}>
              <div className="lux-card-title-group">
                <PieChart size={18} className="lux-card-header-icon" />
                <h3>Live Parking Efficiency</h3>
              </div>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#15803d", background: "#eefbf1", padding: "2px 8px", borderRadius: "10px" }}>
                Real-Time
              </span>
            </div>

            {/* Parking Slot Distribution Pie/Donut Chart */}
            {(() => {
              const totalSlots = (kpiActiveParked + kpiEmptySlots) || 1;
              const parkedPct = Math.round((kpiActiveParked / totalSlots) * 100);
              const availPct = 100 - parkedPct;
              const r = 53;
              const c = 2 * Math.PI * r;
              const parkedOffset = 0;
              const availOffset = -((parkedPct / 100) * c);

              return (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", width: "100%", maxWidth: "440px", margin: "0 auto 10px" }}>
                  {/* SVG Pie Chart */}
                  <div style={{ position: "relative", width: "132px", height: "132px", flexShrink: 0 }}>
                    <svg width="132" height="132" viewBox="0 0 132 132" style={{ transform: "rotate(-90deg)" }}>
                      {/* Background Track */}
                      <circle cx="66" cy="66" r={r} fill="none" stroke="#f3edea" strokeWidth="16" />
                      {/* Available Slots Segment (Gold) */}
                      <circle
                        cx="66"
                        cy="66"
                        r={r}
                        fill="none"
                        stroke="#bc9b6a"
                        strokeWidth="16"
                        strokeDasharray={`${(availPct / 100) * c} ${c}`}
                        strokeDashoffset={availOffset}
                        strokeLinecap="butt"
                      />
                      {/* Parked Slots Segment (Purple) */}
                      {parkedPct > 0 && (
                        <circle
                          cx="66"
                          cy="66"
                          r={r}
                          fill="none"
                          stroke="#42235e"
                          strokeWidth="16"
                          strokeDasharray={`${(parkedPct / 100) * c} ${c}`}
                          strokeDashoffset={parkedOffset}
                          strokeLinecap="butt"
                        />
                      )}
                    </svg>
                    {/* Donut Center */}
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center"
                    }}>
                      <span style={{ fontSize: "17px", fontWeight: "800", color: "#28103c", lineHeight: 1 }}>
                        {parkedPct}%
                      </span>
                      <span style={{ fontSize: "8px", fontWeight: "700", color: "#8a757b", letterSpacing: "0.08em", marginTop: "2px" }}>
                        OCCUPIED
                      </span>
                    </div>
                  </div>

                  {/* Chart Legend */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#42235e", flexShrink: 0 }} />
                        <span style={{ color: "#57534e", fontWeight: "600" }}>Parked</span>
                      </div>
                      <strong style={{ color: "#42235e" }}>{kpiActiveParked} ({parkedPct}%)</strong>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#bc9b6a", flexShrink: 0 }} />
                        <span style={{ color: "#57534e", fontWeight: "600" }}>Available</span>
                      </div>
                      <strong style={{ color: "#bc9b6a" }}>{kpiEmptySlots} ({availPct}%)</strong>
                    </div>

                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      background: "#fdfbf9",
                      border: "1px solid #ebdcd5",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      marginTop: "2px"
                    }}>
                      <span style={{ color: "#78716c", fontWeight: "500" }}>Target Rate</span>
                      <strong style={{ color: "#15803d" }}>94% Efficiency</strong>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2 Mini KPI Badges */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ background: "#fdfbf9", border: "1px solid #ebdcd5", borderRadius: "10px", padding: "10px 12px" }}>
                <span style={{ fontSize: "11px", color: "#8a757b", display: "block" }}>Avg Retrieval Time</span>
                <strong style={{ fontSize: "15px", color: "#28103c", fontWeight: "700" }}>4.2 min</strong>
              </div>
              <div style={{ background: "#fdfbf9", border: "1px solid #ebdcd5", borderRadius: "10px", padding: "10px 12px" }}>
                <span style={{ fontSize: "11px", color: "#8a757b", display: "block" }}>Active Staff on Duty</span>
                <strong style={{ fontSize: "15px", color: "#28103c", fontWeight: "700" }}>{stats?.activeStaff ?? 8} Members</strong>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #f2e9e6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11.5px", color: "#8c827a" }}>Selected Branch</span>
            <span style={{ fontSize: "11.5px", fontWeight: "700", color: "#42235e" }}>{activeHotelLabel}</span>
          </div>
        </div>
      </section>

      {/* ========================================================
          5. ANALYTICS ROW: STAFF BAR + INCIDENT PIE + INCIDENT TREND
      ======================================================== */}
      <section className={`lux-staff-incident-row${isManager ? " lux-staff-incident-row--manager" : ""}`}>
        {/* Staff Breakdown Bar Chart */}
        {!isManager && (
        <div className="lux-card lux-analytics-card">
          <div className="lux-card-topbar">
            <div className="lux-card-title-group">
              <Users size={18} className="lux-card-header-icon" />
              <h3>Staff Breakdown</h3>
            </div>
          </div>
          {(() => {
            const sb = analytics?.staffBreakdown || {};
            const roles = [
              { key: "manager", label: "Managers", color: "#42235e" },
              { key: "valet", label: "Valets", color: "#6c349c" },
              { key: "other", label: "Others", color: "#bc9b6a" },
            ];
            const maxCount = Math.max(...roles.map(r => sb[r.key] || 0), 1);
            const total = sb.total || 0;
            return (
              <div style={{ padding: "10px 0 4px" }}>
                <div style={{ textAlign: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "28px", fontWeight: "800", color: "#42235e" }}>{total}</span>
                  <span style={{ fontSize: "12px", color: "#8a757b", display: "block" }}>Active Staff Members</span>
                </div>
                {roles.map(r => {
                  const count = sb[r.key] || 0;
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={r.key} style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                        <span style={{ color: "#57534e", fontWeight: "600" }}>{r.label}</span>
                        <strong style={{ color: r.color }}>{count}</strong>
                      </div>
                      <div style={{ height: "8px", background: "#f3edea", borderRadius: "6px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: r.color, borderRadius: "6px", transition: "width 0.5s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
        )}

        {/* Incident Weekly Bar Chart */}
        <div className="lux-card lux-analytics-card">
          <div className="lux-card-topbar">
            <div className="lux-card-title-group">
              <Shield size={18} className="lux-card-header-icon" />
              <h3>Incidents by Week</h3>
            </div>
            <span className="lux-chart-meta">Last 4 weeks</span>
          </div>
          {(() => {
            const trend = analytics?.incidentTrend || [];
            const total = trend.reduce((sum, item) => sum + Number(item.count || 0), 0);
            if (trend.length === 0) {
              return (
                <div className="lux-incident-empty">
                  <Shield size={32} />
                  <span>No incident trend data</span>
                </div>
              );
            }
            const maxCount = Math.max(...trend.map((item) => Number(item.count || 0)), 1);
            const chartMaximum = maxCount === 1 ? 2 : Math.ceil(maxCount / 2) * 2;
            const midpoint = Math.ceil(chartMaximum / 2);
            return (
              <div className="lux-chart-shell lux-incident-chart-shell" role="img" aria-label={`${total} incidents across four weeks`}>
                <div className="lux-chart-y-axis" aria-hidden="true">
                  <span>{chartMaximum}</span>
                  <span>{midpoint}</span>
                  <span>0</span>
                </div>
                <div className="lux-weekly-incident-chart">
                  {trend.map((item, index) => {
                    const count = Number(item.count || 0);
                    const height = count === 0 ? 4 : Math.max(8, (count / chartMaximum) * 100);
                    return (
                      <div key={`${item.week}-${index}`} className="lux-weekly-incident-column" title={`${item.week}: ${count} incidents`}>
                        <span className="lux-weekly-incident-count">{count}</span>
                        <div className="lux-weekly-incident-track">
                          <div className="lux-weekly-incident-bar" style={{ height: `${height}%` }} />
                        </div>
                        <span className="lux-weekly-incident-label">{item.week}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Hotel-Wise Comparison Bar Chart */}
        {!isManager && (
        <div className="lux-card lux-analytics-card">
          <div className="lux-card-topbar">
            <div className="lux-card-title-group">
              <Building2 size={18} className="lux-card-header-icon" />
              <h3>Hotel-Wise Comparison</h3>
            </div>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#bc9b6a", background: "rgba(188, 155, 106, 0.12)", padding: "2px 8px", borderRadius: "10px" }}>
              {(() => {
                const data = hotelReports.length > 0 ? hotelReports : displayHotels;
                return `${data.length} Branches`;
              })()}
            </span>
          </div>
          {(() => {
            const data = hotelReports.length > 0
              ? hotelReports
              : displayHotels.map((h, i) => ({
                  hotel_id: h.id,
                  hotel_name: h.building_name || h.name || `Branch ${i + 1}`,
                  totalSlots: h.total_slots || 50,
                  occupiedSlots: Math.round(((h.occupancyRate || (i === 0 ? 68 : 42)) / 100) * (h.total_slots || 50)),
                  occupancyRate: h.occupancyRate ?? (i === 0 ? 68 : 42),
                  sessionsCount: h.sessionsCount ?? 14,
                  revenue: h.revenue ?? (i === 0 ? 12400 : 7800),
                }));

            if (!data || data.length === 0) {
              return (
                <div style={{ color: "#8a757b", fontSize: "13px", textAlign: "center", padding: "32px 0" }}>
                  No hotel comparison data
                </div>
              );
            }

            return (
              <div className="lux-chart-shell lux-hotel-chart-shell" role="img" aria-label="Hotel occupancy comparison bar chart">
                <div className="lux-chart-y-axis" aria-hidden="true">
                  <span>100%</span>
                  <span>50%</span>
                  <span>0%</span>
                </div>
                <div className="lux-hotel-comparison-chart">
                  {data.map((h) => {
                    const rate = Math.min(100, Math.max(0, Number(h.occupancyRate || 0)));
                    return (
                      <div key={h.hotel_id} className="lux-hotel-chart-column" title={`${h.hotel_name}: ${rate}% occupancy`}>
                        <strong className="lux-hotel-chart-value">{rate}%</strong>
                        <div className="lux-hotel-chart-track">
                          <div className="lux-hotel-chart-bar" style={{ height: `${Math.max(3, rate)}%` }} />
                        </div>
                        <span className="lux-hotel-chart-name" title={h.hotel_name}>{h.hotel_name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
        )}
      </section>
    </div>
  );
}

export default LuxuryDashboardView;

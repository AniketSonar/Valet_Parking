import React, { useState, useMemo } from "react";
import {
  Car,
  Clock,
  LogOut,
  Star,
  TrendingUp,
  BarChart2,
  Calendar,
  ChevronDown,
  CheckCircle2,
  ArrowUpRight,
  Shield,
  KeyRound,
  Eye,
} from "lucide-react";
import "./LuxuryDashboardView.css";

function LuxuryDashboardView({ stats = {}, analytics: directAnalytics = null, loading = false }) {
  const [timeFilter, setTimeFilter] = useState("Today");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [activeSegment, setActiveSegment] = useState(null);

  // Extract analytics from either direct prop or stats wrapper
  const analytics = directAnalytics || stats?.analytics || null;

  // Real-time KPI values with safe fallbacks
  const kpiTotalVehicles = analytics?.totalVehiclesToday ?? stats?.totalVehicles ?? 0;
  const kpiActiveParked = analytics?.activeParkingSessions ?? stats?.activeParkingSessions ?? 0;
  const kpiCheckouts = analytics?.todayCheckouts ?? stats?.todayCheckouts ?? 0;
  const kpiSatisfaction = analytics?.satisfaction ?? stats?.satisfaction ?? 4.8;

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
  const chartHeight = 160;

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

  // Vehicle type distribution with real-time support
  const defaultVehicleTypes = useMemo(() => [
    { label: "Sedan", percentage: 48, color: "#6b0e24", count: 60 },
    { label: "SUV", percentage: 28, color: "#a82042", count: 35 },
    { label: "Luxury", percentage: 12, color: "#c95b77", count: 15 },
    { label: "Sports", percentage: 7, color: "#dca270", count: 9 },
    { label: "Others", percentage: 5, color: "#420815", count: 5 },
  ], []);

  const vehicleTypes = useMemo(() => {
    if (analytics?.vehicleTypes && analytics.vehicleTypes.length > 0) {
      const totalCount = analytics.vehicleTypes.reduce((a, b) => a + (b.count || 0), 0);
      return analytics.vehicleTypes.map((t) => ({
        ...t,
        percentage: totalCount > 0 ? Math.round(((t.count || 0) / totalCount) * 100) : 0,
      }));
    }
    return defaultVehicleTypes;
  }, [analytics?.vehicleTypes, defaultVehicleTypes]);

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
  const radius = 62;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  const donutSegments = useMemo(() => {
    const activeTypes = vehicleTypes.filter((t) => (t.count || 0) > 0 || (t.percentage || 0) > 0);
    if (!activeTypes.length) {
      return [{
        label: "Empty",
        color: "#3a131e",
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
          <p className="lux-welcome-sub">
            Here's what's happening with your valet parking today.
          </p>
          <div className="lux-gold-line" />
        </div>

        <div className="lux-welcome-visual">
          <img
            src="/welcome-hero-banner.png"
            alt="Valet Parking Luxury Service"
            className="lux-welcome-img"
          />
          <div className="lux-welcome-overlay" />
        </div>
      </section>

      {/* ========================================================
          2. TOP 4 KPI STAT CARDS (MERGED INTO BANNER WITH LEFT ACCENT)
      ======================================================== */}
      <section className="lux-stats-grid">
        {/* Card 1: Total Vehicles Today */}
        <div className="lux-kpi-card">
          <div className="lux-kpi-icon-wrap rose">
            <Car size={18} className="lux-kpi-icon" />
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

        {/* Card 2: Active Parked Vehicles */}
        <div className="lux-kpi-card">
          <div className="lux-kpi-icon-wrap rose">
            <Clock size={18} className="lux-kpi-icon" />
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

        {/* Card 3: Vehicle Check Outs */}
        <div className="lux-kpi-card">
          <div className="lux-kpi-icon-wrap rose">
            <LogOut size={18} className="lux-kpi-icon" />
          </div>
          <div className="lux-kpi-content-row">
            <div className="lux-kpi-left-col">
              <div className="lux-kpi-value">
                {loading ? "--" : kpiCheckouts}
              </div>
              <div className="lux-kpi-title">Vehicle Check Outs</div>
            </div>
            <div className="lux-kpi-right-col">
              <div className="lux-kpi-badge green">
                <span className="lux-trend-arrow">↑</span>
                <span className="lux-trend-num">15%</span>
              </div>
              <div className="lux-kpi-compare">vs. yesterday</div>
            </div>
          </div>
        </div>

        {/* Card 4: Customer Satisfaction */}
        <div className="lux-kpi-card">
          <div className="lux-kpi-icon-wrap rose">
            <Star size={18} className="lux-kpi-icon" />
          </div>
          <div className="lux-kpi-content-row">
            <div className="lux-kpi-left-col">
              <div className="lux-kpi-value">
                {loading ? "--" : kpiSatisfaction} <span className="lux-kpi-denom">/ 5</span>
              </div>
              <div className="lux-kpi-title">Customer Satisfaction</div>
            </div>
            <div className="lux-kpi-right-col">
              <div className="lux-kpi-badge green">
                <span className="lux-trend-arrow">↑</span>
                <span className="lux-trend-num">2%</span>
              </div>
              <div className="lux-kpi-compare">vs. last week</div>
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
                        color: timeFilter === opt ? "#8b1230" : "#4a4a4a",
                        backgroundColor: timeFilter === opt ? "#fbeff2" : "transparent",
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
                  id="burgundyGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#8b1230"
                    stopOpacity="0.32"
                  />
                  <stop
                    offset="100%"
                    stopColor="#8b1230"
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
              <path d={areaPathD} fill="url(#burgundyGradient)" />

              {/* Line curve */}
              <path
                d={pathD}
                fill="none"
                stroke="#8b1230"
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

        {/* Right: Premium Valet Services Promo Card (Image 2) */}
        <div className="lux-card lux-promo-card">
          <img
            src="/dashboard-promo-banner.png"
            alt="Premium Valet Services - Safe. Secure. Seamless."
            className="lux-promo-img"
          />
        </div>
      </section>
    </div>
  );
}

export default LuxuryDashboardView;

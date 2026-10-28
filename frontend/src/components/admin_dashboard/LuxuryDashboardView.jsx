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
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [activeSegment, setActiveSegment] = useState(null);

  // Extract analytics from either direct prop or stats wrapper
  const analytics = directAnalytics || stats?.analytics || null;

  // Real-time KPI values with safe fallbacks
  const kpiTotalVehicles = analytics?.totalVehiclesToday ?? stats?.totalVehicles ?? 124;
  const kpiActiveParked = analytics?.activeParkingSessions ?? stats?.activeParkingSessions ?? 38;
  const kpiCheckouts = analytics?.todayCheckouts ?? stats?.todayCheckouts ?? 32;
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

  // Time trend data points (8 AM to 10 PM)
  const trendData = useMemo(() => {
    if (analytics?.hourlyTrend && analytics.hourlyTrend.some((t) => t.value > 0)) {
      const peakVal = Math.max(...analytics.hourlyTrend.map((t) => t.value));
      return analytics.hourlyTrend.map((t) => ({
        ...t,
        label: `${t.value} vehicle${t.value === 1 ? "" : "s"}${
          t.value === peakVal && t.value > 0 ? " (Peak)" : ""
        }`,
      }));
    }
    return defaultTrendData;
  }, [analytics?.hourlyTrend, defaultTrendData]);

  // SVG Chart dimensions & dynamic path calculation
  const chartWidth = 620;
  const chartHeight = 160;

  // Calculate dynamic maxY so chart never clips and scales smoothly
  const maxY = useMemo(() => {
    const maxVal = Math.max(...trendData.map((d) => d.value), 0);
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
    if (analytics?.vehicleTypes && analytics.vehicleTypes.some((t) => t.count > 0)) {
      const activeTypes = analytics.vehicleTypes.filter((t) => t.count > 0);
      const totalCount = activeTypes.reduce((a, b) => a + b.count, 0);
      return activeTypes.map((t) => ({
        ...t,
        percentage: totalCount > 0 ? Math.round((t.count / totalCount) * 100) : 0,
      }));
    }
    return defaultVehicleTypes;
  }, [analytics?.vehicleTypes, defaultVehicleTypes]);

  const totalDonutCount = useMemo(() => {
    if (analytics?.totalVehiclesToday !== undefined && analytics.totalVehiclesToday > 0) {
      return analytics.totalVehiclesToday;
    }
    if (stats?.totalVehicles !== undefined && stats.totalVehicles > 0) {
      return stats.totalVehicles;
    }
    return 124;
  }, [analytics?.totalVehiclesToday, stats?.totalVehicles]);

  // SVG Donut calculation
  const totalPercentage = 100;
  const radius = 62;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  const donutSegments = useMemo(() => {
    let cumulativePercent = 0;
    return vehicleTypes.map((type) => {
      const pct = Math.max(type.percentage, 1);
      const strokeDasharray = `${(pct / totalPercentage) * circumference} ${circumference}`;
      const strokeDashoffset = -((cumulativePercent / totalPercentage) * circumference);
      cumulativePercent += pct;
      return { ...type, strokeDasharray, strokeDashoffset };
    });
  }, [vehicleTypes, circumference]);

  // Recent Activity items with live data fallback
  const defaultRecentActivities = useMemo(() => [
    {
      id: "def-1",
      time: "10:42 AM",
      vehicleNo: "MH 12 AB 1234",
      type: "SUV",
      action: "Check In",
      status: "Parked",
      statusClass: "status-parked",
    },
    {
      id: "def-2",
      time: "10:37 AM",
      vehicleNo: "KA 05 CD 5678",
      type: "Sedan",
      action: "Check In",
      status: "Parked",
      statusClass: "status-parked",
    },
    {
      id: "def-3",
      time: "10:25 AM",
      vehicleNo: "DL 8C EF 9012",
      type: "Luxury",
      action: "Check Out",
      status: "Departed",
      statusClass: "status-departed",
    },
    {
      id: "def-4",
      time: "10:18 AM",
      vehicleNo: "MH 14 GH 3456",
      type: "Sedan",
      action: "Check In",
      status: "Parked",
      statusClass: "status-parked",
    },
    {
      id: "def-5",
      time: "10:05 AM",
      vehicleNo: "RJ 27 KL 7890",
      type: "SUV",
      action: "Check Out",
      status: "Departed",
      statusClass: "status-departed",
    },
  ], []);

  const recentActivities = useMemo(() => {
    if (analytics?.recentActivity && analytics.recentActivity.length > 0) {
      if (analytics.recentActivity.length >= 5) {
        return analytics.recentActivity.slice(0, 6);
      }
      return [
        ...analytics.recentActivity,
        ...defaultRecentActivities.slice(analytics.recentActivity.length, 5),
      ];
    }
    return defaultRecentActivities;
  }, [analytics?.recentActivity, defaultRecentActivities]);

  return (
    <div className="lux-dashboard">
      {/* ========================================================
          1. WELCOME HERO BANNER (MATCHING IMAGE 1 & 2)
      ======================================================== */}
      <section className="lux-welcome-banner">
        <div className="lux-welcome-text">
          <span className="lux-welcome-greeting">GOOD MORNING,</span>
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
          2. TOP 4 KPI STAT CARDS (MATCHING IMAGE 2)
      ======================================================== */}
      <section className="lux-stats-grid">
        {/* Card 1: Total Vehicles Today */}
        <div className="lux-kpi-card">
          <div className="lux-kpi-header">
            <div className="lux-kpi-icon-wrap rose">
              <Car size={20} className="lux-kpi-icon" />
            </div>
            <div className="lux-kpi-badge green">
              <span className="lux-trend-arrow">↑</span>
              <span className="lux-trend-num">12%</span>
            </div>
          </div>
          <div className="lux-kpi-body">
            <div className="lux-kpi-value">
              {loading ? "--" : kpiTotalVehicles}
            </div>
            <div className="lux-kpi-footer-row">
              <span className="lux-kpi-title">Total Vehicles Today</span>
              <span className="lux-kpi-compare">vs. yesterday</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Parked Vehicles */}
        <div className="lux-kpi-card">
          <div className="lux-kpi-header">
            <div className="lux-kpi-icon-wrap rose">
              <Clock size={20} className="lux-kpi-icon" />
            </div>
            <div className="lux-kpi-badge green">
              <span className="lux-trend-arrow">↑</span>
              <span className="lux-trend-num">8%</span>
            </div>
          </div>
          <div className="lux-kpi-body">
            <div className="lux-kpi-value">
              {loading ? "--" : kpiActiveParked}
            </div>
            <div className="lux-kpi-footer-row">
              <span className="lux-kpi-title">Active Parked Vehicles</span>
              <span className="lux-kpi-compare">vs. yesterday</span>
            </div>
          </div>
        </div>

        {/* Card 3: Vehicle Check Outs */}
        <div className="lux-kpi-card">
          <div className="lux-kpi-header">
            <div className="lux-kpi-icon-wrap rose">
              <LogOut size={20} className="lux-kpi-icon" />
            </div>
            <div className="lux-kpi-badge green">
              <span className="lux-trend-arrow">↑</span>
              <span className="lux-trend-num">15%</span>
            </div>
          </div>
          <div className="lux-kpi-body">
            <div className="lux-kpi-value">
              {loading ? "--" : kpiCheckouts}
            </div>
            <div className="lux-kpi-footer-row">
              <span className="lux-kpi-title">Vehicle Check Outs</span>
              <span className="lux-kpi-compare">vs. yesterday</span>
            </div>
          </div>
        </div>

        {/* Card 4: Customer Satisfaction */}
        <div className="lux-kpi-card">
          <div className="lux-kpi-header">
            <div className="lux-kpi-icon-wrap rose">
              <Star size={20} className="lux-kpi-icon" />
            </div>
            <div className="lux-kpi-badge green">
              <span className="lux-trend-arrow">↑</span>
              <span className="lux-trend-num">2%</span>
            </div>
          </div>
          <div className="lux-kpi-body">
            <div className="lux-kpi-value">
              {loading ? "--" : kpiSatisfaction} <span className="lux-kpi-denom">/ 5</span>
            </div>
            <div className="lux-kpi-footer-row">
              <span className="lux-kpi-title">Customer Satisfaction</span>
              <span className="lux-kpi-compare">vs. last week</span>
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

            <div className="lux-dropdown-pill">
              <Calendar size={14} />
              <span>{timeFilter}</span>
              <ChevronDown size={14} />
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
                {recentActivities.map((row, idx) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Premium Valet Services Promo Card (Image 2) */}
        <div className="lux-card lux-promo-card">
          <div className="lux-promo-content">
            <div className="lux-promo-gold-divider" />
            <h3 className="lux-promo-title">Premium Valet Services</h3>
            <p className="lux-promo-subtitle">
              Safe. Secure. Seamless.
            </p>
            <span className="lux-promo-desc">
              Safe, secure and professional valet parking for hotels, malls and luxury venues.
            </span>
            <div className="lux-promo-gold-divider bottom" />
          </div>

          <div className="lux-promo-visual">
            <img
              src="/dashboard-promo-banner.png"
              alt="Premium Valet Luxury Service"
              className="lux-promo-img"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export default LuxuryDashboardView;

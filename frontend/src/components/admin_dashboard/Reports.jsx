import ValetReport from "../reports/ValetReport";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import {
  getDashboardStats,
  getRevenuePerformance,
} from "../../api/adminApi";
import { getParkingReports } from "../../api/parkingApi";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import "./Reports.css";

function Reports() {
  const [range, setRange] = useState("7");
  const [stats, setStats] = useState({
    totalStaff: 0,
    activeStaff: 0,
    totalCustomers: 0,
    activeParkingSessions: 0,
    openIncidents: 0,
    todayRevenue: 0,
  });

  const [parkingReports, setParkingReports] = useState({
    dailyCheckIns: 0,
    dailyCheckOuts: 0,
    totalSlots: 0,
    occupiedSlots: 0,
    occupancyRate: 0,
  });
  const [revenueData, setRevenueData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [adminRes, parkingRes, revenueRes] = await Promise.all([
        getDashboardStats(),
        getParkingReports(),
        getRevenuePerformance(Number(range)),
      ]);

      if (!adminRes?.success || !adminRes.stats) {
        throw new Error("Failed to load dashboard statistics.");
      }
      if (!parkingRes?.success || !parkingRes.reports) {
        throw new Error("Failed to load parking reports.");
      }
      if (!revenueRes?.success || !Array.isArray(revenueRes.revenue)) {
        throw new Error("Failed to load revenue performance.");
      }

      setStats(adminRes.stats);
      setParkingReports(parkingRes.reports);
      setRevenueData(revenueRes.revenue);
    } catch (err) {
      console.error("Load reports data error:", err);
      setError(err.message || "Failed to load reporting data.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtimeSync({
    tables: ["payments"],
    onUpdate: loadData,
    interval: 30000,
  });

  const formattedRevenue = Number(stats.todayRevenue || 0).toLocaleString("en-IN");
  const periodRevenue = revenueData.reduce(
    (total, item) => total + Number(item.value || 0),
    0
  );
  const highestRevenue = Math.max(
    0,
    ...revenueData.map((item) => Number(item.value || 0))
  );
  const axisMaximum =
    highestRevenue === 0
      ? 1000
      : Math.ceil(highestRevenue / 4000) * 4000;
  const chartCoordinates = revenueData.map((item, index) => {
    const x =
      revenueData.length === 1
        ? 350
        : (index / (revenueData.length - 1)) * 700;
    const y = 205 - (Number(item.value || 0) / axisMaximum) * 185;

    return { ...item, x, y };
  });
  const chartLinePoints = chartCoordinates
    .map(({ x, y }) => `${x},${y}`)
    .join(" ");
  const labelIndexes = new Set(
    Array.from({ length: Math.min(7, revenueData.length) }, (_, index) =>
      Math.round(
        (index * (revenueData.length - 1)) /
          Math.max(1, Math.min(7, revenueData.length) - 1)
      )
    )
  );
  const formatChartDate = (date) => {
    const [year, month, day] = date.split("-").map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));
    return parsedDate.toLocaleDateString("en-IN", {
      timeZone: "UTC",
      ...(revenueData.length <= 7
        ? { weekday: "short" }
        : { day: "numeric", month: "short" }),
    });
  };
  const formatAxisValue = (value) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
    return `₹${Math.round(value)}`;
  };

  return (
    <div className="reports-page">
      {/* HEADER */}
      <section className="reports-header">
        <div>
          <p className="reports-eyebrow">ANALYTICS</p>
          <h2>System Overview</h2>
          <p className="reports-description">
            Monitor real-time parking activity, revenue, customer volume, and workforce capacity.
          </p>
        </div>

        <div className="reports-controls" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="act-btn primary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "38px", padding: "0 14px", borderRadius: "8px", background: "#5e3573", color: "#ffffff", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "12px" }}
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? "refresh-spinning" : ""} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>

          <div className="date-range">
            <span className="range-icon">◷</span>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>
      </section>

      {/* VALET REPORT: filter, view and download */}
      <ValetReport />

      {error && (
        <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontWeight: "600", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* KPI CARDS */}
      <section className="report-kpi-grid">
        <div className="report-kpi-card">
          <div className="report-kpi-top">
            <div className="report-kpi-icon revenue">₹</div>
            <span className="kpi-trend positive">Today's Total</span>
          </div>
          <p>Today's Revenue</p>
          <h3>{loading ? "₹ --" : `₹ ${formattedRevenue}`}</h3>
          <span>Collected from paid parking tickets</span>
        </div>

        <div className="report-kpi-card">
          <div className="report-kpi-top">
            <div className="report-kpi-icon parking">P</div>
            <span className="kpi-trend positive">Active</span>
          </div>
          <p>Active Parking Sessions</p>
          <h3>{loading ? "--" : stats.activeParkingSessions}</h3>
          <span>Vehicles currently parked or retrieving</span>
        </div>

        <div className="report-kpi-card">
          <div className="report-kpi-top">
            <div className="report-kpi-icon customers">C</div>
            <span className="kpi-trend positive">Total</span>
          </div>
          <p>Registered Customers</p>
          <h3>{loading ? "--" : stats.totalCustomers}</h3>
          <span>Active vehicle owners in database</span>
        </div>

        <div className="report-kpi-card">
          <div className="report-kpi-top">
            <div className="report-kpi-icon incidents">!</div>
            <span className="kpi-trend neutral">Attention</span>
          </div>
          <p>Open Incidents</p>
          <h3>{loading ? "--" : stats.openIncidents}</h3>
          <span>Pending facility issues requiring review</span>
        </div>
      </section>

      {/* MAIN ANALYTICS */}
      <section className="reports-main-grid">
        {/* Revenue Overview */}
        <div className="report-panel revenue-panel">
          <div className="report-panel-header">
            <div>
              <h3>Revenue Performance</h3>
              <p>Paid revenue over the selected period</p>
            </div>
          </div>

          <div className="revenue-summary">
            <strong>
              {loading ? "₹ --" : `₹ ${periodRevenue.toLocaleString("en-IN")}`}
            </strong>
            <span>Total collected in {range} days</span>
          </div>

          <div className="revenue-chart">
            <div className="chart-y-axis">
              {[1, 0.75, 0.5, 0.25, 0].map((fraction) => (
                <span key={fraction}>
                  {formatAxisValue(axisMaximum * fraction)}
                </span>
              ))}
            </div>

            <div className="chart-area">
              <div className="chart-grid-lines">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>

              <svg
                className="revenue-line"
                viewBox="0 0 700 240"
                preserveAspectRatio="none"
              >
                <polyline
                  points={chartLinePoints}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {chartCoordinates.map((item) => (
                  <circle
                    key={item.date}
                    cx={item.x}
                    cy={item.y}
                    r="3"
                    fill="currentColor"
                  >
                    <title>
                      {`${item.date}: ₹${Number(item.value || 0).toLocaleString("en-IN")}`}
                    </title>
                  </circle>
                ))}
              </svg>

              <div className="chart-points">
                {revenueData.map((item, index) => (
                  labelIndexes.has(index) && (
                  <div
                    className="chart-point"
                    key={item.date}
                    style={{
                      left: `${revenueData.length === 1 ? 50 : (index / (revenueData.length - 1)) * 100}%`,
                    }}
                    title={`${item.date}: ₹${Number(item.value || 0).toLocaleString("en-IN")}`}
                  >
                    <span></span>
                    <label>{formatChartDate(item.date)}</label>
                  </div>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Facility Utilization */}
        <div className="report-panel parking-activity-panel">
          <div className="report-panel-header">
            <div>
              <h3>Facility Utilization</h3>
              <p>Real-time slot occupancy</p>
            </div>
          </div>

          <div className="parking-circle">
            <div className="circle-inner">
              <strong>{loading ? "--" : `${parkingReports.occupancyRate}%`}</strong>
              <span>Occupancy</span>
            </div>
          </div>

          <div className="parking-legend">
            <div>
              <span className="legend-dot completed"></span>
              Occupied Slots
              <strong>{loading ? "--" : parkingReports.occupiedSlots}</strong>
            </div>

            <div>
              <span className="legend-dot active"></span>
              Total Capacity
              <strong>{loading ? "--" : parkingReports.totalSlots}</strong>
            </div>

            <div>
              <span className="legend-dot cancelled"></span>
              Daily Check-ins
              <strong>{loading ? "--" : parkingReports.dailyCheckIns}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* LOWER SECTION */}
      <section className="reports-bottom-grid">
        {/* Workforce Status */}
        <div className="report-panel">
          <div className="report-panel-header">
            <div>
              <h3>Workforce Activity</h3>
              <p>Operational staff accounts</p>
            </div>
          </div>

          <div className="staff-activity">
            <div className="activity-stat">
              <span>Total Staff</span>
              <strong>{loading ? "--" : stats.totalStaff}</strong>
            </div>

            <div className="activity-stat">
              <span>Active</span>
              <strong className="green-text">{loading ? "--" : stats.activeStaff}</strong>
            </div>

            <div className="activity-stat">
              <span>Inactive</span>
              <strong>{loading ? "--" : Math.max(0, stats.totalStaff - stats.activeStaff)}</strong>
            </div>
          </div>
        </div>

        {/* System Operations */}
        <div className="report-panel">
          <div className="report-panel-header">
            <div>
              <h3>Operations Status</h3>
              <p>Facility readiness check</p>
            </div>
            <span className="incident-count" style={{ background: stats.openIncidents > 0 ? "#fef2f2" : "#ecfdf5", color: stats.openIncidents > 0 ? "#b91c1c" : "#047857" }}>
              {stats.openIncidents > 0 ? `${stats.openIncidents} Incidents` : "Normal"}
            </span>
          </div>

          <div className="incident-list">
            <div className="incident-item">
              <span className="incident-dot low"></span>
              <div>
                <strong>Database & API</strong>
                <span>Supabase PostgreSQL connected</span>
              </div>
              <small style={{ color: "#10b981" }}>Operational</small>
            </div>

            <div className="incident-item">
              <span className="incident-dot low"></span>
              <div>
                <strong>Auth & RBAC Guards</strong>
                <span>Active session verification</span>
              </div>
              <small style={{ color: "#10b981" }}>Active</small>
            </div>

            <div className="incident-item">
              <span className="incident-dot low"></span>
              <div>
                <strong>Parking Dispatch Queue</strong>
                <span>{stats.activeParkingSessions} vehicles active</span>
              </div>
              <small style={{ color: "#10b981" }}>Running</small>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Reports;
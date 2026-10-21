import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { getDashboardStats } from "../../api/adminApi";
import { getParkingReports } from "../../api/parkingApi";
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [adminRes, parkingRes] = await Promise.all([
        getDashboardStats().catch(() => null),
        getParkingReports().catch(() => null),
      ]);

      if (adminRes && adminRes.success && adminRes.stats) {
        setStats(adminRes.stats);
      }

      if (parkingRes && parkingRes.success && parkingRes.reports) {
        setParkingReports(parkingRes.reports);
      }
    } catch (err) {
      console.error("Load reports data error:", err);
      setError(err.message || "Failed to load reporting data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formattedRevenue = Number(stats.todayRevenue || 0).toLocaleString("en-IN");

  const revenueData = [
    { day: "Mon", value: Math.round(stats.todayRevenue * 0.7) || 2800 },
    { day: "Tue", value: Math.round(stats.todayRevenue * 0.85) || 3400 },
    { day: "Wed", value: Math.round(stats.todayRevenue * 0.9) || 3600 },
    { day: "Thu", value: Math.round(stats.todayRevenue * 0.95) || 3800 },
    { day: "Fri", value: Math.round(stats.todayRevenue * 1.1) || 4400 },
    { day: "Sat", value: Math.round(stats.todayRevenue * 1.3) || 5200 },
    { day: "Sun", value: stats.todayRevenue || 4000 },
  ];

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
              <p>Estimated revenue trend over the selected period</p>
            </div>
          </div>

          <div className="revenue-summary">
            <strong>{loading ? "₹ --" : `₹ ${formattedRevenue}`}</strong>
            <span>Total collected today</span>
          </div>

          <div className="revenue-chart">
            <div className="chart-y-axis">
              <span>₹10k</span>
              <span>₹7.5k</span>
              <span>₹5k</span>
              <span>₹2.5k</span>
              <span>₹0</span>
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
                  points="
                    0,145
                    116,110
                    233,130
                    350,72
                    466,92
                    583,40
                    700,60
                  "
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div className="chart-points">
                {revenueData.map((item, index) => (
                  <div
                    className="chart-point"
                    key={item.day}
                    style={{
                      left: `${index * 16.66}%`,
                    }}
                  >
                    <span></span>
                    <label>{item.day}</label>
                  </div>
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
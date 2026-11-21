import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Building2, Car, Users, TrendingUp, Calendar, ShieldCheck, Award } from "lucide-react";
import PerformanceReport from "../reports/PerformanceReport";
import ValetReport from "../reports/ValetReport";
import ManagerReport from "../reports/ManagerReport";
import {
  getDashboardStats,
  getRevenuePerformance,
  getSystemReports,
} from "../../api/adminApi";
import { getBuildings } from "../../api/areaApi";
import { getParkingReports } from "../../api/parkingApi";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import BranchSelector from "../common/BranchSelector";
import "./Reports.css";

function Reports() {
  const currentUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const isManager = currentUser?.role === "manager" || currentUser?.role === "parking_admin";

  const [range, setRange] = useState("7");
  const [selectedHotel, setSelectedHotel] = useState("all");
  const [hotels, setHotels] = useState([]);
  const [reportPeriod, setReportPeriod] = useState("daily"); // "daily" | "weekly" | "monthly"
  const [activeReportTab, setActiveReportTab] = useState("overview");

  const [stats, setStats] = useState({
    totalStaff: 0,
    activeStaff: 0,
    totalCustomers: 0,
    activeParkingSessions: 0,
    openIncidents: 0,
    todayRevenue: 0,
  });

  const [systemReports, setSystemReports] = useState(null);
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

  // Load buildings on mount
  useEffect(() => {
    getBuildings()
      .then((res) => {
        if (res?.buildings && Array.isArray(res.buildings)) {
          if (isManager) {
            const myHotel = currentUser?.assigned_hotel_id
              ? res.buildings.find((b) => b.id === currentUser.assigned_hotel_id) || res.buildings[0]
              : res.buildings[0];
            setHotels(myHotel ? [myHotel] : res.buildings);
            if (myHotel) {
              setSelectedHotel(myHotel.id);
            }
          } else {
            setHotels(res.buildings);
          }
        }
      })
      .catch((err) => console.error("Error loading hotels in reports:", err));
  }, [isManager, currentUser?.assigned_hotel_id]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [adminRes, parkingRes, revenueRes, systemRes] = await Promise.allSettled([
        getDashboardStats(selectedHotel),
        getParkingReports(),
        getRevenuePerformance(Number(range), selectedHotel),
        getSystemReports({ hotelId: selectedHotel, period: reportPeriod }),
      ]);

      if (adminRes.status === "fulfilled" && adminRes.value?.success && adminRes.value.stats) {
        setStats(adminRes.value.stats);
      }
      if (parkingRes.status === "fulfilled" && parkingRes.value?.success && parkingRes.value.reports) {
        setParkingReports(parkingRes.value.reports);
      }
      if (revenueRes.status === "fulfilled" && revenueRes.value?.success && Array.isArray(revenueRes.value.revenue)) {
        setRevenueData(revenueRes.value.revenue);
      }
      if (systemRes.status === "fulfilled" && systemRes.value?.success) {
        setSystemReports(systemRes.value);
      }
    } catch (err) {
      console.error("Load reports data error:", err);
      setError(err?.message || "Failed to load reporting data.");
    } finally {
      setLoading(false);
    }
  }, [range, selectedHotel, reportPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtimeSync({
    tables: ["payments", "parking_sessions"],
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
      {/* HEADER WITH HOTEL & PERIOD FILTERS */}
      <section className="reports-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: "14px" }}>
        <div>
          <p className="reports-eyebrow">ANALYTICS & REPORTING</p>
          <h2 style={{ whiteSpace: "nowrap" }}>
            {isManager
              ? `${hotels[0]?.building_name || "Hotel Branch"} Performance & Reports`
              : "Multi-Hotel Performance & Reports"}
          </h2>
        </div>

        {/* Dedicated Hotel Branch Filter Row */}
        {hotels.length > 0 && (
          <div style={{ background: "#ffffff", padding: "14px 20px", borderRadius: "14px", border: "1px solid #f1e4e6", margin: "16px 0", width: "100%" }}>
            <BranchSelector
              hotels={hotels}
              selectedHotel={selectedHotel}
              onSelectHotel={setSelectedHotel}
              label="Hotel Branch:"
              allLabel="All Hotels Combined"
              size="sm"
            />
          </div>
        )}

        <div className="reports-controls" style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", width: "100%" }}>
          {/* Period selector */}
          <div className="date-range">
            <span className="range-icon">◷</span>
            <select
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
            >
              <option value="daily">Daily Report</option>
              <option value="weekly">Weekly Report</option>
              <option value="monthly">Monthly Report</option>
            </select>
          </div>

          <button
            type="button"
            className="act-btn primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              height: "36px",
              padding: "0 14px",
              borderRadius: "8px",
              background: "#42235e",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "12px",
            }}
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? "refresh-spinning" : ""} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </section>

      {/* SUB-NAV REPORT SECTIONS */}
      <div role="tablist" aria-label="Performance report sections" style={{ display: "flex", gap: "8px", margin: "16px 0", borderBottom: "1px solid #e5e7eb", paddingBottom: "10px", flexWrap: "wrap" }}>
        {[
          { id: "overview", label: "Executive Overview" },
          { id: "hotels", label: isManager ? "Branch Occupancy & Details" : "Hotel-Wise Comparison" },
          { id: "valets", label: isManager ? "Valet Staff Performance" : "Staff & Valet Performance" },
          { id: "vehicles", label: "Vehicle Categories & Top Visitors" },
          { id: "valetReport", label: "Valet Report" },
          { id: "managerReport", label: "Manager Report" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeReportTab === tab.id}
            onClick={() => setActiveReportTab(tab.id)}
            style={{
              padding: "7px 13px",
              borderRadius: "999px",
              border: activeReportTab === tab.id ? "1px solid #42235e" : "1px solid #e5e7eb",
              fontSize: "13px",
              fontWeight: "700",
              background: activeReportTab === tab.id ? "#42235e" : "#f3f4f6",
              color: activeReportTab === tab.id ? "#ffffff" : "#4b5563",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontWeight: "600", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeReportTab === "overview" && (
        <>
          {/* KPI CARDS */}
          <section className="report-kpi-grid">
            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <div className="report-kpi-icon revenue">₹</div>
                <span className="kpi-trend positive">Total</span>
              </div>
              <p>Period Revenue</p>
              <h3>₹ {loading ? "--" : (systemReports?.summary?.totalRevenue ?? stats.todayRevenue).toLocaleString("en-IN")}</h3>
              <span>{reportPeriod.toUpperCase()} earnings across selected branch</span>
            </div>

            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <div className="report-kpi-icon parking">P</div>
                <span className="kpi-trend positive">Total Vehicles</span>
              </div>
              <p>Total Vehicles Parked</p>
              <h3>{loading ? "--" : (systemReports?.summary?.totalVehiclesParked ?? stats.totalVehicles ?? 0)}</h3>
              <span>Cumulative vehicles served</span>
            </div>

            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <div className="report-kpi-icon customers">C</div>
                <span className="kpi-trend positive">Active</span>
              </div>
              <p>Active Parked Vehicles</p>
              <h3>{loading ? "--" : (systemReports?.summary?.activeSessions ?? stats.activeParkingSessions ?? 0)}</h3>
              <span>Currently in slots</span>
            </div>

            <div className="report-kpi-card">
              <div className="report-kpi-top">
                <div className="report-kpi-icon staff">✓</div>
                <span className="kpi-trend positive">Completed</span>
              </div>
              <p>Completed Returns</p>
              <h3>{loading ? "--" : (systemReports?.summary?.totalCheckouts ?? stats.todayCheckouts ?? 0)}</h3>
              <span>Returned to guests</span>
            </div>
          </section>

          {/* REVENUE CHART & UTILIZATION */}
          <section className="reports-middle-grid">
            <div className="report-panel revenue-panel">
              <div className="report-panel-header">
                <div>
                  <h3>Revenue Trend ({range} Days)</h3>
                  <p>Daily parking fee intake</p>
                </div>
                <div className="panel-summary">
                  <span className="summary-label">Total in window:</span>
                  <strong className="summary-value">₹ {periodRevenue.toLocaleString("en-IN")}</strong>
                </div>
              </div>

              <div className="chart-wrapper">
                <div className="chart-y-axis">
                  {[1, 0.75, 0.5, 0.25, 0].map((step, idx) => (
                    <span key={idx}>{formatAxisValue(axisMaximum * step)}</span>
                  ))}
                </div>

                <div className="chart-container">
                  <svg viewBox="0 0 700 220" className="revenue-svg" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="reportsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#42235e" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#42235e" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>

                    {[20, 66, 112, 159, 205].map((yVal, i) => (
                      <line key={i} x1="0" y1={yVal} x2="700" y2={yVal} stroke="#f0e4e6" strokeDasharray="3 3" />
                    ))}

                    {revenueData.length > 0 && (
                      <>
                        <polygon
                          points={`0,205 ${chartLinePoints} 700,205`}
                          fill="url(#reportsGrad)"
                        />
                        <polyline
                          points={chartLinePoints}
                          fill="none"
                          stroke="#42235e"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </>
                    )}
                  </svg>
                </div>
              </div>
            </div>

            {/* Facility Utilization */}
            <div className="report-panel parking-activity-panel">
              <div className="report-panel-header">
                <div>
                  <h3>Slot Occupancy</h3>
                  <p>Real-time capacity utilization</p>
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

          {/* VALET REPORT DOWNLOAD */}
          <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <ValetReport />
            <ManagerReport />
          </div>
        </>
      )}

      {/* TAB 2: HOTEL-WISE COMPARISON TABLE */}
      {activeReportTab === "hotels" && (
        <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "700", color: "#1f2937" }}>
            Hotel Branch Performance & Occupancy Breakdown
          </h3>
          <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#6b7280" }}>
            Comparative parking volumes, revenue, and infrastructure utilization across branches.
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "12px 14px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>HOTEL BRANCH</th>
                <th style={{ padding: "12px 14px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>TOTAL SLOTS</th>
                <th style={{ padding: "12px 14px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>OCCUPIED</th>
                <th style={{ padding: "12px 14px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>OCCUPANCY %</th>
                <th style={{ padding: "12px 14px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>TOTAL SESSIONS</th>
                <th style={{ padding: "12px 14px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>REVENUE</th>
                <th style={{ padding: "12px 14px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>STAFF COUNT</th>
              </tr>
            </thead>
            <tbody>
              {(!systemReports?.hotelReports || systemReports.hotelReports.length === 0) ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "#6b7280" }}>
                    No hotel branch metrics available for the selected period.
                  </td>
                </tr>
              ) : (
                systemReports.hotelReports.map((h) => (
                  <tr key={h.hotel_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 14px", fontWeight: "600", color: "#42235e", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Building2 size={16} />
                      {h.hotel_name}
                    </td>
                    <td style={{ padding: "12px 14px" }}>{h.totalSlots}</td>
                    <td style={{ padding: "12px 14px" }}>{h.occupiedSlots}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: h.occupancyRate > 75 ? "#fee2e2" : h.occupancyRate > 40 ? "#fef3c7" : "#ecfdf5",
                        color: h.occupancyRate > 75 ? "#991b1b" : h.occupancyRate > 40 ? "#92400e" : "#065f46"
                      }}>
                        {h.occupancyRate}%
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: "600" }}>{h.sessionsCount}</td>
                    <td style={{ padding: "12px 14px", fontWeight: "700", color: "#15803d" }}>
                      ₹{Number(h.revenue || 0).toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "12px 14px" }}>{h.staffCount} staff</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: STAFF & VALET PERFORMANCE */}
      {activeReportTab === "valets" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Valet Performance */}
          <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", padding: "20px" }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "700", color: "#1f2937", display: "flex", alignItems: "center", gap: "6px" }}>
              <Award size={18} color="#42235e" />
              Valet Staff Performance
            </h3>
            <p style={{ margin: "0 0 14px 0", fontSize: "12.5px", color: "#6b7280" }}>
              Vehicles parked and completed returns by valet attendants.
            </p>

            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "8px 10px", fontSize: "11.5px", fontWeight: "700", color: "#475569" }}>VALET</th>
                  <th style={{ padding: "8px 10px", fontSize: "11.5px", fontWeight: "700", color: "#475569" }}>HOTEL</th>
                  <th style={{ padding: "8px 10px", fontSize: "11.5px", fontWeight: "700", color: "#475569" }}>PARKED</th>
                  <th style={{ padding: "8px 10px", fontSize: "11.5px", fontWeight: "700", color: "#475569" }}>RETURNS</th>
                  <th style={{ padding: "8px 10px", fontSize: "11.5px", fontWeight: "700", color: "#475569" }}>REVENUE</th>
                </tr>
              </thead>
              <tbody>
                {(!systemReports?.valetPerformance || systemReports.valetPerformance.length === 0) ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "24px", color: "#6b7280" }}>
                      No valet activity logged yet.
                    </td>
                  </tr>
                ) : (
                  systemReports.valetPerformance.map((v) => (
                    <tr key={v.valet_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px", fontWeight: "600", fontSize: "13px" }}>{v.name}</td>
                      <td style={{ padding: "10px", fontSize: "12px", color: "#6b7280" }}>{v.hotel_name || "General"}</td>
                      <td style={{ padding: "10px", fontWeight: "600" }}>{v.sessionsHandled}</td>
                      <td style={{ padding: "10px", color: "#15803d", fontWeight: "600" }}>{v.returnsCompleted}</td>
                      <td style={{ padding: "10px", fontWeight: "700" }}>₹{Number(v.revenueCollected || 0).toLocaleString("en-IN")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Manager Performance */}
          <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", padding: "20px" }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "700", color: "#1f2937", display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldCheck size={18} color="#42235e" />
              Manager Assignments & Coverage
            </h3>
            <p style={{ margin: "0 0 14px 0", fontSize: "12.5px", color: "#6b7280" }}>
              Active managers and their hotel floor supervision.
            </p>

            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "8px 10px", fontSize: "11.5px", fontWeight: "700", color: "#475569" }}>MANAGER</th>
                  <th style={{ padding: "8px 10px", fontSize: "11.5px", fontWeight: "700", color: "#475569" }}>EMAIL</th>
                  <th style={{ padding: "8px 10px", fontSize: "11.5px", fontWeight: "700", color: "#475569" }}>HOTEL BRANCH</th>
                  <th style={{ padding: "8px 10px", fontSize: "11.5px", fontWeight: "700", color: "#475569" }}>ASSIGNED FLOOR</th>
                </tr>
              </thead>
              <tbody>
                {(!systemReports?.managerPerformance || systemReports.managerPerformance.length === 0) ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: "24px", color: "#6b7280" }}>
                      No manager assignments found.
                    </td>
                  </tr>
                ) : (
                  systemReports.managerPerformance.map((m) => (
                    <tr key={m.manager_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px", fontWeight: "600", fontSize: "13px" }}>{m.name}</td>
                      <td style={{ padding: "10px", fontSize: "12px", color: "#6b7280" }}>{m.email}</td>
                      <td style={{ padding: "10px", fontWeight: "600", color: "#42235e" }}>{m.hotel_name || "General"}</td>
                      <td style={{ padding: "10px", fontSize: "12.5px" }}>{m.floor_name || "All Floors"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: VEHICLE STATS & TOP VISITORS */}
      {activeReportTab === "vehicles" && (
        <div>
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1f2937" }}>
              Vehicle Categories &amp; Top Visitors
            </h3>
          </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Vehicle Categories */}
          <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", padding: "20px" }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "700", color: "#1f2937", display: "flex", alignItems: "center", gap: "6px" }}>
              <Car size={18} color="#42235e" />
              Visiting Vehicle Categories
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "12.5px", color: "#6b7280" }}>
              Most frequently visiting vehicle types (SUV, Sedan, Hatchback, EV, Luxury).
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {(!systemReports?.vehicleCategories || systemReports.vehicleCategories.length === 0) ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>
                  No vehicle category records available.
                </div>
              ) : (
                systemReports.vehicleCategories.map((cat) => (
                  <div key={cat.category} style={{ background: "#fafafa", padding: "12px", borderRadius: "10px", border: "1px solid #f0f0f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontWeight: "700", fontSize: "13px", color: "#1f2937" }}>{cat.category}</span>
                      <span style={{ fontSize: "12.5px", fontWeight: "600", color: "#42235e" }}>{cat.count} vehicles ({cat.percentage}%)</span>
                    </div>
                    <div style={{ width: "100%", height: "7px", background: "#f3f4f6", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${cat.percentage}%`, height: "100%", background: "#42235e", borderRadius: "4px" }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Frequent Vehicles */}
          <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", padding: "20px" }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "700", color: "#1f2937" }}>
              Top Frequent Visiting Vehicles
            </h3>
            <p style={{ margin: "0 0 14px 0", fontSize: "12.5px", color: "#6b7280" }}>
              Vehicles with the highest parking frequency across hotels.
            </p>

            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "8px 10px", fontSize: "11.5px", fontWeight: "700", color: "#475569" }}>PLATE NUMBER</th>
                  <th style={{ padding: "8px 10px", fontSize: "11.5px", fontWeight: "700", color: "#475569" }}>VEHICLE MODEL</th>
                  <th style={{ padding: "8px 10px", fontSize: "11.5px", fontWeight: "700", color: "#475569" }}>CUSTOMER</th>
                  <th style={{ padding: "8px 10px", fontSize: "11.5px", fontWeight: "700", color: "#475569" }}>VISITS</th>
                </tr>
              </thead>
              <tbody>
                {(!systemReports?.topFrequentVehicles || systemReports.topFrequentVehicles.length === 0) ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: "24px", color: "#6b7280" }}>
                      No frequent visitor history found.
                    </td>
                  </tr>
                ) : (
                  systemReports.topFrequentVehicles.map((v, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px", fontWeight: "700", color: "#42235e" }}>{v.license_plate}</td>
                      <td style={{ padding: "10px", fontSize: "12.5px" }}>{v.model}</td>
                      <td style={{ padding: "10px", fontSize: "12.5px", color: "#4b5563" }}>{v.customer_name}</td>
                      <td style={{ padding: "10px", fontWeight: "700", color: "#15803d" }}>{v.visits} visits</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}
      {["valetReport", "managerReport"].includes(activeReportTab) && (
        <PerformanceReport
          type={activeReportTab === "valetReport" ? "valet" : "manager"}
          report={systemReports}
          hotelName={selectedHotel === "all" ? "All Hotels" : hotels.find((hotel) => hotel.id === selectedHotel)?.building_name || "Selected Hotel"}
          period={reportPeriod}
          loading={loading}
          selectedHotel={selectedHotel}
        />
      )}
    </div>
  );
}

export default Reports;

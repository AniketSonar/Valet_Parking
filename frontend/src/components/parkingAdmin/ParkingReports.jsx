import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  TrendingUp,
  LogIn,
  CheckCircle2,
  ParkingSquare,
  Clock3,
} from "lucide-react";

import {
  getParkingReports,
  getParkingSlots,
} from "../../api/parkingApi";

import ValetReport from "../reports/ValetReport";
import "./css/ParkingReports.css";

const DEFAULT_REPORTS = {
  dailyCheckIns: 0,
  dailyCheckOuts: 0,
  totalSlots: 0,
  occupiedSlots: 0,
  occupancyRate: 0,
  retrievalRequests: 0,
  activeRetrievals: 0,
};

const ParkingReports = () => {
  const [reports, setReports] = useState(DEFAULT_REPORTS);
  const [rowBreakdown, setRowBreakdown] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadReports = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const [reportsResponse, slotsResponse] = await Promise.all([
        getParkingReports(),
        getParkingSlots(),
      ]);

      // --------------------------------------------------------
      // REPORT DATA
      // --------------------------------------------------------

      if (!reportsResponse?.success) {
        throw new Error(
          reportsResponse?.message ||
            "Failed to load operational reports."
        );
      }

      setReports({
        ...DEFAULT_REPORTS,
        ...(reportsResponse.reports || {}),
      });

      // --------------------------------------------------------
      // PARKING SLOT BREAKDOWN
      // --------------------------------------------------------

      if (!slotsResponse?.success) {
        throw new Error(
          slotsResponse?.message ||
            "Failed to load parking slot data."
        );
      }

      const slots = Array.isArray(slotsResponse.slots)
        ? slotsResponse.slots
        : [];

      const groups = {};

      slots.forEach((slot) => {
        const slotNumber = String(
          slot.slot_number || ""
        ).trim();

        const match = slotNumber.match(/^[A-Za-z]+/);

        const rowName = match
          ? `Zone / Row ${match[0].toUpperCase()}`
          : "Zone General";

        if (!groups[rowName]) {
          groups[rowName] = {
            total: 0,
            occupied: 0,
          };
        }

        groups[rowName].total += 1;

        if (slot.status === "occupied") {
          groups[rowName].occupied += 1;
        }
      });

      const breakdown = Object.entries(groups)
        .map(([name, data]) => {
          const rate =
            data.total > 0
              ? Math.round(
                  (data.occupied / data.total) * 100
                )
              : 0;

          return {
            name,
            total: data.total,
            occupied: data.occupied,
            rate,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      setRowBreakdown(breakdown);
    } catch (err) {
      console.error("Load reports error:", err);

      setError(
        err?.message ||
          "Failed to fetch reporting analytics."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports(true);
  }, [loadReports]);

  const retrievalActivity =
    Number(reports.retrievalRequests || 0) +
    Number(reports.activeRetrievals || 0);

  return (
    <main className="reports-container">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <header className="reports-header">
        <div className="reports-header-content">
          <span className="reports-eyebrow">
            ANALYTICS & METRICS
          </span>

          <h2>Operational Reports</h2>

          <p>
            Real-time summary of daily check-ins,
            facility occupancy, and vehicle operations.
          </p>
        </div>

        <button
          type="button"
          className="reports-refresh-btn"
          onClick={() => loadReports(false)}
          disabled={loading || refreshing}
        >
          <RefreshCw
            size={15}
            className={
              refreshing
                ? "refresh-spinning"
                : ""
            }
          />

          <span>
            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </span>
        </button>
      </header>

      {/* VALET REPORT: filter, view and download */}
      <ValetReport />

      {/* ======================================================
          ERROR
          ====================================================== */}

      {error && (
        <div className="reports-error">
          <span className="reports-error-icon">
            !
          </span>

          <span>{error}</span>
        </div>
      )}

      {/* ======================================================
          KPI CARDS
          ====================================================== */}

      <section className="report-cards-grid">

        {/* DAILY CHECK-INS */}

        <article className="report-stat-card">
          <div className="report-stat-top">
            <div className="report-stat-icon purple">
              <LogIn size={18} />
            </div>

            <span className="report-stat-label">
              DAILY CHECK-INS
            </span>
          </div>

          <h3>
            {loading
              ? "--"
              : reports.dailyCheckIns}
          </h3>

          <div className="report-stat-description">
            <TrendingUp size={13} />
            <span>Vehicles admitted today</span>
          </div>
        </article>

        {/* DAILY RETURNS */}

        <article className="report-stat-card">
          <div className="report-stat-top">
            <div className="report-stat-icon green">
              <CheckCircle2 size={18} />
            </div>

            <span className="report-stat-label">
              DAILY RETURNS
            </span>
          </div>

          <h3>
            {loading
              ? "--"
              : reports.dailyCheckOuts}
          </h3>

          <div className="report-stat-description positive">
            <CheckCircle2 size={13} />
            <span>Vehicles returned today</span>
          </div>
        </article>

        {/* FACILITY OCCUPANCY */}

        <article className="report-stat-card">
          <div className="report-stat-top">
            <div className="report-stat-icon blue">
              <ParkingSquare size={18} />
            </div>

            <span className="report-stat-label">
              FACILITY OCCUPANCY
            </span>
          </div>

          <h3>
            {loading
              ? "--"
              : `${reports.occupancyRate}%`}
          </h3>

          <div className="report-stat-description neutral">
            <span>
              {reports.occupiedSlots} of{" "}
              {reports.totalSlots} slots occupied
            </span>
          </div>
        </article>

        {/* RETRIEVAL ACTIVITY */}

        <article className="report-stat-card">
          <div className="report-stat-top">
            <div className="report-stat-icon amber">
              <Clock3 size={18} />
            </div>

            <span className="report-stat-label">
              RETRIEVAL ACTIVITY
            </span>
          </div>

          <h3>
            {loading
              ? "--"
              : retrievalActivity}
          </h3>

          <div className="report-stat-description neutral">
            <span>
              {reports.retrievalRequests} awaiting,{" "}
              {reports.activeRetrievals} in progress
            </span>
          </div>
        </article>

      </section>

      {/* ======================================================
          ZONE / ROW OCCUPANCY
          ====================================================== */}

      <section className="report-panel">

        <div className="report-panel-header">
          <div>
            <span className="report-panel-eyebrow">
              FACILITY UTILIZATION
            </span>

            <h3>
              Zone & Row Occupancy
            </h3>

            <p>
              Current occupancy across parking
              zones and rows.
            </p>
          </div>

          <div className="report-panel-summary">
            <strong>
              {loading
                ? "--"
                : `${reports.occupancyRate}%`}
            </strong>

            <span>Overall occupancy</span>
          </div>
        </div>

        {rowBreakdown.length === 0 ? (
          <div className="reports-empty">
            <ParkingSquare size={24} />

            <h4>
              {loading
                ? "Calculating zone distribution..."
                : "No parking zones found"}
            </h4>

            {!loading && (
              <p>
                Add parking slots to view
                occupancy breakdown.
              </p>
            )}
          </div>
        ) : (
          <div className="occupancy-bar-container">
            {rowBreakdown.map((item) => (
              <div
                className="bar-item"
                key={item.name}
              >
                <div className="bar-item-info">
                  <strong>{item.name}</strong>

                  <span>
                    {item.occupied} occupied /{" "}
                    {item.total} total
                  </span>
                </div>

                <div className="progress-bg">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${item.rate}%`,
                    }}
                  />
                </div>

                <strong className="bar-percentage">
                  {item.rate}%
                </strong>
              </div>
            ))}
          </div>
        )}

      </section>

    </main>
  );
};

export default ParkingReports;
import { useCallback, useEffect, useRef, useState } from "react";
import { IndianRupee, Loader2, RefreshCw, Building2 } from "lucide-react";

import { getRevenue } from "../../api/adminApi";
import { getBuildings } from "../../api/areaApi";
import BranchSelector from "../common/BranchSelector";

import "./css/RevenueOverview.css";

const PERIODS = [7, 30, 90];
const DAY_MS = 86400000;

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateRangeForDays = (days) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return {
    fromDate: formatDateInput(start),
    toDate: formatDateInput(end),
  };
};

const getRangeDays = (fromDate, toDate) => {
  const start = Date.parse(`${fromDate}T00:00:00Z`);
  const end = Date.parse(`${toDate}T00:00:00Z`);
  return Math.floor((end - start) / DAY_MS) + 1;
};

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDay = (value) => {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const formatAxisMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

/**
 * Read-only revenue page. Only mounted by the super admin and manager
 * dashboards; the /api/revenue endpoint enforces the same two roles.
 */
const RevenueOverview = () => {
  const [days, setDays] = useState(30);
  const [initialDateRange] = useState(() => getDateRangeForDays(30));
  const [fromDate, setFromDate] = useState(initialDateRange.fromDate);
  const [toDate, setToDate] = useState(initialDateRange.toDate);
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    getBuildings()
      .then((res) => {
        if (res?.buildings) setHotels(res.buildings);
      })
      .catch((err) => console.error("Error loading buildings for revenue:", err));
  }, []);

  const load = useCallback(async (from, to, hotelId) => {
    if (!from || !to || from > to) {
      requestId.current += 1;
      setData(null);
      setLoading(false);
      setError("Choose a valid date range.");
      return;
    }

    const currentRequestId = ++requestId.current;
    try {
      setLoading(true);
      setError("");
      setData(null);

      const response = await getRevenue(getRangeDays(from, to), hotelId, {
        fromDate: from,
        toDate: to,
      });

      if (!response?.success) {
        throw new Error(response?.message || "Unable to load revenue.");
      }

      if (requestId.current === currentRequestId) setData(response);
    } catch (err) {
      if (requestId.current === currentRequestId) {
        setError(err?.message || "Unable to load revenue.");
      }
    } finally {
      if (requestId.current === currentRequestId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(fromDate, toDate, selectedHotel);
  }, [fromDate, toDate, selectedHotel, load]);

  const selectPeriod = (period) => {
    const range = getDateRangeForDays(period);
    setDays(period);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  };

  const handleDateChange = (setter) => (event) => {
    setter(event.target.value);
    setDays(null);
  };

  const summary = data?.summary;
  const daily = data?.daily || [];
  const transactions = data?.transactions || [];
  const peak = Math.max(0, ...daily.map((item) => item.value));
  const revenueTicks = [1, 0.75, 0.5, 0.25, 0].map((fraction) => peak * fraction);

  return (
    <div className="revenue-page">
      <div className="revenue-header">
        <div>
          <p className="revenue-eyebrow">Overview</p>
          <h1>Revenue</h1>
        </div>

        <div className="revenue-header-actions">
          <div className="revenue-periods" role="tablist">
            {PERIODS.map((period) => (
              <button
                key={period}
                type="button"
                role="tab"
                aria-selected={period === days}
                className={period === days ? "active" : ""}
                onClick={() => selectPeriod(period)}
              >
                {period} days
              </button>
            ))}
          </div>

          <button
            type="button"
            className="revenue-refresh"
            onClick={() => load(fromDate, toDate, selectedHotel)}
            disabled={loading}
            aria-label="Refresh revenue"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="revenue-date-filters">
        <label className="revenue-date-field">
          <span>From Date</span>
          <input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={handleDateChange(setFromDate)}
          />
        </label>
        <label className="revenue-date-field">
          <span>To Date</span>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            max={formatDateInput(new Date())}
            onChange={handleDateChange(setToDate)}
          />
        </label>
      </div>

      {/* Dedicated Hotel Branch Filter Row */}
      {hotels.length > 0 && (
        <div style={{ background: "#ffffff", padding: "14px 20px", borderRadius: "14px", border: "1px solid #f1e4e6", margin: "16px 0" }}>
          <BranchSelector
            hotels={hotels}
            selectedHotel={selectedHotel}
            onSelectHotel={setSelectedHotel}
            label="Hotel Branch:"
            allLabel="All Branches"
            size="sm"
          />
        </div>
      )}

      {error && <div className="revenue-error">{error}</div>}

      {loading && !data ? (
        <div className="revenue-loading">
          <Loader2 size={26} className="revenue-spinner" />
          <span>Loading revenue...</span>
        </div>
      ) : (
        data && (
          <>
            <div className="revenue-cards">
              <div className="revenue-card">
                <span>Total revenue</span>
                <strong>{formatMoney(summary.period)}</strong>
              </div>
              <div className="revenue-card">
                <span>Payments</span>
                <strong>{summary.count}</strong>
              </div>
              <div className="revenue-card">
                <span>Average daily revenue</span>
                <strong>{formatMoney(data.days ? summary.period / data.days : 0)}</strong>
              </div>
              <div className="revenue-card">
                <span>Average payment</span>
                <strong>{formatMoney(summary.average)}</strong>
              </div>
            </div>

            <div className="revenue-panel">
              <h3>Revenue per day</h3>

              <div className="revenue-chart">
                <div className="revenue-y-axis" aria-hidden="true">
                  {revenueTicks.map((tick, index) => (
                    <span key={index}>{formatAxisMoney(tick)}</span>
                  ))}
                </div>

                <div
                  className="revenue-plot"
                  role="group"
                  aria-label={`Daily revenue from ${
                    daily.length ? formatDay(daily[0].date) : "the selected period"
                  } to ${
                    daily.length ? formatDay(daily[daily.length - 1].date) : "today"
                  }. Hover or focus a bar to see its date and revenue.`}
                >
                  <div className="revenue-gridlines" aria-hidden="true">
                    {revenueTicks.map((tick, index) => (
                      <span key={index} />
                    ))}
                  </div>

                  <div className="revenue-bars">
                    {daily.map((item) => (
                      <div
                        key={item.date}
                        className="revenue-bar"
                        tabIndex={0}
                        aria-label={`${formatDay(item.date)}: ${formatMoney(item.value)}`}
                      >
                        <div
                          className="revenue-bar-fill"
                          style={{
                            height: `${peak ? Math.max(2, (item.value / peak) * 100) : 2}%`,
                          }}
                        >
                          <span className="revenue-tooltip" aria-hidden="true">
                            <strong>{formatMoney(item.value)}</strong>
                            <small>{formatDay(item.date)}</small>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="revenue-bars-axis">
                <span>{daily.length ? formatDay(daily[0].date) : ""}</span>
                <span>
                  {daily.length ? formatDay(daily[daily.length - 1].date) : ""}
                </span>
              </div>
            </div>

            {summary.by_method.length > 0 && (
              <div className="revenue-methods">
                {summary.by_method.map((entry) => (
                  <div key={entry.method} className="revenue-method">
                    <span>{entry.method}</span>
                    <strong>{formatMoney(entry.amount)}</strong>
                    <small>
                      {entry.count} {entry.count === 1 ? "payment" : "payments"}
                    </small>
                  </div>
                ))}
              </div>
            )}

            <div className="revenue-panel">
              <h3>Payments in selected range</h3>

              {transactions.length === 0 ? (
                <div className="revenue-empty">
                  <IndianRupee size={22} />
                  <span>No payments in this period.</span>
                </div>
              ) : (
                <div
                  className="revenue-table-wrapper"
                  role="region"
                  aria-label="Recent payments table"
                  tabIndex={0}
                >
                  <table className="revenue-table">
                    <caption className="revenue-table-caption">
                      Up to 100 most recent payments within the selected date range
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Paid</th>
                        <th scope="col">Hotel Branch</th>
                        <th scope="col">Invoice</th>
                        <th scope="col">Ticket</th>
                        <th scope="col">Vehicle</th>
                        <th scope="col">Valet</th>
                        <th scope="col">Slot</th>
                        <th scope="col">Method</th>
                        <th scope="col">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((row) => (
                        <tr key={row.id}>
                          <td>{formatDateTime(row.paid_at)}</td>
                          <td style={{ fontWeight: "600", color: "#42235e" }}>{row.hotel_name || "General"}</td>
                          <td>{row.invoice_number || "-"}</td>
                          <td>{row.ticket_code || "-"}</td>
                          <td>{row.vehicle_number || "-"}</td>
                          <td>{row.valet_name || "-"}</td>
                          <td>{row.parking_slot || "-"}</td>
                          <td className="revenue-cap">
                            {row.payment_method || "-"}
                          </td>
                          <td>{formatMoney(row.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
};

export default RevenueOverview;

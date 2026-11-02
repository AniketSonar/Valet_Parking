import { useEffect, useState } from "react";
import { IndianRupee, Loader2, RefreshCw } from "lucide-react";

import { getRevenue } from "../../api/adminApi";

import "./css/RevenueOverview.css";

const PERIODS = [7, 30, 90];

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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (period) => {
    try {
      setLoading(true);
      setError("");

      const response = await getRevenue(period);

      if (!response?.success) {
        throw new Error(response?.message || "Unable to load revenue.");
      }

      setData(response);
    } catch (err) {
      setError(err?.message || "Unable to load revenue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(days);
  }, [days]);

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
          <p>Payments collected at check-in, by day and by payment method.</p>
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
                onClick={() => setDays(period)}
              >
                {period} days
              </button>
            ))}
          </div>

          <button
            type="button"
            className="revenue-refresh"
            onClick={() => load(days)}
            disabled={loading}
            aria-label="Refresh revenue"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

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
                <span>Today</span>
                <strong>{formatMoney(summary.today)}</strong>
              </div>
              <div className="revenue-card">
                <span>Last {data.days} days</span>
                <strong>{formatMoney(summary.period)}</strong>
              </div>
              <div className="revenue-card">
                <span>Payments</span>
                <strong>{summary.count}</strong>
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
              <h3>Recent payments</h3>

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
                      Recent payments for the selected period
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Paid</th>
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

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Clock, Calendar, CheckCircle2 } from "lucide-react";
import { getParkingHistory } from "../../api/parkingApi";
import "./css/ParkingHistory.css";

function ParkingHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (typeFilter !== "all") {
        params.parking_type = typeFilter;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await getParkingHistory(params);
      if (response && response.success) {
        setHistory(response.history || []);
      } else {
        throw new Error(response?.message || "Failed to load parking history.");
      }
    } catch (err) {
      console.error("Load history error:", err);
      setError(err.message || "Failed to fetch parking history records.");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, searchTerm]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredHistory = useMemo(() => {
    let result = history;

    if (dateFilter !== "all") {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      result = result.filter((item) => {
        if (!item.completed_at) return false;
        const itemTime = new Date(item.completed_at).getTime();

        if (dateFilter === "today") {
          return itemTime >= startOfDay;
        }
        if (dateFilter === "last7days") {
          return itemTime >= startOfDay - 7 * 24 * 60 * 60 * 1000;
        }
        if (dateFilter === "last30days") {
          return itemTime >= startOfDay - 30 * 24 * 60 * 60 * 1000;
        }
        return true;
      });
    }

    return result;
  }, [history, dateFilter]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const todayCompletedCount = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return history.filter((item) => {
      if (!item.completed_at) return false;
      return new Date(item.completed_at) >= startOfDay;
    }).length;
  }, [history]);

  return (
    <div className="parking-history-page">
      {/* HEADER */}
      <div className="parking-history-header">
        <div>
          <p className="parking-history-eyebrow">OPERATIONS</p>
          <h1>Parking History</h1>
          <p>View completed and historical parking sessions.</p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div className="history-summary">
            <span>Total Completed</span>
            <strong>{loading ? "--" : history.length}</strong>
          </div>

          <button
            className="act-btn primary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "42px", padding: "0 16px", borderRadius: "10px" }}
            onClick={loadHistory}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "refresh-spinning" : ""} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontWeight: "600", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="history-summary-grid">
        <div className="history-summary-card">
          <span className="history-summary-icon">✓</span>
          <div>
            <span>Completed Sessions</span>
            <strong>{loading ? "--" : history.length}</strong>
          </div>
        </div>

        <div className="history-summary-card">
          <span className="history-summary-icon">↙</span>
          <div>
            <span>Today's Returns</span>
            <strong>{loading ? "--" : todayCompletedCount}</strong>
          </div>
        </div>

        <div className="history-summary-card">
          <span className="history-summary-icon">🚗</span>
          <div>
            <span>Valet Checkouts</span>
            <strong>
              {loading ? "--" : history.filter((h) => h.parking_type === "valet").length}
            </strong>
          </div>
        </div>

        <div className="history-summary-card">
          <span className="history-summary-icon">🅿</span>
          <div>
            <span>Self-Park Checkouts</span>
            <strong>
              {loading ? "--" : history.filter((h) => h.parking_type === "self").length}
            </strong>
          </div>
        </div>
      </div>

      {/* TABLE CARD */}
      <section className="parking-history-card">
        {/* TOOLBAR */}
        <div className="parking-history-toolbar">
          <div className="parking-history-search">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search license plate, customer, slot, or ticket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="parking-history-filters">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="valet">Valet</option>
              <option value="self">Self</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="parking-history-table-wrapper">
          {loading && filteredHistory.length === 0 ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#7b7389" }}>
              <RefreshCw size={24} className="refresh-spinning" style={{ marginBottom: "12px" }} />
              <div>Loading parking history...</div>
            </div>
          ) : (
            <table className="parking-history-table">
              <thead>
                <tr>
                  <th>VEHICLE / TICKET</th>
                  <th>CUSTOMER</th>
                  <th>SLOT</th>
                  <th>TYPE</th>
                  <th>CHECK-IN</th>
                  <th>CHECK-OUT</th>
                  <th>DURATION</th>
                  <th>VALET</th>
                  <th>STATUS</th>
                </tr>
              </thead>

              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="history-empty">
                      <div>
                        <span>◷</span>
                        <strong>No parking history found</strong>
                        <p>No completed parking records match your filter criteria.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((session) => (
                    <tr key={session.id}>
                      <td>
                        <div className="history-vehicle">
                          <div className="history-vehicle-icon">🚗</div>
                          <div>
                            <strong>{session.vehicle_number || session.vehicle?.license_plate || "N/A"}</strong>
                            <div style={{ fontSize: "11px", color: "#7b879e" }}>
                              Ticket #{session.ticket_code}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="history-customer">
                          {session.customer_name || session.vehicle?.customer?.name || "N/A"}
                        </span>
                        <div style={{ fontSize: "11px", color: "#7b879e" }}>
                          {session.customer_phone || session.vehicle?.customer?.phone || ""}
                        </div>
                      </td>

                      <td>
                        <span className="history-slot">{session.parking_slot || "N/A"}</span>
                      </td>

                      <td>
                        <span style={{ textTransform: "capitalize", fontWeight: "600", color: "#43506a" }}>
                          {session.parking_type || "Valet"}
                        </span>
                      </td>

                      <td>
                        <span className="history-time">{formatDateTime(session.checked_in_at)}</span>
                      </td>

                      <td>
                        <span className="history-time">{formatDateTime(session.completed_at)}</span>
                      </td>

                      <td>
                        <span className="history-duration">{session.parking_duration || "—"}</span>
                      </td>

                      <td>
                        <span style={{ color: "#43506a", fontSize: "12px" }}>
                          {session.valet_name || "—"}
                        </span>
                      </td>

                      <td>
                        <span className="history-status">
                          <span className="history-status-dot"></span>
                          Completed
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* FOOTER */}
        <div className="parking-history-footer">
          <span>
            Showing <strong>{filteredHistory.length}</strong> of <strong>{history.length}</strong> completed sessions
          </span>
        </div>
      </section>
    </div>
  );
}

export default ParkingHistory;
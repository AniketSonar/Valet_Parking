import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw, Search, Clock, CheckCircle2, ArrowRight, Check } from "lucide-react";
import {
  getRetrievalRequests,
  startRetrieval,
  markReadyForPickup,
  completeReturn,
} from "../../api/parkingApi";
import "./css/RetrievalRequests.css";

const RetrievalRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await getRetrievalRequests(params);
      if (response && response.success) {
        setRequests(response.requests || []);
      } else {
        throw new Error(response?.message || "Failed to load retrieval requests.");
      }
    } catch (err) {
      console.error("Fetch retrieval requests error:", err);
      setError(err.message || "Failed to load retrieval requests.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async (id, actionFn, successText) => {
    try {
      setActionLoading(id);
      setError("");
      const response = await actionFn(id);
      if (response && response.success) {
        setMessage(successText);
        setTimeout(() => setMessage(""), 3000);
        await fetchRequests();
      } else {
        throw new Error(response?.message || "Action failed.");
      }
    } catch (err) {
      console.error("Action error:", err);
      setError(err.message || "Failed to process request.");
    } finally {
      setActionLoading(null);
    }
  };

  const getDisplayStatus = (status) => {
    switch (status) {
      case "retrieval_requested":
        return { label: "Requested", className: "requested" };
      case "retrieving":
        return { label: "In Retrieval", className: "in-retrieval" };
      case "ready_for_pickup":
        return { label: "Ready", className: "ready" };
      case "returned_completed":
        return { label: "Completed", className: "completed" };
      default:
        return { label: status || "Unknown", className: "requested" };
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "N/A";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="retrievals-container">
      <div className="retrievals-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2>Vehicle Retrieval Requests</h2>
          <p>Manage and transition live retrieval queues for waiting customers.</p>
        </div>
        <button
          className="act-btn primary"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "36px", padding: "0 16px" }}
          onClick={fetchRequests}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "refresh-spinning" : ""} />
          <span>{loading ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {message && (
        <div style={{ background: "#ecfdf5", color: "#047857", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontWeight: "600", fontSize: "13px" }}>
          ✓ {message}
        </div>
      )}

      {error && (
        <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontWeight: "600", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#7b7389" }} />
          <input
            type="text"
            placeholder="Search license plate, customer, slot, valet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", height: "40px", paddingLeft: "38px", paddingRight: "12px", borderRadius: "10px", border: "1px solid #e8e4ee", fontSize: "13px", outline: "none" }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ height: "40px", padding: "0 16px", borderRadius: "10px", border: "1px solid #e8e4ee", fontSize: "13px", background: "#ffffff", outline: "none", cursor: "pointer" }}
        >
          <option value="all">All Active Requests</option>
          <option value="retrieval_requested">Requested</option>
          <option value="retrieving">In Retrieval</option>
          <option value="ready_for_pickup">Ready for Pickup</option>
        </select>
      </div>

      <div className="table-card">
        {loading && requests.length === 0 ? (
          <div style={{ padding: "50px", textAlign: "center", color: "#7b7389" }}>
            <RefreshCw size={24} className="refresh-spinning" style={{ marginBottom: "12px" }} />
            <div>Loading retrieval requests...</div>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ padding: "50px", textAlign: "center", color: "#7b7389" }}>
            <Clock size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
            <div style={{ fontWeight: "700", fontSize: "15px", color: "#1a1024" }}>No active retrieval requests</div>
            <p style={{ margin: "6px 0 0", fontSize: "13px" }}>All requested vehicles have been picked up.</p>
          </div>
        ) : (
          <table className="retrieval-table">
            <thead>
              <tr>
                <th>Ticket / Vehicle</th>
                <th>Customer</th>
                <th>Slot</th>
                <th>Checked-In / Request</th>
                <th>Assigned Valet</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const statusInfo = getDisplayStatus(r.status);
                const isItemLoading = actionLoading === r.id;

                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: "800", color: "#1a1024" }}>
                        {r.vehicle?.license_plate || "N/A"}
                      </div>
                      <span style={{ fontSize: "11px", color: "#7b7389" }}>
                        Ticket #{r.ticket_code}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: "600" }}>{r.vehicle?.customer?.name || "N/A"}</div>
                      <div style={{ fontSize: "11px", color: "#7b7389" }}>{r.vehicle?.customer?.phone || ""}</div>
                    </td>
                    <td>
                      <span className="slot-badge">{r.parking_slot || "Unassigned"}</span>
                    </td>
                    <td>{formatTime(r.checked_in_at)}</td>
                    <td>{r.valet?.name || "Unassigned"}</td>
                    <td>
                      <span className={`status-tag ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {r.status === "retrieval_requested" && (
                          <button
                            className="act-btn primary"
                            disabled={isItemLoading}
                            onClick={() => handleAction(r.id, startRetrieval, "Retrieval started.")}
                          >
                            <ArrowRight size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                            Start Retrieval
                          </button>
                        )}
                        {r.status === "retrieving" && (
                          <button
                            className="act-btn amber"
                            disabled={isItemLoading}
                            onClick={() => handleAction(r.id, markReadyForPickup, "Vehicle marked ready.")}
                          >
                            <CheckCircle2 size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                            Mark Ready
                          </button>
                        )}
                        {r.status === "ready_for_pickup" && (
                          <button
                            className="act-btn success"
                            disabled={isItemLoading}
                            onClick={() => handleAction(r.id, completeReturn, "Vehicle return completed.")}
                          >
                            <Check size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                            Complete Return
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default RetrievalRequests;
import React, { useEffect, useState, useMemo } from "react";
import {
  RefreshCw,
  History,
  Car,
  User,
  Phone,
  MapPin,
  Clock,
  Hash,
  CreditCard,
  Search,
  CheckCircle2,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getValetDashboard } from "../../api/parkingApi";
import "./css/ValetPages.css";

const fmt = (v) => {
  if (!v) return "—";
  const d = new Date(v);
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

const duration = (checkedIn, completed) => {
  if (!checkedIn || !completed) return "—";
  const ms = new Date(completed) - new Date(checkedIn);
  if (ms < 0) return "—";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const CompletedReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const loadReturns = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getValetDashboard();
      setReturns(response?.completed_returns || []);
    } catch (err) {
      setError(err?.message || "Unable to load completed returns.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const filteredReturns = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return returns;
    return returns.filter((session) => {
      const vehicle = Array.isArray(session?.vehicle) ? session.vehicle[0] : session?.vehicle || {};
      const customer = Array.isArray(vehicle?.customer) ? vehicle.customer[0] : vehicle?.customer || {};
      return [
        vehicle?.license_plate,
        vehicle?.make,
        vehicle?.model,
        vehicle?.color,
        customer?.name,
        customer?.phone,
        session?.ticket_code,
        session?.parking_slot,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [returns, searchTerm]);

  return (
    <section className="completed-page">
      <div className="completed-header">
        <div>
          <span className="page-eyebrow">HISTORY & RECORDS</span>
          <h1>Completed Returns</h1>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div className="cr-search-bar" style={{ display: "flex", alignItems: "center", background: "#ffffff", border: "1px solid #d9d2e9", borderRadius: "10px", padding: "6px 12px", gap: "8px" }}>
            <Search size={15} color="#6b5b7b" />
            <input
              type="text"
              placeholder="Search plate, customer, ticket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: "0.82rem", width: "200px" }}
            />
          </div>

          <button className="page-refresh-btn" onClick={loadReturns} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {loading ? (
        <div className="page-loading">
          <RefreshCw size={24} className="spin" />
          <span>Loading completed returns...</span>
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="page-empty">
          <History size={36} color="#bc9b6a" />
          <h3>No completed returns found</h3>
          <p>{searchTerm ? "No records matched your search query." : "Returned vehicles will appear here with full data."}</p>
        </div>
      ) : (
        <div className="cr-cards-container" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredReturns.map((session) => {
            const vehicle = Array.isArray(session?.vehicle) ? session.vehicle[0] : session?.vehicle || {};
            const customer = Array.isArray(vehicle?.customer) ? vehicle.customer[0] : vehicle?.customer || {};
            const isExpanded = expandedId === session.id;

            return (
              <div
                key={session.id}
                className="cr-detailed-card"
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: isExpanded ? "1px solid #bc9b6a" : "1px solid #e8e2f0",
                  boxShadow: isExpanded ? "0 8px 24px rgba(66,35,94,0.12)" : "0 2px 8px rgba(0,0,0,0.04)",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Main Card Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        background: "#f3eaf8",
                        color: "#42235e",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Car size={22} />
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "1.05rem", color: "#2d1a4a", letterSpacing: "0.04em" }}>
                          {vehicle?.license_plate || "NO PLATE"}
                        </strong>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: "700",
                            background: "#ecfdf5",
                            color: "#059669",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          <CheckCircle2 size={11} /> Returned
                        </span>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "#665874", marginTop: "2px" }}>
                        {[vehicle?.make, vehicle?.model].filter(Boolean).join(" ") || "Vehicle"}
                        {vehicle?.color ? ` • ${vehicle.color}` : ""}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.72rem", color: "#9586a8", fontWeight: "600", textTransform: "uppercase" }}>Ticket</div>
                      <div style={{ fontSize: "0.88rem", fontWeight: "700", color: "#bc9b6a" }}>#{session?.ticket_code || "—"}</div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.72rem", color: "#9586a8", fontWeight: "600", textTransform: "uppercase" }}>Slot</div>
                      <div style={{ fontSize: "0.88rem", fontWeight: "700", color: "#42235e" }}>{session?.parking_slot || "—"}</div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.72rem", color: "#9586a8", fontWeight: "600", textTransform: "uppercase" }}>Completed</div>
                      <div style={{ fontSize: "0.82rem", color: "#2d1a4a" }}>{fmt(session?.completed_at)}</div>
                    </div>

                    <div style={{ color: "#bc9b6a", marginLeft: "8px" }}>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: "1px solid #f0eaf8",
                      padding: "18px 22px 20px",
                      background: "#faf8fc",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "16px",
                      }}
                    >
                      {/* Customer Details */}
                      <div style={{ background: "#ffffff", padding: "12px 16px", borderRadius: "10px", border: "1px solid #eee7f5" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#bc9b6a", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", marginBottom: "8px" }}>
                          <User size={14} /> Customer Information
                        </div>
                        <div style={{ fontSize: "0.92rem", fontWeight: "700", color: "#2d1a4a" }}>{customer?.name || "Anonymous Guest"}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "#665874", marginTop: "4px" }}>
                          <Phone size={12} /> {customer?.phone || "No phone provided"}
                        </div>
                        {customer?.email && (
                          <div style={{ fontSize: "0.78rem", color: "#8a7d99", marginTop: "2px" }}>{customer.email}</div>
                        )}
                      </div>

                      {/* Vehicle & Parking Details */}
                      <div style={{ background: "#ffffff", padding: "12px 16px", borderRadius: "10px", border: "1px solid #eee7f5" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#bc9b6a", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", marginBottom: "8px" }}>
                          <MapPin size={14} /> Parking & Location
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "4px" }}>
                          <span style={{ color: "#8a7d99" }}>Slot Assigned:</span>
                          <strong style={{ color: "#42235e" }}>{session?.parking_slot || "—"}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "4px" }}>
                          <span style={{ color: "#8a7d99" }}>Parking Type:</span>
                          <strong style={{ color: "#2d1a4a", textTransform: "capitalize" }}>{session?.parking_type || "Valet"}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                          <span style={{ color: "#8a7d99" }}>Session ID:</span>
                          <span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#665874" }}>{session?.id?.slice(0, 8)}...</span>
                        </div>
                      </div>

                      {/* Timeline & Durations */}
                      <div style={{ background: "#ffffff", padding: "12px 16px", borderRadius: "10px", border: "1px solid #eee7f5" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#bc9b6a", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", marginBottom: "8px" }}>
                          <Clock size={14} /> Timeline & Duration
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "4px" }}>
                          <span style={{ color: "#8a7d99" }}>Check-in:</span>
                          <span style={{ color: "#2d1a4a" }}>{fmt(session?.checked_in_at)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "4px" }}>
                          <span style={{ color: "#8a7d99" }}>Completed:</span>
                          <span style={{ color: "#2d1a4a" }}>{fmt(session?.completed_at)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginTop: "4px", paddingTop: "4px", borderTop: "1px dashed #eee" }}>
                          <span style={{ color: "#8a7d99", fontWeight: "600" }}>Total Parked:</span>
                          <strong style={{ color: "#bc9b6a" }}>{duration(session?.checked_in_at, session?.completed_at)}</strong>
                        </div>
                      </div>

                      {/* Billing & Package Status */}
                      <div style={{ background: "#ffffff", padding: "12px 16px", borderRadius: "10px", border: "1px solid #eee7f5" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#bc9b6a", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", marginBottom: "8px" }}>
                          <CreditCard size={14} /> Billing & Payment
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "4px" }}>
                          <span style={{ color: "#8a7d99" }}>Payment Method:</span>
                          <strong style={{ color: "#2d1a4a", textTransform: "capitalize" }}>
                            {session?.payment_method || (session?.amount === 0 ? "Complimentary" : "Standard")}
                          </strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "4px" }}>
                          <span style={{ color: "#8a7d99" }}>Amount:</span>
                          <strong style={{ color: "#059669" }}>
                            {session?.amount != null ? `₹${session.amount}` : "₹0 (Included / Billed to Event)"}
                          </strong>
                        </div>
                        {session?.notes && (
                          <div style={{ marginTop: "6px", padding: "6px 8px", background: "#fef9ee", borderRadius: "6px", fontSize: "0.74rem", color: "#92400e" }}>
                            Note: {session.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default CompletedReturns;

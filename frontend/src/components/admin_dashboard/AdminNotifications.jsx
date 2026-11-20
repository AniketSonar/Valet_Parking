import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell,
  Building2,
  RefreshCw,
  Search,
  CarFront,
  ShieldAlert,
  KeyRound,
  CheckCircle2,
  Clock3,
  Info,
  Mail,
  Filter,
} from "lucide-react";
import { getMyNotifications } from "../../api/parkingApi";
import { getBuildings } from "../../api/areaApi";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import BranchSelector from "../common/BranchSelector";

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getBuildings()
      .then((res) => {
        if (res?.buildings) setHotels(res.buildings);
      })
      .catch((err) => console.error("Error loading hotels in notifications:", err));
  }, []);

  const fetchNotifications = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");

      const hotelQuery = selectedHotel && selectedHotel !== "all" ? `?hotelId=${encodeURIComponent(selectedHotel)}` : "";
      // In parkingApi, getMyNotifications can take query or apiClient call
      const res = await fetch(`/api/notifications${hotelQuery}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      }).then((r) => r.json());

      if (res?.success && Array.isArray(res.notifications)) {
        setNotifications(res.notifications);
      } else {
        // Fallback to getMyNotifications()
        const fallback = await getMyNotifications();
        if (fallback?.notifications) {
          setNotifications(fallback.notifications);
        }
      }
    } catch (err) {
      console.error("Notifications fetch error:", err);
      setError(err?.message || "Failed to load notifications.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedHotel]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useRealtimeSync({
    tables: ["notifications", "parking_sessions"],
    onUpdate: () => fetchNotifications(true),
    interval: 5000,
  });

  const getNotificationIcon = (notif) => {
    const msg = String(notif?.message || "").toLowerCase();
    const type = String(notif?.type || notif?.notification_type || "").toLowerCase();
    if (msg.includes("incident") || type.includes("incident")) return ShieldAlert;
    if (msg.includes("key") || type.includes("key")) return KeyRound;
    if (msg.includes("retrieval") || msg.includes("pickup") || msg.includes("return")) return CarFront;
    if (msg.includes("parked") || msg.includes("check-in")) return CheckCircle2;
    return Info;
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Hotel filter (client-side backup)
      if (selectedHotel !== "all") {
        if (n.hotel_id && n.hotel_id !== selectedHotel) return false;
      }

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const m = (n.message || "").toLowerCase();
        const t = (n.ticket_code || "").toLowerCase();
        const v = (n.vehicle_plate || "").toLowerCase();
        const h = (n.hotel_name || "").toLowerCase();
        if (!m.includes(q) && !t.includes(q) && !v.includes(q) && !h.includes(q)) return false;
      }

      // Type
      if (typeFilter !== "all") {
        const msg = String(n.message || "").toLowerCase();
        if (typeFilter === "incident" && !msg.includes("incident")) return false;
        if (typeFilter === "key" && !msg.includes("key")) return false;
        if (typeFilter === "parking" && !msg.includes("parked") && !msg.includes("check-in")) return false;
        if (typeFilter === "retrieval" && !msg.includes("retrieval") && !msg.includes("pickup") && !msg.includes("return")) return false;
      }

      return true;
    });
  }, [notifications, selectedHotel, search, typeFilter]);

  const formatDate = (val) => {
    if (!val) return "Just now";
    const d = new Date(val);
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
      {/* Header */}
      <div style={{
        background: "#ffffff",
        padding: "22px 28px",
        borderRadius: "16px",
        border: "1px solid #f1e4e6",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px",
        boxShadow: "0 4px 18px rgba(139, 18, 48, 0.04)"
      }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#1f2937", margin: "0" }}>
            Operational Notifications & Alerts
          </h1>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => fetchNotifications(false)}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              background: "#fff",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              color: "#374151"
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Dedicated Hotel Branch Filter Row */}
      {hotels.length > 0 && (
        <div style={{ background: "#ffffff", padding: "14px 20px", borderRadius: "14px", border: "1px solid #f1e4e6", marginBottom: "16px" }}>
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

      {/* Toolbar filters */}
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: "9px 14px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              fontSize: "13px",
              background: "#fff",
              outline: "none",
            }}
          >
            <option value="all">All Alert Types</option>
            <option value="parking">Check-ins & Parking</option>
            <option value="retrieval">Retrieval & Returns</option>
            <option value="incident">Incidents & Disputes</option>
            <option value="key">Key Alerts</option>
          </select>
        </div>

        {/* Search */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "#fff",
          padding: "9px 16px",
          borderRadius: "10px",
          border: "1px solid #e5e7eb",
          minWidth: "260px"
        }}>
          <Search size={15} color="#9ca3af" />
          <input
            type="text"
            placeholder="Search notification or ticket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: "none", outline: "none", width: "100%", fontSize: "13px" }}
          />
        </div>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "12px 16px", borderRadius: "10px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {/* Notifications List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {loading ? (
          <div style={{ background: "#fff", padding: "40px", borderRadius: "14px", textAlign: "center", color: "#6b7280" }}>
            <RefreshCw size={22} className="spin" style={{ margin: "0 auto 8px auto" }} />
            <p>Loading notifications across hotel branches...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ background: "#fff", padding: "48px", borderRadius: "14px", textAlign: "center", border: "1px dashed #d1d5db" }}>
            <Bell size={36} color="#9ca3af" style={{ margin: "0 auto 12px auto" }} />
            <h3 style={{ margin: "0 0 6px 0", color: "#374151" }}>No Notifications Found</h3>
            <p style={{ color: "#6b7280", margin: 0, fontSize: "13.5px" }}>
              There are no alerts matching the selected hotel branch or filter criteria.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif, idx) => {
            const Icon = getNotificationIcon(notif);
            const isIncident = String(notif.message || "").toLowerCase().includes("incident");
            return (
              <div
                key={notif.id || idx}
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: isIncident ? "1px solid #fecaca" : "1px solid #f1f5f9",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: isIncident ? "#fee2e2" : "#f7f2fb",
                  color: isIncident ? "#dc2626" : "#42235e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Icon size={20} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11.5px",
                        fontWeight: "700",
                        background: "#f7f2fb",
                        color: "#42235e",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}>
                        <Building2 size={12} />
                        {notif.hotel_name || "General Branch"}
                      </span>

                      {notif.ticket_code && (
                        <span style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>
                          Ticket: {notif.ticket_code}
                        </span>
                      )}

                      {notif.vehicle_plate && (
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#111827", background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px" }}>
                          {notif.vehicle_plate}
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                      {formatDate(notif.created_at)}
                    </span>
                  </div>

                  <p style={{ margin: "6px 0 0 0", fontSize: "13.5px", color: "#374151", lineHeight: 1.5 }}>
                    {notif.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

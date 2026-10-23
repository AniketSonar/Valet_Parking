import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Car,
  LogIn,
  Clock3,
  CheckCircle2,
  UserPlus,
  CarFront,
  RefreshCw,
  Search,
  ArrowRight,
  Users,
  TicketCheck,
  Bell,
} from "lucide-react";

import DashboardLayout from "../layout/DashboardLayout";
import { receptionConfig } from "../layout/dashboardConfigs";
import ReceptionStatCard from "./ReceptionStatCard";
import RegisterCustomerModal from "./RegisterCustomerModal";
import RegisterVehicleModal from "./RegisterVehicleModal";
import CheckInVehicleModal from "./CheckInVehicleModal";
import ReceptionTicketModal from "./ReceptionTicketModal";
import ReceptionSessionDetailsModal from "./ReceptionSessionDetailsModal";
import ReceptionKeyManagement from "./ReceptionKeyManagement";
import ReceptionPayments from "./ReceptionPayments";
import {
  getReceptionSessions,
  requestReceptionRetrieval,
  getCustomers,
  deleteCustomer,
  getVehicles,
  getReceptionNotifications,
} from "../../api/receptionApi";

import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import "./css/ReceptionDashboard.css";

// ============================================================
// STATUS CONFIG
// ============================================================

const STATUS_CONFIG = {
  checked_in: { label: "Checked In", cls: "status-checked-in" },
  parked: { label: "Parked", cls: "status-parked" },
  retrieval_requested: { label: "Awaiting Retrieval", cls: "status-retrieval" },
  retrieving: { label: "Retrieving", cls: "status-retrieving" },
  ready_for_pickup: { label: "Ready for Pickup", cls: "status-ready" },
  returned_completed: { label: "Returned", cls: "status-returned" },
};

// ============================================================
// CUSTOMERS VIEW (Simple table)
// ============================================================

const CustomersView = ({ onOpenRegisterModal }) => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCustomers(search);
      if (res && res.success) setCustomers(res.customers || []);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleDeleteCustomer = async (customer) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${customer.name}"?`
    );

    if (!confirmed) return;

    setDeletingId(customer.id);

    try {
      await deleteCustomer(customer.id);

      setCustomers((currentCustomers) =>
        currentCustomers.filter(
          (item) => item.id !== customer.id
        )
      );

      alert(`Customer "${customer.name}" deleted successfully.`);
    } catch (error) {
      console.error("Delete customer error:", error);

      alert(
        error.message ||
        "Unable to delete customer."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="reception-view-wrapper">
      <div className="reception-view-header">
        <div>
          <span className="reception-eyebrow">DIRECTORY</span>
          <h2>Customers</h2>
          <p>All registered customers in the system.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="reception-action-btn primary" onClick={onOpenRegisterModal}>
            <UserPlus size={14} />
            <span>Register Customer</span>
          </button>
          <button className="reception-action-btn" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? "refresh-spinning" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
      <div className="reception-search-bar">
        <Search size={15} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, email..." />
      </div>
      <div className="reception-table-card">
        <table className="reception-table">
          <thead>
            <tr>
              <th>NAME</th>
              <th>PHONE</th>
              <th>EMAIL</th>
              <th>VEHICLES</th>
              <th>REGISTERED</th>
              <th></th>

            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="reception-table-empty">Loading customers...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan="5" className="reception-table-empty">No customers found.</td></tr>
            ) : customers.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong></td>
                <td>{c.phone}</td>
                <td>{c.email || "—"}</td>
                <td>{c.vehicles?.length ?? 0}</td>
                <td style={{ fontSize: "12px", color: "#7b7389" }}>{c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN") : "—"}</td>
                <td>
                  <button
                    type="button"
                    className="reception-delete-btn"
                    onClick={() => handleDeleteCustomer(c)}
                    disabled={deletingId === c.id}
                  >
                    {deletingId === c.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================
// VEHICLES VIEW (Simple table)
// ============================================================

const VehiclesView = () => {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVehicles(search);
      if (res && res.success) setVehicles(res.vehicles || []);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="reception-view-wrapper">
      <div className="reception-view-header">
        <div>
          <span className="reception-eyebrow">DIRECTORY</span>
          <h2>Vehicles</h2>
          <p>All registered vehicles in the system.</p>
        </div>
        <button className="reception-action-btn primary" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? "refresh-spinning" : ""} />
          <span>Refresh</span>
        </button>
      </div>
      <div className="reception-search-bar">
        <Search size={15} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by license plate, make, model..." />
      </div>
      <div className="reception-table-card">
        <table className="reception-table">
          <thead>
            <tr>
              <th>LICENSE PLATE</th>
              <th>MAKE & MODEL</th>
              <th>COLOR</th>
              <th>CUSTOMER</th>
              <th>PHONE</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="reception-table-empty">Loading vehicles...</td></tr>
            ) : vehicles.length === 0 ? (
              <tr><td colSpan="5" className="reception-table-empty">No vehicles found.</td></tr>
            ) : vehicles.map((v) => (
              <tr key={v.id}>
                <td><strong style={{ fontFamily: "monospace", fontSize: "14px" }}>{v.license_plate}</strong></td>
                <td>{v.make} {v.model}</td>
                <td>{v.color || "—"}</td>
                <td>{v.customer?.name || "—"}</td>
                <td>{v.customer?.phone || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================
// PROFILE VIEW
// ============================================================

const ProfileView = ({ onLogout }) => {
  let user = { name: "Reception Staff", email: "reception@valetparking.com" };
  try {
    const s = localStorage.getItem("user");
    if (s) user = JSON.parse(s);
  } catch {
    // Ignore invalid stored JSON
  }

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "RC";

  return (
    <div className="reception-view-wrapper">
      <div className="reception-view-header">
        <div>
          <span className="reception-eyebrow">ACCOUNT</span>
          <h2>My Profile</h2>
          <p>Your reception desk account details and session management.</p>
        </div>
      </div>
      <div className="reception-profile-card">
        <div className="reception-profile-avatar">{initials}</div>
        <div>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
          <span className="reception-profile-role">Reception Desk</span>
        </div>
      </div>
      <div className="reception-profile-actions">
        <button className="reception-action-btn danger" onClick={onLogout}>
          Sign Out of Session
        </button>
      </div>
    </div>
  );
};

// ============================================================
// SESSIONS VIEW (Active Sessions Table)
// ============================================================

const SessionsView = ({ sessions, loading, onRefresh, onRequestRetrieval, onViewSession, actionLoading }) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return sessions.filter((s) => {
      const matchesSearch = !q
        || s.ticket_code?.toLowerCase().includes(q)
        || s.vehicle?.license_plate?.toLowerCase().includes(q)
        || s.vehicle?.customer?.name?.toLowerCase().includes(q)
        || s.vehicle?.customer?.phone?.toLowerCase().includes(q)
        || s.valet?.name?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sessions, search, statusFilter]);

  const formatTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  return (
    <div className="reception-view-wrapper">
      <div className="reception-view-header">
        <div>
          <span className="reception-eyebrow">OPERATIONS</span>
          <h2>Active Sessions</h2>
          <p>All vehicles currently in the parking facility.</p>
        </div>
        <button className="reception-action-btn primary" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={14} className={loading ? "refresh-spinning" : ""} />
          <span>{loading ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      <div className="reception-toolbar">
        <div className="reception-search-bar">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ticket, plate, customer name or phone..."
          />
        </div>
        <select
          className="reception-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="checked_in">Checked In</option>
          <option value="parked">Parked</option>
          <option value="retrieval_requested">Awaiting Retrieval</option>
          <option value="retrieving">Retrieving</option>
          <option value="ready_for_pickup">Ready for Pickup</option>
        </select>
      </div>

      <div className="reception-table-card">
        {loading && sessions.length === 0 ? (
          <div className="reception-table-loading">
            <RefreshCw size={24} className="refresh-spinning" />
            <div>Loading sessions...</div>
          </div>
        ) : (
          <table className="reception-table">
            <thead>
              <tr>
                <th>TICKET</th>
                <th>VEHICLE</th>
                <th>CUSTOMER</th>
                <th>TYPE</th>
                <th>SLOT</th>
                <th>CHECK-IN</th>
                <th>STATUS</th>
                <th>VALET</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="reception-table-empty">
                    <Car size={28} style={{ opacity: 0.4, marginBottom: "8px" }} />
                    <div>No sessions match your filters.</div>
                  </td>
                </tr>
              ) : filtered.map((s) => {
                const statusInfo = STATUS_CONFIG[s.status] || { label: s.status, cls: "status-checked-in" };
                const isActionLoading = actionLoading === s.id;
                return (
                  <tr key={s.id}>
                    <td>
                      <span className="reception-ticket-code">
                        {s.ticket_code}
                      </span>
                    </td>
                    <td>
                      <div className="reception-primary-value">
                        {s.vehicle?.license_plate || "—"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#7b7389" }}>
                        {s.vehicle?.make} {s.vehicle?.model}
                      </div>
                    </td>
                    <td>
                      <div className="reception-primary-value reception-customer-name">{s.vehicle?.customer?.name || "—"}</div>
                      <div style={{ fontSize: "11px", color: "#7b7389" }}>{s.vehicle?.customer?.phone || ""}</div>
                    </td>
                    <td>
                      <span style={{ textTransform: "capitalize", fontWeight: "600", color: "#5e3573" }}>
                        {s.parking_type || "valet"}
                      </span>
                    </td>
                    <td>
                      {s.parking_slot
                        ? <span className="slot-badge">{s.parking_slot}</span>
                        : <span style={{ color: "#bbb", fontSize: "12px" }}>—</span>
                      }
                    </td>
                    <td style={{ fontSize: "12px", color: "#7b7389" }}>
                      {formatTime(s.checked_in_at)}
                    </td>
                    <td>
                      <span className={`reception-status-tag ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td style={{ fontSize: "12px" }}>
                      {s.valet?.name || "—"}
                    </td>
                    <td>
                      <button className="reception-view-all-btn" onClick={() => onViewSession(s)}>View</button>
                      {s.status === "parked" && (
                        <button
                          className="reception-action-btn amber small"
                          disabled={isActionLoading}
                          onClick={() => onRequestRetrieval(s.id)}
                        >
                          {isActionLoading
                            ? <RefreshCw size={12} className="refresh-spinning" />
                            : <ArrowRight size={12} />
                          }
                          <span>{isActionLoading ? "..." : "Request Retrieval"}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="reception-table-footer">
          Showing <strong>{filtered.length}</strong> of <strong>{sessions.length}</strong> sessions
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN RECEPTION DASHBOARD
// ============================================================

const ReceptionDashboard = ({
  embedded = false,
  embeddedTab = "dashboard",
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [notifications, setNotifications] = useState([]);

  // Modal states
  const [modal, setModal] = useState(null); // "customer" | "vehicle" | "checkin"
  const [modalProps, setModalProps] = useState({});
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    if (embedded) {
      setActiveTab(embeddedTab);
    }
  }, [embedded, embeddedTab]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const fetchSessions = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const res = await getReceptionSessions();
      if (res && res.success) {
        // filter out completed returns
        const active = (res.sessions || []).filter(
          (s) => s.status !== "returned_completed"
        );
        setSessions(active);
      } else {
        throw new Error(res?.message || "Failed to fetch sessions.");
      }
    } catch (err) {
      if (!silent) setError(err.message || "Failed to load parking sessions.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    getReceptionNotifications().then((response) => setNotifications(response?.notifications || [])).catch(() => setNotifications([]));
  }, [fetchSessions]);

  useRealtimeSync({
    tables: ["parking_sessions", "parking_slots", "notifications", "keys"],
    onUpdate: () => {
      fetchSessions(true);
      getReceptionNotifications().then((response) => setNotifications(response?.notifications || [])).catch(() => {});
    },
    interval: 3500,
  });

  // KPI derived stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      totalActive: sessions.length,
      todayCheckIns: sessions.filter((s) => s.checked_in_at && new Date(s.checked_in_at) >= today).length,
      awaitingRetrieval: sessions.filter((s) =>
        ["retrieval_requested", "retrieving"].includes(s.status)
      ).length,
      readyForPickup: sessions.filter((s) => s.status === "ready_for_pickup").length,
    };
  }, [sessions]);

  const handleRequestRetrieval = async (sessionId) => {
    if (!window.confirm("Are you sure you want to request retrieval for this vehicle?")) return;
    try {
      setActionLoading(sessionId);
      const res = await requestReceptionRetrieval(sessionId);
      if (res && res.success) {
        setSuccessMsg("Retrieval requested successfully.");
        setTimeout(() => setSuccessMsg(""), 3000);
        await fetchSessions();
      } else {
        throw new Error(res?.message || "Failed to request retrieval.");
      }
    } catch (err) {
      setError(err.message || "Failed to request retrieval.");
    } finally {
      setActionLoading(null);
    }
  };

  // Modal cascade flow
  const openModal = (type, props = {}) => {
    setModal(type);
    setModalProps(props);
  };

  const closeModal = () => {
    setModal(null);
    setModalProps({});
  };

  const handleCustomerSuccess = (customer, next) => {
    if (next === "register-vehicle") {
      openModal("vehicle", { preselectedCustomer: customer });
    } else {
      closeModal();
      setSuccessMsg(`Customer "${customer.name}" registered successfully.`);
      setTimeout(() => setSuccessMsg(""), 3500);
    }
  };

  const handleVehicleSuccess = (vehicle, next) => {
    if (next === "check-in") {
      openModal("checkin", { preselectedVehicle: vehicle });
    } else {
      closeModal();
      setSuccessMsg(`Vehicle ${vehicle.license_plate} registered successfully.`);
      setTimeout(() => setSuccessMsg(""), 3500);
    }
  };

  const handleCheckInSuccess = () => {
    setSuccessMsg("Vehicle checked in successfully.");
    setTimeout(() => setSuccessMsg(""), 3500);
    fetchSessions();
  };

  // ============================================================
  // DASHBOARD HOME VIEW
  // ============================================================

  const renderDashboardHome = () => (
    <div className="reception-view-wrapper">
      {/* Header */}
      <div className="reception-view-header">
        <div>
          <span className="reception-eyebrow">RECEPTION DESK</span>
          <h2>Operations Center</h2>
          <p>Manage customer check-ins, vehicle registrations, and retrieval requests.</p>
        </div>
        <button
          className="reception-action-btn primary"
          onClick={fetchSessions}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "refresh-spinning" : ""} />
          <span>{loading ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="reception-quick-actions">
        <button className="quick-action-card" onClick={() => openModal("customer")}>
          <div className="quick-action-icon" style={{ background: "#f4eef8", color: "#5e3573" }}>
            <UserPlus size={20} />
          </div>
          <div>
            <strong>Register Customer</strong>
            <span>Add a new customer to the system</span>
          </div>
        </button>

        <button className="quick-action-card" onClick={() => openModal("vehicle")}>
          <div className="quick-action-icon" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
            <Car size={20} />
          </div>
          <div>
            <strong>Register Vehicle</strong>
            <span>Link a vehicle to a customer</span>
          </div>
        </button>

        <button className="quick-action-card" onClick={() => openModal("checkin")}>
          <div className="quick-action-icon" style={{ background: "#ecfdf5", color: "#047857" }}>
            <LogIn size={20} />
          </div>
          <div>
            <strong>Check-In Vehicle</strong>
            <span>Create a new parking session</span>
          </div>
        </button>

        <button className="quick-action-card" onClick={() => setActiveTab("sessions")}>
          <div className="quick-action-icon" style={{ background: "#fffbeb", color: "#b45309" }}>
            <ArrowRight size={20} />
          </div>
          <div>
            <strong>View Sessions</strong>
            <span>Manage active parking sessions</span>
          </div>
        </button>

        <button className="quick-action-card" onClick={() => setTicketModalOpen(true)}>
          <div className="quick-action-icon" style={{ background: "#fce7eb", color: "#8b1230" }}><TicketCheck size={20} /></div>
          <div><strong>Verify Ticket / QR</strong><span>Verify a vehicle for handover</span></div>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="reception-stats-grid">
        <ReceptionStatCard
          icon={<Car size={20} />}
          label="Total Active Vehicles"
          value={loading ? "--" : stats.totalActive}
          sub="Currently in facility"
          accent="purple"
        />
        <ReceptionStatCard
          icon={<LogIn size={20} />}
          label="Today's Check-Ins"
          value={loading ? "--" : stats.todayCheckIns}
          sub="Sessions created today"
          accent="green"
        />
        <ReceptionStatCard
          icon={<Clock3 size={20} />}
          label="Awaiting Retrieval"
          value={loading ? "--" : stats.awaitingRetrieval}
          sub="Requested or in retrieval"
          accent="amber"
        />
        <ReceptionStatCard
          icon={<CheckCircle2 size={20} />}
          label="Ready for Pickup"
          value={loading ? "--" : stats.readyForPickup}
          sub="Customer can collect vehicle"
          accent="green"
        />
      </div>

      {/* Recent Sessions Preview */}
      <div className="reception-recent-header">
        <h3>Recent Sessions</h3>
        <button
          className="reception-view-all-btn"
          onClick={() => setActiveTab("sessions")}
        >
          View All →
        </button>
      </div>
      <div className="reception-table-card">
        <table className="reception-table">
          <thead>
            <tr>
              <th>TICKET</th>
              <th>VEHICLE</th>
              <th>CUSTOMER</th>
              <th>TYPE</th>
              <th>STATUS</th>
              <th>CHECK-IN</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="reception-table-empty">Loading...</td></tr>
            ) : sessions.slice(0, 6).length === 0 ? (
              <tr><td colSpan="6" className="reception-table-empty">No active sessions. Check in the first vehicle!</td></tr>
            ) : sessions.slice(0, 6).map((s) => {
              const statusInfo = STATUS_CONFIG[s.status] || { label: s.status, cls: "status-checked-in" };
              return (
                <tr key={s.id}>
                  <td><span className="reception-ticket-code">{s.ticket_code}</span></td>
                  <td>
                    <strong>{s.vehicle?.license_plate || "—"}</strong>
                    <div style={{ fontSize: "11px", color: "#7b7389" }}>{s.vehicle?.make} {s.vehicle?.model}</div>
                  </td>
                  <td>{s.vehicle?.customer?.name || "—"}</td>
                  <td style={{ textTransform: "capitalize", fontWeight: "600", color: "#5e3573" }}>{s.parking_type}</td>
                  <td><span className={`reception-status-tag ${statusInfo.cls}`}>{statusInfo.label}</span></td>
                  <td style={{ fontSize: "12px", color: "#7b7389" }}>
                    {s.checked_in_at ? new Date(s.checked_in_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="reception-operations-grid">
        <div className="reception-operation-card"><div className="reception-recent-header"><h3>Retrieval Queue</h3><span className="reception-count-badge">{sessions.filter((s) => s.status === "retrieval_requested").length}</span></div>{sessions.filter((s) => s.status === "retrieval_requested").length === 0 ? <p className="reception-operation-empty">No retrieval requests waiting.</p> : sessions.filter((s) => s.status === "retrieval_requested").map((s) => <div className="reception-operation-row" key={s.id}><span><strong>{s.ticket_code || "Unavailable"}</strong><small>{s.vehicle?.license_plate || "Unavailable"} · {s.vehicle?.customer?.name || "Unavailable"}</small></span><span className="reception-status-tag status-retrieval">Awaiting Retrieval</span></div>)}</div>
        <div className="reception-operation-card"><div className="reception-recent-header"><h3>Ready for Pickup</h3><span className="reception-count-badge">{stats.readyForPickup}</span></div>{sessions.filter((s) => s.status === "ready_for_pickup").length === 0 ? <p className="reception-operation-empty">No vehicles are ready for pickup.</p> : sessions.filter((s) => s.status === "ready_for_pickup").map((s) => <div className="reception-operation-row" key={s.id}><span><strong>{s.vehicle?.customer?.name || "Unavailable"}</strong><small>{s.vehicle?.license_plate || "Unavailable"} · {s.ticket_code || "Unavailable"}</small></span><button className="reception-action-btn small primary" onClick={() => setTicketModalOpen(true)}>Verify</button></div>)}</div>
      </div>

      {notifications.length > 0 && <div className="reception-notification-strip"><Bell size={15} /> {notifications[0].message}</div>}
    </div>
  );

  const renderView = () => {
    switch (activeTab) {
      case "dashboard": return renderDashboardHome();
      case "sessions": return (
        <SessionsView
          sessions={sessions}
          loading={loading}
          onRefresh={fetchSessions}
          onRequestRetrieval={handleRequestRetrieval}
          onViewSession={setSelectedSession}
          actionLoading={actionLoading}
        />
      );
      case "customers": return <CustomersView onOpenRegisterModal={() => openModal("customer")} />;
      case "vehicles": return <VehiclesView />;
      case "keys": return <ReceptionKeyManagement />;
      case "payments":
        return <ReceptionPayments />;
      case "profile": return <ProfileView onLogout={handleLogout} />;
      default: return renderDashboardHome();
    }
  };


  const receptionContent = (
    <div className="reception-body">
      {error && (
        <div className="reception-global-error">
          ⚠️ {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "auto", color: "#b91c1c" }}>✕</button>
        </div>
      )}
      {successMsg && (
        <div className="reception-global-success">
          ✓ {successMsg}
        </div>
      )}
      {renderView()}
    </div>
  );

  return (
    <div className={embedded ? "reception-embedded" : "reception-root"}>
      {embedded ? receptionContent : (
        <DashboardLayout
          config={receptionConfig}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
        >
          {receptionContent}
        </DashboardLayout>
      )}

      {/* MODALS */}
      {modal === "customer" && (
        <RegisterCustomerModal
          onClose={closeModal}
          onSuccess={handleCustomerSuccess}
        />
      )}
      {modal === "vehicle" && (
        <RegisterVehicleModal
          onClose={closeModal}
          onSuccess={handleVehicleSuccess}
          preselectedCustomer={modalProps.preselectedCustomer}
        />
      )}
      {modal === "checkin" && (
        <CheckInVehicleModal
          onClose={closeModal}
          onSuccess={handleCheckInSuccess}
          preselectedVehicle={modalProps.preselectedVehicle}
        />
      )}
      {ticketModalOpen && <ReceptionTicketModal onClose={() => setTicketModalOpen(false)} onComplete={fetchSessions} />}
      {selectedSession && <ReceptionSessionDetailsModal session={selectedSession} onClose={() => setSelectedSession(null)} />}
    </div>
  );
};

export default ReceptionDashboard;

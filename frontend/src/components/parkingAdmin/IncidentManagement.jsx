import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    Bell,
    CalendarClock,
    CheckCircle2,
    ChevronRight,
    CircleDot,
    Clock3,
    FileWarning,
    Plus,
    RefreshCw,
    Search,
    ShieldAlert,
    X,
} from "lucide-react";
import {
    createIncident,
    getIncidentById,
    getIncidents,
    getIncidentsBySession,
    getParkingAdminNotifications,
    getParkingSessions,
    updateIncidentStatus,
} from "../../api/parkingApi";
import "./css/IncidentManagement.css";

const INCIDENT_TYPES = [
    { value: "vehicle_damage", label: "Vehicle Damage" },
    { value: "lost_ticket", label: "Lost Ticket" },
    { value: "dispute", label: "Customer Dispute" },
    { value: "theft", label: "Theft" },
    { value: "other", label: "Other" },
];

const STATUSES = [
    { value: "open", label: "Open" },
    { value: "in_review", label: "In Review" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
];

const STATUS_ORDER = ["open", "in_review", "resolved", "closed"];

const IncidentManagement = () => {
    const [incidents, setIncidents] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [actionLoading, setActionLoading] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [showReport, setShowReport] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [sessionIncidents, setSessionIncidents] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [form, setForm] = useState({
        parking_session_id: "",
        incident_type: "",
        description: "",
    });

    const fetchIncidents = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const params = {};

            if (statusFilter !== "all") {
                params.status = statusFilter;
            }

            if (typeFilter !== "all") {
                params.incident_type = typeFilter;
            }

            const response = await getIncidents(params);

            if (!response?.success) {
                throw new Error(
                    response?.message ||
                    "Failed to fetch incidents."
                );
            }

            setIncidents(
                Array.isArray(response?.incidents)
                    ? response.incidents
                    : []
            );
        } catch (err) {
            console.error("Fetch incidents error:", err);

            setError(
                err?.message ||
                "Failed to fetch incidents."
            );
        } finally {
            setLoading(false);
        }
    }, [statusFilter, typeFilter]);

    const fetchSessions = useCallback(async () => {
        try {
            setSessionsLoading(true);

            const response = await getParkingSessions();

            if (!response?.success) {
                throw new Error(
                    response?.message ||
                    "Failed to fetch parking sessions."
                );
            }

            setSessions(
                Array.isArray(response?.sessions)
                    ? response.sessions
                    : []
            );
        } catch (err) {
            console.error(
                "Fetch parking sessions error:",
                err
            );

            setError(
                err?.message ||
                "Failed to fetch parking sessions."
            );
        } finally {
            setSessionsLoading(false);
        }
    }, []);

    const fetchNotifications = useCallback(async () => {
        try {
            const response = await getParkingAdminNotifications();
            if (response?.success) setNotifications(
                Array.isArray(response?.notifications)
                    ? response.notifications
                    : []
            );
        } catch (err) {
            // Notifications are supplementary; incident management remains usable.
            console.warn("Fetch incident notifications error:", err);

            setNotifications([]);
        }
    }, []);

    useEffect(() => {
        fetchIncidents();
    }, [fetchIncidents]);

    useEffect(() => {
        fetchSessions();
        fetchNotifications();
    }, [fetchSessions, fetchNotifications]);

    useEffect(() => {
        if (!success) return undefined;
        const timer = setTimeout(() => setSuccess(""), 3500);
        return () => clearTimeout(timer);
    }, [success]);

    const getSession = (sessionId) =>
        sessions.find((session) => String(session.id) === String(sessionId));

    const filteredIncidents = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return incidents;
        return incidents.filter((incident) => {
            const session = getSession(incident.parking_session_id);
            const values = [
                incident.incident_type,
                incident.description,
                incident.status,
                incident.employee?.name,
                incident.employee?.email,
                incident.parking_session_id,
                session?.ticket_code,
                session?.vehicle?.license_plate,
            ];
            return values.some((value) => String(value || "").toLowerCase().includes(term));
        });
    }, [incidents, search, sessions]);

    const counts = useMemo(() => ({
        total: incidents.length,
        open: incidents.filter((item) => item.status === "open").length,
        inReview: incidents.filter((item) => item.status === "in_review").length,
        resolved: incidents.filter((item) => item.status === "resolved").length,
        closed: incidents.filter((item) => item.status === "closed").length,
    }), [incidents]);

    const formatType = (type) =>
        INCIDENT_TYPES.find((item) => item.value === type)?.label ||
        String(type || "Unknown").replaceAll("_", " ");

    const formatStatus = (status) =>
        STATUSES.find((item) => item.value === status)?.label || status || "Unknown";

    const formatDate = (value) => {
        if (!value) return "—";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN");
    };

    const sessionLabel = (session) => {
        if (!session) return "No parking session";
        return `${session.ticket_code || "Session"} • ${session.vehicle?.license_plate || "Vehicle unavailable"}`;
    };

    const handleCreate = async (event) => {
        event.preventDefault();
        if (!form.incident_type || !form.description.trim()) return;
        try {
            setActionLoading("create");
            setError("");
            const payload = {
                incident_type: form.incident_type,
                description: form.description.trim(),
            };
            if (form.parking_session_id) payload.parking_session_id = form.parking_session_id;
            const response = await createIncident(payload);
            if (!response?.success) throw new Error(response?.message || "Failed to report incident.");
            setSuccess("Incident reported successfully.");
            setForm({ parking_session_id: "", incident_type: "", description: "" });
            setShowReport(false);
            await Promise.all([fetchIncidents(), fetchNotifications()]);
        } catch (err) {
            setError(err.message || "Failed to report incident.");
        } finally {
            setActionLoading("");
        }
    };

    const openDetails = async (incident) => {
        try {
            setSelectedIncident(incident);
            setSessionIncidents(null);
            setModalLoading(true);
            const response = await getIncidentById(incident.id);
            if (!response?.success) throw new Error(response?.message || "Failed to fetch incident details.");
            setSelectedIncident(response.incident || incident);
        } catch (err) {
            setError(err.message || "Failed to fetch incident details.");
        } finally {
            setModalLoading(false);
        }
    };

    const openSessionHistory = async (incident) => {
        if (!incident.parking_session_id) {
            setError("This incident is not linked to a parking session.");
            return;
        }
        try {
            setSelectedIncident(incident);
            setSessionIncidents(null);
            setModalLoading(true);
            const response = await getIncidentsBySession(incident.parking_session_id);
            if (!response?.success) throw new Error(response?.message || "Failed to fetch session incidents.");
            setSessionIncidents(response.incidents || []);
        } catch (err) {
            setError(err.message || "Failed to fetch session incident history.");
        } finally {
            setModalLoading(false);
        }
    };

    const changeStatus = async (incident, nextStatus) => {
        const currentIndex = STATUS_ORDER.indexOf(incident.status);
        const nextIndex = STATUS_ORDER.indexOf(nextStatus);
        if (nextIndex !== currentIndex + 1) return;

        const requiresConfirm = nextStatus === "resolved" || nextStatus === "closed";
        if (requiresConfirm && !window.confirm(`Change this incident to ${formatStatus(nextStatus)}?`)) return;

        try {
            setActionLoading(`status-${incident.id}`);
            setError("");
            const response = await updateIncidentStatus(incident.id, nextStatus);
            if (!response?.success) throw new Error(response?.message || "Failed to update incident status.");
            setSuccess(`Incident marked ${formatStatus(nextStatus).toLowerCase()}.`);
            setSelectedIncident(response.incident || null);
            await fetchIncidents();
        } catch (err) {
            setError(err.message || "Failed to update incident status.");
        } finally {
            setActionLoading("");
        }
    };

    const activeNotifications = notifications.filter((item) =>
        item.channel === "in_app" && /incident/i.test(item.message || "")
    );

    return (
        <section className="incident-page">
            <div className="incident-header">
                <div>
                    <div className="incident-eyebrow"><ShieldAlert size={14} /> PARKING OPERATIONS</div>
                    <h1>Incident Management</h1>
                    <p>Track, investigate and resolve operational incidents across the parking facility.</p>
                </div>
                <div className="incident-header-actions">
                    <button className="incident-secondary-btn" onClick={fetchIncidents} disabled={loading}>
                        <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
                    </button>
                    <button className="incident-primary-btn" onClick={() => setShowReport(true)}>
                        <Plus size={17} /> Report Incident
                    </button>
                </div>
            </div>

            {activeNotifications.length > 0 && (
                <div className="incident-notification">
                    <Bell size={17} />
                    <div><strong>New incident reported</strong><span>{activeNotifications[0].message}</span></div>
                    <small>{formatDate(activeNotifications[0].created_at)}</small>
                </div>
            )}

            {error && <div className="incident-alert error"><AlertCircle size={17} /><span>{error}</span><button onClick={() => setError("")}><X size={15} /></button></div>}
            {success && <div className="incident-alert success"><CheckCircle2 size={17} /><span>{success}</span></div>}

            <div className="incident-stat-grid">
                <div className="incident-stat-card"><div className="stat-icon total"><FileWarning /></div><span>Total Incidents</span><strong>{counts.total}</strong></div>
                <div className="incident-stat-card"><div className="stat-icon open"><AlertCircle /></div><span>Open</span><strong>{counts.open}</strong></div>
                <div className="incident-stat-card"><div className="stat-icon review"><Clock3 /></div><span>In Review</span><strong>{counts.inReview}</strong></div>
                <div className="incident-stat-card"><div className="stat-icon resolved"><CheckCircle2 /></div><span>Resolved</span><strong>{counts.resolved}</strong></div>
                <div className="incident-stat-card"><div className="stat-icon closed"><CircleDot /></div><span>Closed</span><strong>{counts.closed}</strong></div>
            </div>

            <div className="incident-toolbar">
                <div className="incident-search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search incidents, tickets, vehicles or reporters..." /></div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All statuses</option>{STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="all">All types</option>{INCIDENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
            </div>

            <div className="incident-table-card">
                <div className="incident-table-heading"><div><h2>Reported Incidents</h2><span>{filteredIncidents.length} incident{filteredIncidents.length === 1 ? "" : "s"}</span></div><span className="live-data"><span /> Live API data</span></div>
                {loading ? (
                    <div className="incident-state"><RefreshCw className="spin" /><p>Loading incidents...</p></div>
                ) : filteredIncidents.length === 0 ? (
                    <div className="incident-state"><FileWarning /><h3>No incidents found</h3><p>{incidents.length ? "Try changing your search or filters." : "Reported incidents will appear here."}</p></div>
                ) : (
                    <div className="incident-table-wrap">
                        <table className="incident-table">
                            <thead><tr><th>Incident</th><th>Parking Session</th><th>Reported By</th><th>Status</th><th>Created</th><th>Resolved</th><th>Actions</th></tr></thead>
                            <tbody>
                                {filteredIncidents.map((incident) => {
                                    const session = getSession(incident.parking_session_id);
                                    const currentIndex = STATUS_ORDER.indexOf(incident.status);
                                    const nextStatus = STATUS_ORDER[currentIndex + 1];
                                    return (
                                        <tr key={incident.id}>
                                            <td><div className="incident-type-cell"><span className={`type-mark type-${incident.incident_type}`}><FileWarning size={15} /></span><div><strong>{formatType(incident.incident_type)}</strong><p>{incident.description}</p></div></div></td>
                                            <td><span className="session-primary">{session?.ticket_code || incident.parking_session_id || "Not linked"}</span><small>{session?.vehicle?.license_plate || "—"}</small></td>
                                            <td><strong className="reporter-name">{incident.employee?.name || "Unknown"}</strong><small>{incident.employee?.role || "Employee"}</small></td>
                                            <td><span className={`incident-status status-${incident.status}`}>{formatStatus(incident.status)}</span></td>
                                            <td>{formatDate(incident.created_at)}</td>
                                            <td>{formatDate(incident.resolved_at)}</td>
                                            <td><div className="row-actions"><button onClick={() => openDetails(incident)}>View</button>{incident.parking_session_id && <button onClick={() => openSessionHistory(incident)}>Session</button>}{nextStatus && <button disabled={actionLoading === `status-${incident.id}`} onClick={() => changeStatus(incident, nextStatus)}>{actionLoading === `status-${incident.id}` ? "..." : formatStatus(nextStatus)}</button>}</div></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showReport && (
                <div className="incident-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setShowReport(false)}>
                    <div className="incident-modal report-modal">
                        <div className="modal-head"><div><span className="modal-kicker">NEW REPORT</span><h2>Report Incident</h2><p>The backend records the logged-in employee as the reporter.</p></div><button onClick={() => setShowReport(false)}><X /></button></div>
                        <form onSubmit={handleCreate}>
                            <label>Parking Session <span>Optional</span><select value={form.parking_session_id} onChange={(e) => setForm({ ...form, parking_session_id: e.target.value })}><option value="">No linked session</option>{sessionsLoading ? <option disabled>Loading sessions...</option> : sessions.map((session) => <option key={session.id} value={session.id}>{sessionLabel(session)}</option>)}</select></label>
                            <label>Incident Type<select required value={form.incident_type} onChange={(e) => setForm({ ...form, incident_type: e.target.value })}><option value="">Select incident type</option>{INCIDENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
                            <label>Description<textarea required rows="5" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe what happened, where applicable, and any relevant details..." /></label>
                            <div className="modal-footer"><button type="button" className="incident-secondary-btn" onClick={() => setShowReport(false)}>Cancel</button><button type="submit" className="incident-primary-btn" disabled={actionLoading === "create"}>{actionLoading === "create" ? "Reporting..." : "Report Incident"}</button></div>
                        </form>
                    </div>
                </div>
            )}

            {selectedIncident && (
                <div className="incident-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && (setSelectedIncident(null), setSessionIncidents(null))}>
                    <div className="incident-modal details-modal">
                        <div className="modal-head"><div><span className="modal-kicker">INCIDENT DETAILS</span><h2>{formatType(selectedIncident.incident_type)}</h2><p>{selectedIncident.description}</p></div><button onClick={() => { setSelectedIncident(null); setSessionIncidents(null); }}><X /></button></div>
                        {modalLoading ? <div className="incident-state compact"><RefreshCw className="spin" /><p>Loading details...</p></div> : sessionIncidents ? (
                            <div className="session-history"><div className="history-heading"><div><h3>Session Incident History</h3><p>Newest first</p></div><span>{sessionIncidents.length}</span></div>{sessionIncidents.length ? sessionIncidents.map((item) => <div className="history-item" key={item.id}><span className={`history-dot status-${item.status}`} /><div><strong>{formatType(item.incident_type)}</strong><p>{item.description}</p><small>{item.employee?.name || "Unknown"} • {formatDate(item.created_at)} • {formatStatus(item.status)}</small></div></div>) : <div className="empty-history">No other incidents are linked to this session.</div>}</div>
                        ) : (
                            <div className="details-grid">
                                <div><span>Incident Type</span><strong>{formatType(selectedIncident.incident_type)}</strong></div>
                                <div><span>Status</span><strong><span className={`incident-status status-${selectedIncident.status}`}>{formatStatus(selectedIncident.status)}</span></strong></div>
                                <div><span>Parking Session</span><strong>{getSession(selectedIncident.parking_session_id)?.ticket_code || selectedIncident.parking_session_id || "Not linked"}</strong></div>
                                <div><span>Vehicle</span><strong>{getSession(selectedIncident.parking_session_id)?.vehicle?.license_plate || "—"}</strong></div>
                                <div><span>Reported By</span><strong>{selectedIncident.employee?.name || "Unknown"}</strong></div>
                                <div><span>Reporter Role</span><strong>{selectedIncident.employee?.role || "—"}</strong></div>
                                <div><span>Created</span><strong>{formatDate(selectedIncident.created_at)}</strong></div>
                                <div><span>Resolved</span><strong>{formatDate(selectedIncident.resolved_at)}</strong></div>
                                <div className="detail-description"><span>Description</span><p>{selectedIncident.description}</p></div>
                                <div className="details-status-actions"><span>Update Status</span><div>{STATUS_ORDER.map((status, index) => { const current = STATUS_ORDER.indexOf(selectedIncident.status); const enabled = index === current + 1; return <button key={status} disabled={!enabled || actionLoading === `status-${selectedIncident.id}`} className={enabled ? "next-status" : ""} onClick={() => changeStatus(selectedIncident, status)}>{formatStatus(status)}{enabled && <ChevronRight size={14} />}</button>; })}</div></div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};

export default IncidentManagement;

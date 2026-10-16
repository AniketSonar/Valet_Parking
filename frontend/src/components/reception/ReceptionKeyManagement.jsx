
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Car,
  CheckCircle2,
  Clock3,
  Eye,
  KeyRound,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  UserRoundCheck,
  X,
} from "lucide-react";
import {
  assignKey,
  createKey,
  getKeyById,
  getKeyHistory,
  getKeys,
  getReceptionSessions,
  getReceptionValets,
  markKeyLost,
  returnKey,
} from "../../api/receptionApi";
import "./css/ReceptionKeyManagement.css";

const STATUS_CONFIG = {
  available: { label: "Available", className: "key-status-available" },
  stored: { label: "Stored", className: "key-status-stored" },
  assigned: { label: "Assigned", className: "key-status-assigned" },
  in_use: { label: "In Use", className: "key-status-in-use" },
  returned: { label: "Returned", className: "key-status-returned" },
  lost: { label: "Lost", className: "key-status-lost" },
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatShortDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getInitials = (name) =>
  (name || "NA")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const unwrapArray = (response, key) => {
  if (Array.isArray(response)) return response;
  return response?.[key] || [];
};

const unwrapKey = (response) => response?.key || response?.data || response;

const ModalShell = ({ title, subtitle, onClose, children, wide = false }) => (
  <div className="key-modal-backdrop" onMouseDown={onClose}>
    <div
      className={`key-modal ${wide ? "key-modal-wide" : ""}`}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="key-modal-header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>

        <button
          type="button"
          className="key-modal-close"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>

      {children}
    </div>
  </div>
);

const ReceptionKeyManagement = () => {
  const [keys, setKeys] = useState([]);
  const [valets, setValets] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [menuKeyId, setMenuKeyId] = useState(null);
  const [modal, setModal] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [createForm, setCreateForm] = useState({
    key_number: "",
    key_location: "",
    status: "available",
    notes: "",
  });

  const [assignForm, setAssignForm] = useState({
    assigned_to: "",
    parking_session_id: "",
  });

  const [returnForm, setReturnForm] = useState({
    key_location: "",
    notes: "",
  });

  const [lostNotes, setLostNotes] = useState("");

  const showSuccess = (message) => {
    setSuccess(message);

    window.setTimeout(() => {
      setSuccess("");
    }, 3500);
  };

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [keysRes, valetsRes, sessionsRes] = await Promise.all([
        getKeys(),
        getReceptionValets(),
        getReceptionSessions({
          status:
            "checked_in,parked,retrieval_requested,retrieving,ready_for_pickup",
        }),
      ]);

      if (!keysRes?.success) {
        throw new Error(keysRes?.message || "Failed to load keys.");
      }

      setKeys(unwrapArray(keysRes, "keys"));

      if (valetsRes?.success) {
        setValets(
          unwrapArray(valetsRes, "valets").filter(
            (member) => member.role === "valet" && member.is_active
          )
        );
      } else {
        setValets([]);
      }

      if (sessionsRes?.success) {
        setSessions(unwrapArray(sessionsRes, "sessions"));
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error("Load key management data error:", err);
      setError(err.message || "Failed to load key management data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sessionMap = useMemo(
    () =>
      new Map(
        sessions.map((session) => [String(session.id), session])
      ),
    [sessions]
  );

  const filteredKeys = useMemo(() => {
    const query = search.toLowerCase().trim();

    return keys.filter((key) => {
      const session =
        key.parking_session ||
        sessionMap.get(String(key.parking_session_id));

      const valet = key.assigned_user;

      const haystack = [
        key.key_number,
        key.key_location,
        key.status,
        session?.ticket_code,
        session?.vehicle?.license_plate,
        session?.vehicle?.customer?.name,
        valet?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || haystack.includes(query);

      const matchesStatus =
        statusFilter === "all" || key.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [keys, search, statusFilter, sessionMap]);

  const stats = useMemo(
    () =>
      Object.keys(STATUS_CONFIG).reduce(
        (result, status) => ({
          ...result,
          [status]: keys.filter((key) => key.status === status).length,
        }),
        {}
      ),
    [keys]
  );

  const closeModal = () => {
    setModal(null);
    setSelectedKey(null);
    setSelectedHistory(null);
    setActionLoading(false);
    setMenuKeyId(null);
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    if (!createForm.key_number.trim()) {
      setError("Key number is required.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      const response = await createKey({
        ...createForm,
        key_number: createForm.key_number.trim(),
        key_location: createForm.key_location.trim() || null,
        notes: createForm.notes.trim() || null,
      });

      if (!response?.success) {
        throw new Error(
          response?.message || "Failed to register key."
        );
      }

      showSuccess("Key registered successfully.");

      setCreateForm({
        key_number: "",
        key_location: "",
        status: "available",
        notes: "",
      });

      closeModal();
      await loadData(true);
    } catch (err) {
      setError(err.message || "Failed to register key.");
    } finally {
      setActionLoading(false);
    }
  };

  const openAssign = (key) => {
    setMenuKeyId(null);
    setSelectedKey(key);

    setAssignForm({
      assigned_to: key.assigned_to || "",
      parking_session_id: key.parking_session_id || "",
    });

    setModal("assign");
  };

  const handleAssign = async (event) => {
    event.preventDefault();

    if (!assignForm.assigned_to) {
      setError("Select a valet before assigning the key.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      const response = await assignKey(selectedKey.id, {
        assigned_to: assignForm.assigned_to,
        parking_session_id: assignForm.parking_session_id || null,
      });

      if (!response?.success) {
        throw new Error(
          response?.message || "Failed to assign key."
        );
      }

      showSuccess("Key assigned successfully.");
      closeModal();
      await loadData(true);
    } catch (err) {
      setError(err.message || "Failed to assign key.");
    } finally {
      setActionLoading(false);
    }
  };

  const openReturn = (key) => {
    setMenuKeyId(null);
    setSelectedKey(key);

    setReturnForm({
      key_location: key.key_location || "",
      notes: "",
    });

    setModal("return");
  };

  const handleReturn = async (event) => {
    event.preventDefault();

    if (!returnForm.key_location.trim()) {
      setError("Enter the location where the key was returned.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      const response = await returnKey(selectedKey.id, {
        key_location: returnForm.key_location.trim(),
        notes: returnForm.notes.trim() || null,
      });

      if (!response?.success) {
        throw new Error(
          response?.message || "Failed to return key."
        );
      }

      showSuccess("Key returned successfully.");
      closeModal();
      await loadData(true);
    } catch (err) {
      setError(err.message || "Failed to return key.");
    } finally {
      setActionLoading(false);
    }
  };

  const openLost = (key) => {
    setMenuKeyId(null);
    setSelectedKey(key);
    setLostNotes("");
    setModal("lost");
  };

  const handleLost = async (event) => {
    event.preventDefault();

    if (!lostNotes.trim()) {
      setError(
        "Enter a reason or note before marking the key as lost."
      );
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      const response = await markKeyLost(selectedKey.id, {
        notes: lostNotes.trim(),
      });

      if (!response?.success) {
        throw new Error(
          response?.message || "Failed to mark key as lost."
        );
      }

      showSuccess("Key marked as lost.");
      closeModal();
      await loadData(true);
    } catch (err) {
      setError(err.message || "Failed to mark key as lost.");
    } finally {
      setActionLoading(false);
    }
  };

  const openDetails = async (key) => {
    setMenuKeyId(null);
    setSelectedKey(key);
    setModal("details");

    try {
      setActionLoading(true);
      setError("");

      const response = await getKeyById(key.id);

      if (response?.success) {
        setSelectedKey(unwrapKey(response));
      } else {
        throw new Error(
          response?.message || "Failed to load key details."
        );
      }
    } catch (err) {
      setError(err.message || "Failed to load key details.");
    } finally {
      setActionLoading(false);
    }
  };

  const openHistory = async (key) => {
    setMenuKeyId(null);
    setSelectedKey(key);
    setModal("history");

    try {
      setActionLoading(true);
      setError("");

      const response = await getKeyHistory(key.id);

      if (response?.success) {
        setSelectedHistory(response.history);
      } else {
        throw new Error(
          response?.message || "Failed to load key history."
        );
      }
    } catch (err) {
      setError(err.message || "Failed to load key history.");
    } finally {
      setActionLoading(false);
    }
  };

  const getSessionForKey = (key) =>
    key.parking_session ||
    sessionMap.get(String(key.parking_session_id)) ||
    null;

  const getVehicleForKey = (key) =>
    getSessionForKey(key)?.vehicle || null;

  return (
    <div
      className="reception-key-page"
      onClick={() => setMenuKeyId(null)}
    >
      <div className="reception-key-header">
        <div>
          <div className="key-breadcrumb">
            <span>Reception</span>
            <span>/</span>
            <strong>Key Management</strong>
          </div>

          <div className="key-title-row">
            <div className="key-title-icon">
              <KeyRound size={21} />
            </div>

            <div>
              <span className="reception-eyebrow">
                OPERATIONS
              </span>
              <h1>Vehicle Key Management</h1>
              <p>
                Track physical vehicle keys from check-in through
                return.
              </p>
            </div>
          </div>
        </div>

        <div className="key-header-actions">
          <button
            type="button"
            className="key-secondary-btn"
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw
              size={15}
              className={
                refreshing ? "refresh-spinning" : ""
              }
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            className="key-primary-btn"
            onClick={() => {
              setError("");
              setModal("create");
            }}
          >
            <Plus size={16} />
            Add Key
          </button>
        </div>
      </div>

      {error && (
        <div className="key-alert key-alert-error">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {success && (
        <div className="key-alert key-alert-success">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      <div className="key-summary-grid">
        <div className="key-summary-card">
          <div className="key-summary-icon purple">
            <KeyRound size={18} />
          </div>

          <div>
            <span>Total Keys</span>
            <strong>{loading ? "—" : keys.length}</strong>
          </div>
        </div>

        <div className="key-summary-card">
          <div className="key-summary-icon green">
            <CheckCircle2 size={18} />
          </div>

          <div>
            <span>Available</span>
            <strong>
              {loading ? "—" : stats.available}
            </strong>
          </div>
        </div>

        <div className="key-summary-card">
          <div className="key-summary-icon blue">
            <UserRoundCheck size={18} />
          </div>

          <div>
            <span>Assigned</span>
            <strong>
              {loading ? "—" : stats.assigned}
            </strong>
          </div>
        </div>

        <div className="key-summary-card">
          <div className="key-summary-icon amber">
            <Car size={18} />
          </div>

          <div>
            <span>In Use</span>
            <strong>
              {loading ? "—" : stats.in_use}
            </strong>
          </div>
        </div>

        <div className="key-summary-card">
          <div className="key-summary-icon slate">
            <Archive size={18} />
          </div>

          <div>
            <span>Stored</span>
            <strong>
              {loading ? "—" : stats.stored}
            </strong>
          </div>
        </div>

        <div className="key-summary-card">
          <div className="key-summary-icon red">
            <Clock3 size={18} />
          </div>

          <div>
            <span>Lost</span>
            <strong>
              {loading ? "—" : stats.lost}
            </strong>
          </div>
        </div>
      </div>

      <section className="key-table-card">
        <div className="key-toolbar">
          <div className="key-search">
            <Search size={16} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search key number, ticket, vehicle or valet..."
            />
          </div>

          <select
            className="key-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="all">All Statuses</option>

            {Object.entries(STATUS_CONFIG).map(
              ([value, config]) => (
                <option key={value} value={value}>
                  {config.label}
                </option>
              )
            )}
          </select>
        </div>

        <div className="key-table-scroll">
          {loading ? (
            <div className="key-table-state">
              <RefreshCw
                size={24}
                className="refresh-spinning"
              />
              <span>Loading keys...</span>
            </div>
          ) : filteredKeys.length === 0 ? (
            <div className="key-table-state">
              <KeyRound size={30} />
              <strong>No keys found</strong>
              <span>
                Try changing your search or status filter.
              </span>
            </div>
          ) : (
            <table className="key-table">
              <thead>
                <tr>
                  <th>KEY NUMBER</th>
                  <th>VEHICLE / TICKET</th>
                  <th>PARKING SESSION</th>
                  <th>KEY LOCATION</th>
                  <th>STATUS</th>
                  <th>ASSIGNED VALET</th>
                  <th>ASSIGNED AT</th>
                  <th>RETURNED AT</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {filteredKeys.map((key) => {
                  const status =
                    STATUS_CONFIG[key.status] || {
                      label: key.status || "Unknown",
                      className: "key-status-default",
                    };

                  const session =
                    getSessionForKey(key);

                  const vehicle =
                    getVehicleForKey(key);

                  return (
                    <tr key={key.id}>
                      <td>
                        <div className="key-number-cell">
                          <span className="key-number-icon">
                            <KeyRound size={14} />
                          </span>

                          <strong>
                            {key.key_number || "—"}
                          </strong>
                        </div>
                      </td>

                      <td>
                        <div className="key-vehicle-cell">
                          <strong>
                            {vehicle?.license_plate || "—"}
                          </strong>

                          <span>
                            {session?.ticket_code ||
                              "No ticket linked"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="key-session-code">
                          {session?.ticket_code ||
                            key.parking_session_id ||
                            "—"}
                        </span>
                      </td>

                      <td>
                        <span className="key-location-cell">
                          <MapPin size={13} />
                          {key.key_location ||
                            "Not specified"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`key-status ${status.className}`}
                        >
                          <span className="key-status-dot" />
                          {status.label}
                        </span>
                      </td>

                      <td>
                        {key.assigned_user ? (
                          <div className="key-valet-cell">
                            <span className="key-avatar">
                              {getInitials(
                                key.assigned_user.name
                              )}
                            </span>

                            <span>
                              {key.assigned_user.name}
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="key-date-cell">
                        {formatShortDate(
                          key.assigned_at
                        )}
                      </td>

                      <td className="key-date-cell">
                        {formatShortDate(
                          key.returned_at
                        )}
                      </td>

                      <td>
                        <div className="key-action-wrap">
                          <button
                            type="button"
                            className="key-more-btn"
                            onClick={(event) => {
                              event.stopPropagation();

                              setMenuKeyId(
                                menuKeyId === key.id
                                  ? null
                                  : key.id
                              );
                            }}
                            aria-label={`Actions for ${key.key_number}`}
                          >
                            <MoreHorizontal size={18} />
                          </button>

                          {menuKeyId === key.id && (
                            <div
                              className="key-action-menu"
                              onClick={(event) =>
                                event.stopPropagation()
                              }
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  openDetails(key)
                                }
                              >
                                <Eye size={15} />
                                View Details
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openHistory(key)
                                }
                              >
                                <Clock3 size={15} />
                                View History
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openAssign(key)
                                }
                              >
                                <UserRoundCheck size={15} />
                                Assign Key
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openReturn(key)
                                }
                              >
                                <RotateCcw size={15} />
                                Return Key
                              </button>

                              <button
                                type="button"
                                className="danger"
                                onClick={() =>
                                  openLost(key)
                                }
                              >
                                <X size={15} />
                                Mark Lost
                              </button>
                            </div>
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
      </section>

      {modal === "create" && (
        <ModalShell
          title="Register Vehicle Key"
          subtitle="Add a physical key to the key inventory."
          onClose={closeModal}
        >
          <form
            className="key-form"
            onSubmit={handleCreate}
          >
            <label>
              Key Number *
              <input
                value={createForm.key_number}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    key_number: e.target.value,
                  })
                }
                placeholder="e.g. KEY-001"
                autoFocus
              />
            </label>

            <label>
              Key Location
              <input
                value={createForm.key_location}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    key_location: e.target.value,
                  })
                }
                placeholder="e.g. Reception Key Cabinet A"
              />
            </label>

            <label>
              Initial Status
              <select
                value={createForm.status}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    status: e.target.value,
                  })
                }
              >
                {Object.entries(STATUS_CONFIG).map(
                  ([value, config]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {config.label}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Notes
              <textarea
                value={createForm.notes}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    notes: e.target.value,
                  })
                }
                placeholder="Optional notes"
                rows="3"
              />
            </label>

            <div className="key-form-actions">
              <button
                type="button"
                className="key-secondary-btn"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="key-primary-btn"
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Saving..."
                  : "Register Key"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal === "assign" && selectedKey && (
        <ModalShell
          title="Assign Key"
          subtitle={`Assign ${selectedKey.key_number} to an active valet.`}
          onClose={closeModal}
        >
          <form
            className="key-form"
            onSubmit={handleAssign}
          >
            <label>
              Valet *
              <select
                value={assignForm.assigned_to}
                onChange={(e) =>
                  setAssignForm({
                    ...assignForm,
                    assigned_to: e.target.value,
                  })
                }
              >
                <option value="">
                  Select valet
                </option>

                {valets.map((valet) => (
                  <option
                    key={valet.id}
                    value={valet.id}
                  >
                    {valet.name} — {valet.email}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Parking Session
              <select
                value={assignForm.parking_session_id}
                onChange={(e) =>
                  setAssignForm({
                    ...assignForm,
                    parking_session_id: e.target.value,
                  })
                }
              >
                <option value="">
                  No session linked
                </option>

                {sessions.map((session) => (
                  <option
                    key={session.id}
                    value={session.id}
                  >
                    {session.ticket_code ||
                      `Session ${session.id}`}{" "}
                    —{" "}
                    {session.vehicle?.license_plate ||
                      "Vehicle"}
                  </option>
                ))}
              </select>
            </label>

            {valets.length === 0 && (
              <div className="key-inline-note">
                No active valet accounts were returned by
                the Reception API.
              </div>
            )}

            <div className="key-form-actions">
              <button
                type="button"
                className="key-secondary-btn"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="key-primary-btn"
                disabled={
                  actionLoading ||
                  valets.length === 0
                }
              >
                {actionLoading
                  ? "Assigning..."
                  : "Confirm Assignment"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal === "return" && selectedKey && (
        <ModalShell
          title="Return Key"
          subtitle={`Record the return of ${selectedKey.key_number}.`}
          onClose={closeModal}
        >
          <form
            className="key-form"
            onSubmit={handleReturn}
          >
            <label>
              Return Location *
              <input
                value={returnForm.key_location}
                onChange={(e) =>
                  setReturnForm({
                    ...returnForm,
                    key_location: e.target.value,
                  })
                }
                placeholder="e.g. Reception Key Cabinet A"
                autoFocus
              />
            </label>

            <label>
              Notes
              <textarea
                value={returnForm.notes}
                onChange={(e) =>
                  setReturnForm({
                    ...returnForm,
                    notes: e.target.value,
                  })
                }
                placeholder="Optional return notes"
                rows="4"
              />
            </label>

            <div className="key-form-actions">
              <button
                type="button"
                className="key-secondary-btn"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="key-primary-btn"
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Returning..."
                  : "Confirm Return"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal === "lost" && selectedKey && (
        <ModalShell
          title="Mark Key as Lost"
          subtitle={`This will mark ${selectedKey.key_number} as lost and remove its valet assignment.`}
          onClose={closeModal}
        >
          <form
            className="key-form"
            onSubmit={handleLost}
          >
            <div className="key-danger-box">
              <strong>
                Confirm destructive action
              </strong>

              <span>
                The backend will clear the current valet
                assignment.
              </span>
            </div>

            <label>
              Reason / Notes *
              <textarea
                value={lostNotes}
                onChange={(e) =>
                  setLostNotes(e.target.value)
                }
                placeholder="Explain why the key is being marked as lost..."
                rows="4"
                autoFocus
              />
            </label>

            <div className="key-form-actions">
              <button
                type="button"
                className="key-secondary-btn"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="key-danger-btn"
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Updating..."
                  : "Mark Key as Lost"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal === "details" && selectedKey && (
        <ModalShell
          title="Key Details"
          subtitle={`Current information for ${selectedKey.key_number}.`}
          onClose={closeModal}
          wide
        >
          <div className="key-detail-grid">
            <div className="key-detail-item">
              <span>Key Number</span>
              <strong>
                {selectedKey.key_number || "—"}
              </strong>
            </div>

            <div className="key-detail-item">
              <span>Status</span>
              <strong>
                {STATUS_CONFIG[selectedKey.status]
                  ?.label ||
                  selectedKey.status ||
                  "—"}
              </strong>
            </div>

            <div className="key-detail-item">
              <span>Location</span>
              <strong>
                {selectedKey.key_location || "—"}
              </strong>
            </div>

            <div className="key-detail-item">
              <span>Parking Session</span>
              <strong>
                {selectedKey.parking_session
                  ?.ticket_code ||
                  selectedKey.parking_session_id ||
                  "—"}
              </strong>
            </div>

            <div className="key-detail-item">
              <span>Vehicle</span>
              <strong>
                {getVehicleForKey(selectedKey)
                  ?.license_plate || "—"}
              </strong>
            </div>

            <div className="key-detail-item">
              <span>Vehicle Model</span>
              <strong>
                {[
                  getVehicleForKey(selectedKey)?.make,
                  getVehicleForKey(selectedKey)?.model,
                ]
                  .filter(Boolean)
                  .join(" ") || "—"}
              </strong>
            </div>

            <div className="key-detail-item">
              <span>Valet</span>
              <strong>
                {selectedKey.assigned_user?.name ||
                  "—"}
              </strong>
            </div>

            <div className="key-detail-item">
              <span>Assigned At</span>
              <strong>
                {formatDateTime(
                  selectedKey.assigned_at
                )}
              </strong>
            </div>

            <div className="key-detail-item">
              <span>Returned At</span>
              <strong>
                {formatDateTime(
                  selectedKey.returned_at
                )}
              </strong>
            </div>

            <div className="key-detail-item key-detail-full">
              <span>Notes</span>
              <strong>
                {selectedKey.notes ||
                  "No notes recorded."}
              </strong>
            </div>
          </div>
        </ModalShell>
      )}

      {modal === "history" && selectedKey && (
        <ModalShell
          title="Key History"
          subtitle={`Tracking information for ${selectedKey.key_number}.`}
          onClose={closeModal}
          wide
        >
          {actionLoading ? (
            <div className="key-history-loading">
              <RefreshCw
                size={22}
                className="refresh-spinning"
              />
              Loading history...
            </div>
          ) : selectedHistory ? (
            <div className="key-history-content">
              <div className="key-history-overview">
                <div>
                  <span>Key</span>
                  <strong>
                    {selectedHistory.key_number ||
                      selectedKey.key_number}
                  </strong>
                </div>

                <div>
                  <span>Current Status</span>
                  <strong>
                    {STATUS_CONFIG[
                      selectedHistory.status
                    ]?.label ||
                      selectedHistory.status ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>Current Location</span>
                  <strong>
                    {selectedHistory.key_location ||
                      "—"}
                  </strong>
                </div>
              </div>

              <div className="key-history-timeline">
                <div className="key-timeline-item">
                  <span className="key-timeline-dot" />

                  <div>
                    <strong>
                      Key registered
                    </strong>

                    <span>
                      {formatDateTime(
                        selectedHistory.created_at
                      )}
                    </span>

                    <p>
                      Key entered the system inventory.
                    </p>
                  </div>
                </div>

                {selectedHistory.assigned_at && (
                  <div className="key-timeline-item">
                    <span className="key-timeline-dot" />

                    <div>
                      <strong>
                        Key assigned
                      </strong>

                      <span>
                        {formatDateTime(
                          selectedHistory.assigned_at
                        )}
                      </span>

                      <p>
                        {selectedHistory.assigned_to
                          ?.name ||
                          "Assigned valet"}

                        {selectedHistory.parking_session
                          ?.ticket_code
                          ? ` · ${selectedHistory.parking_session.ticket_code}`
                          : ""}
                      </p>
                    </div>
                  </div>
                )}

                {selectedHistory.returned_at && (
                  <div className="key-timeline-item">
                    <span className="key-timeline-dot" />

                    <div>
                      <strong>
                        Key returned
                      </strong>

                      <span>
                        {formatDateTime(
                          selectedHistory.returned_at
                        )}
                      </span>

                      <p>
                        {selectedHistory.key_location ||
                          "Return location recorded"}
                      </p>
                    </div>
                  </div>
                )}

                {selectedHistory.updated_at && (
                  <div className="key-timeline-item">
                    <span className="key-timeline-dot" />

                    <div>
                      <strong>
                        Last record update
                      </strong>

                      <span>
                        {formatDateTime(
                          selectedHistory.updated_at
                        )}
                      </span>

                      <p>
                        {selectedHistory.notes ||
                          "No additional notes recorded."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="key-table-state">
              No history returned for this key.
            </div>
          )}
        </ModalShell>
      )}
    </div>
  );
};

export default ReceptionKeyManagement;

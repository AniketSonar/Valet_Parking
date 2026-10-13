import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Car,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  KeyRound,
  LogIn,
  LogOut,
  ParkingSquare,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  X,
  AlertCircle,
  Loader2,
  CircleParking,
} from "lucide-react";

import "./css/ParkingSessions.css";
import apiClient from "../../api/apiClient";

const ParkingSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [parkingTypeFilter, setParkingTypeFilter] = useState("all");

  const [selectedSession, setSelectedSession] = useState(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");

  const [checkInForm, setCheckInForm] = useState({
    vehicle_id: "",
    parking_type: "valet",
    ticket_code: "",
  });

  // ============================================================
  // FETCH SESSIONS
  // ============================================================

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.append("search", search.trim());
      }

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      if (parkingTypeFilter !== "all") {
        params.append("parking_type", parkingTypeFilter);
      }

      const query = params.toString();

      const response = await apiClient(
        `/api/parking-admin/sessions${query ? `?${query}` : ""}`
      );

      console.log("PARKING SESSIONS API RESPONSE:", response);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch parking sessions."
        );
      }

      setSessions(response.sessions || []);
    } catch (err) {
      console.error("Fetch parking sessions error:", err);
      setError(err.message || "Failed to fetch parking sessions.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, parkingTypeFilter]);

  const fetchAvailableSlots = useCallback(async () => {
    try {
      setLoadingSlots(true);

      const response = await apiClient(
        "/api/parking-slots?status=available"
      );

      console.log("AVAILABLE PARKING SLOTS:", response);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch available parking slots."
        );
      }

      setAvailableSlots(response.slots || []);

    } catch (err) {
      console.error("Fetch available slots error:", err);

      alert(
        err.message || "Failed to fetch available parking slots."
      );

    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleAssignSlot = async () => {
    if (!selectedSession || !selectedSlot) {
      return;
    }

    try {
      setActionLoading(selectedSession.id);

      const response = await apiClient(
        `/api/parking-admin/sessions/${selectedSession.id}/assign-slot`,
        {
          method: "PATCH",
          body: JSON.stringify({
            parking_slot: selectedSlot,
          }),
        }
      );

      if (!response.success) {
        throw new Error(
          response.message || "Failed to assign parking slot."
        );
      }

      alert("Parking slot assigned successfully.");

      setSelectedSlot("");
      setAvailableSlots([]);
      setSelectedSession(null);

      await fetchSessions();

    } catch (err) {
      console.error("Assign parking slot error:", err);

      alert(
        err.message || "Failed to assign parking slot."
      );

    } finally {
      setActionLoading(null);
    }
  };

  // ============================================================
  // CREATE PARKING SESSION
  // ============================================================

  const handleCheckIn = async (e) => {
    e.preventDefault();

    if (
      !checkInForm.vehicle_id ||
      !checkInForm.parking_type ||
      !checkInForm.ticket_code
    ) {
      return;
    }

    try {
      setActionLoading("check-in");

      const response = await apiClient("/api/parking-admin/sessions", {
        method: "POST",
        body: JSON.stringify(checkInForm),
      });

      if (!response.success) {
        throw new Error(
          response.message || "Failed to create parking session."
        );
      }

      setShowCheckIn(false);

      setCheckInForm({
        vehicle_id: "",
        parking_type: "valet",
        ticket_code: "",
      });

      await fetchSessions();
    } catch (err) {
      console.error("Check-in error:", err);
      alert(err.message || "Failed to check in vehicle.");
    } finally {
      setActionLoading(null);
    }
  };

  // ============================================================
  // SESSION ACTION
  // ============================================================

  const performAction = async (sessionId, endpoint, successMessage) => {
    try {
      setActionLoading(sessionId);

      const response = await apiClient(
        `/api/parking-admin/sessions/${sessionId}/${endpoint}`,
        {
          method: "PATCH",
        }
      );

      if (!response.success) {
        throw new Error(response.message || "Action failed.");
      }

      alert(successMessage);

      setSelectedSession(null);

      await fetchSessions();
    } catch (err) {
      console.error("Parking session action error:", err);

      alert(err.message || "Failed to perform action.");
    } finally {
      setActionLoading(null);
    }
  };

  // ============================================================
  // STATUS HELPERS
  // ============================================================

  const getStatusLabel = (status) => {
    const labels = {
      checked_in: "Checked In",
      parked: "Parked",
      retrieval_requested: "Retrieval Requested",
      retrieving: "Retrieving",
      ready_for_pickup: "Ready for Pickup",
      returned_completed: "Completed",
    };

    return labels[status] || status || "Unknown";
  };

  const getStatusClass = (status) => {
    return `session-status-${status || "unknown"}`;
  };

  const getStatusIcon = (status) => {
    const icons = {
      checked_in: LogIn,
      parked: ParkingSquare,
      retrieval_requested: Clock3,
      retrieving: ArrowDownToLine,
      ready_for_pickup: CheckCircle2,
      returned_completed: Check,
    };

    const Icon = icons[status] || AlertCircle;

    return <Icon size={13} strokeWidth={2.4} />;
  };

  const getParkingTypeLabel = (type) => {
    if (!type) return "—";

    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // ============================================================
  // CLIENT-SIDE SEARCH SAFETY
  // ============================================================

  const filteredSessions = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    if (!searchTerm) {
      return sessions;
    }

    return sessions.filter((session) => {
      const vehicleNumber =
        session.vehicle?.license_plate?.toLowerCase() || "";

      const customerName =
        session.vehicle?.customer?.name?.toLowerCase() || "";

      const customerPhone =
        session.vehicle?.customer?.phone?.toLowerCase() || "";

      const ticket = session.ticket_code?.toLowerCase() || "";

      const slot = session.parking_slot?.toLowerCase() || "";

      const valet = session.valet?.name?.toLowerCase() || "";

      return (
        vehicleNumber.includes(searchTerm) ||
        customerName.includes(searchTerm) ||
        customerPhone.includes(searchTerm) ||
        ticket.includes(searchTerm) ||
        slot.includes(searchTerm) ||
        valet.includes(searchTerm)
      );
    });
  }, [sessions, search]);

  // ============================================================
  // SUMMARY
  // ============================================================

  const statistics = useMemo(() => {
    return {
      total: sessions.length,

      checkedIn: sessions.filter(
        (session) => session.status === "checked_in"
      ).length,

      parked: sessions.filter(
        (session) => session.status === "parked"
      ).length,

      retrievals: sessions.filter((session) =>
        [
          "retrieval_requested",
          "retrieving",
          "ready_for_pickup",
        ].includes(session.status)
      ).length,
    };
  }, [sessions]);

  // ============================================================
  // ACTION BUTTONS
  // ============================================================

  const renderAction = (session) => {
    const isLoading = actionLoading === session.id;

    if (session.status === "checked_in") {
      return (
        <button
          className="session-action primary"
          disabled={isLoading}
          onClick={() => {
            setSelectedSession(session);
            setSelectedSlot("");
            fetchAvailableSlots();
          }}
        >
          {isLoading ? (
            <Loader2 size={14} className="spin-icon" />
          ) : (
            <CircleParking size={14} />
          )}

          Assign Slot
        </button>
      );
    }

    if (session.status === "parked") {
      return (
        <button
          className="session-action warning"
          disabled={isLoading}
          onClick={() =>
            performAction(
              session.id,
              "request-retrieval",
              "Retrieval request created."
            )
          }
        >
          {isLoading ? (
            <Loader2 size={14} className="spin-icon" />
          ) : (
            <KeyRound size={14} />
          )}

          Request Retrieval
        </button>
      );
    }

    if (session.status === "retrieval_requested") {
      return (
        <button
          className="session-action primary"
          disabled={isLoading}
          onClick={() =>
            performAction(
              session.id,
              "start-retrieval",
              "Vehicle retrieval started."
            )
          }
        >
          {isLoading ? (
            <Loader2 size={14} className="spin-icon" />
          ) : (
            <ArrowRight size={14} />
          )}

          Start Retrieval
        </button>
      );
    }

    if (session.status === "retrieving") {
      return (
        <button
          className="session-action success"
          disabled={isLoading}
          onClick={() =>
            performAction(
              session.id,
              "ready-for-pickup",
              "Vehicle marked ready for pickup."
            )
          }
        >
          {isLoading ? (
            <Loader2 size={14} className="spin-icon" />
          ) : (
            <CheckCircle2 size={14} />
          )}

          Mark Ready
        </button>
      );
    }

    if (session.status === "ready_for_pickup") {
      return (
        <button
          className="session-action success"
          disabled={isLoading}
          onClick={() =>
            performAction(
              session.id,
              "complete-return",
              "Vehicle return completed."
            )
          }
        >
          {isLoading ? (
            <Loader2 size={14} className="spin-icon" />
          ) : (
            <Check size={14} />
          )}

          Complete Return
        </button>
      );
    }

    return null;
  };

  // ============================================================
  // DATE FORMATTER
  // ============================================================

  const formatDateTime = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="parking-sessions-page">

      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="parking-sessions-header">
        <div className="sessions-header-content">

          <div className="sessions-title-row">
            <div className="sessions-title-icon">
              <ClipboardList size={21} />
            </div>

            <div>
              <p className="parking-sessions-eyebrow">
                PARKING OPERATIONS
              </p>

              <h1>Parking Sessions</h1>
            </div>
          </div>

          <p className="parking-sessions-description">
            Manage vehicle check-ins, parking assignments and retrieval
            workflows from one place.
          </p>

        </div>

        <div className="parking-sessions-header-actions">

          <button
            className="sessions-refresh-button"
            onClick={fetchSessions}
            disabled={loading}
          >
            <RefreshCw
              size={15}
              className={loading ? "spin-icon" : ""}
            />

            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            className="check-in-button"
            onClick={() => setShowCheckIn(true)}
          >
            <Plus size={17} />
            Check In Vehicle
          </button>

        </div>
      </div>

      {/* ========================================================
          SUMMARY CARDS
      ======================================================== */}

      <div className="sessions-summary">

        <div className="sessions-summary-card">
          <div className="summary-card-top">
            <div className="summary-icon purple">
              <ClipboardList size={18} />
            </div>

            <span className="summary-label">
              Total Sessions
            </span>
          </div>

          <strong>{statistics.total}</strong>

          <small>
            Current parking records
          </small>
        </div>

        <div className="sessions-summary-card">
          <div className="summary-card-top">
            <div className="summary-icon orange">
              <LogIn size={18} />
            </div>

            <span className="summary-label">
              Checked In
            </span>
          </div>

          <strong>{statistics.checkedIn}</strong>

          <small>
            Awaiting parking assignment
          </small>
        </div>

        <div className="sessions-summary-card">
          <div className="summary-card-top">
            <div className="summary-icon violet">
              <ParkingSquare size={18} />
            </div>

            <span className="summary-label">
              Parked
            </span>
          </div>

          <strong>{statistics.parked}</strong>

          <small>
            Currently parked vehicles
          </small>
        </div>

        <div className="sessions-summary-card">
          <div className="summary-card-top">
            <div className="summary-icon green">
              <KeyRound size={18} />
            </div>

            <span className="summary-label">
              Retrievals
            </span>
          </div>

          <strong>{statistics.retrievals}</strong>

          <small>
            Active retrieval workflow
          </small>
        </div>

      </div>

      {/* ========================================================
          CONTROLS
      ======================================================== */}

      <div className="sessions-controls">

        <div className="sessions-search">
          <Search size={17} />

          <input
            type="text"
            placeholder="Search vehicle, customer, ticket, slot..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {search && (
            <button
              className="clear-search-button"
              onClick={() => setSearch("")}
              type="button"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="session-filter">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="checked_in">Checked In</option>
            <option value="parked">Parked</option>
            <option value="retrieval_requested">
              Retrieval Requested
            </option>
            <option value="retrieving">
              Retrieving
            </option>
            <option value="ready_for_pickup">
              Ready for Pickup
            </option>
            <option value="returned_completed">
              Completed
            </option>
          </select>
        </div>

        <div className="session-filter">
          <select
            value={parkingTypeFilter}
            onChange={(e) =>
              setParkingTypeFilter(e.target.value)
            }
          >
            <option value="all">All Types</option>
            <option value="valet">Valet</option>
            <option value="self">Self</option>
          </select>
        </div>

      </div>

      {/* ========================================================
          CONTENT CARD
      ======================================================== */}

      <div className="sessions-card">

        <div className="sessions-card-header">

          <div>
            <div className="sessions-card-title">
              <div className="card-title-icon">
                <Car size={17} />
              </div>

              <h2>Vehicle Sessions</h2>
            </div>

            <p>
              {filteredSessions.length} session
              {filteredSessions.length !== 1 ? "s" : ""} found
            </p>
          </div>

          <div className="session-count-badge">
            {filteredSessions.length}
          </div>

        </div>

        {/* ======================================================
            LOADING
        ====================================================== */}

        {loading ? (
          <div className="sessions-loading">

            <div className="loading-icon">
              <Loader2 size={25} />
            </div>

            <strong>
              Loading parking sessions
            </strong>

            <span>
              Fetching the latest vehicle activity...
            </span>

          </div>

        ) : error ? (

          /* ====================================================
             ERROR
          ==================================================== */

          <div className="sessions-error">

            <div className="state-icon error">
              <AlertCircle size={25} />
            </div>

            <strong>
              Unable to load parking sessions
            </strong>

            <span>
              {error}
            </span>

            <button onClick={fetchSessions}>
              <RefreshCw size={14} />
              Try Again
            </button>

          </div>

        ) : filteredSessions.length === 0 ? (

          /* ====================================================
             EMPTY
          ==================================================== */

          <div className="sessions-empty">

            <div className="state-icon empty">
              <Car size={26} />
            </div>

            <strong>
              No parking sessions found
            </strong>

            <span>
              Try changing your filters or check in a vehicle.
            </span>

            {search && (
              <button
                onClick={() => setSearch("")}
              >
                Clear Search
              </button>
            )}

          </div>

        ) : (

          /* ====================================================
             TABLE
          ==================================================== */

          <div className="sessions-table-wrapper">

            <table className="sessions-table">

              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Customer</th>
                  <th>Ticket</th>
                  <th>Type</th>
                  <th>Slot</th>
                  <th>Valet</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {filteredSessions.map((session) => (

                  <tr key={session.id}>

                    {/* VEHICLE */}

                    <td>
                      <div className="vehicle-cell">

                        <div className="vehicle-icon">
                          <Car size={18} />
                        </div>

                        <div>
                          <strong>
                            {session.vehicle?.license_plate ||
                              "—"}
                          </strong>

                          <span>
                            {session.vehicle?.make || ""}
                            {session.vehicle?.model
                              ? ` ${session.vehicle.model}`
                              : ""}
                          </span>
                        </div>

                      </div>
                    </td>

                    {/* CUSTOMER */}

                    <td>
                      <div className="customer-cell">

                        <strong>
                          {session.vehicle?.customer?.name ||
                            "—"}
                        </strong>

                        <span>
                          {session.vehicle?.customer?.phone ||
                            "—"}
                        </span>

                      </div>
                    </td>

                    {/* TICKET */}

                    <td>
                      <div className="ticket-cell">
                        <FileText size={13} />

                        <span className="ticket-code">
                          {session.ticket_code || "—"}
                        </span>
                      </div>
                    </td>

                    {/* TYPE */}

                    <td>
                      <span className="parking-type-badge">
                        {getParkingTypeLabel(
                          session.parking_type
                        )}
                      </span>
                    </td>

                    {/* SLOT */}

                    <td>
                      <div className="slot-cell">

                        <ParkingSquare size={14} />

                        <strong>
                          {session.parking_slot ||
                            "Not assigned"}
                        </strong>

                      </div>
                    </td>

                    {/* VALET */}

                    <td>
                      <div className="valet-cell">

                        {session.valet?.name ? (
                          <>
                            <div className="valet-avatar">
                              <UserRound size={13} />
                            </div>

                            <span>
                              {session.valet.name}
                            </span>
                          </>
                        ) : (
                          <span className="not-assigned">
                            Not assigned
                          </span>
                        )}

                      </div>
                    </td>

                    {/* STATUS */}

                    <td>
                      <span
                        className={`session-status ${getStatusClass(
                          session.status
                        )}`}
                      >
                        {getStatusIcon(session.status)}

                        {getStatusLabel(session.status)}
                      </span>
                    </td>

                    {/* ACTION */}

                    <td>
                      <div className="session-action-cell">

                        <button
                          className="view-session-button"
                          onClick={() =>
                            setSelectedSession(session)
                          }
                        >
                          View
                        </button>

                        {renderAction(session)}

                      </div>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* ========================================================
          SESSION DETAILS MODAL
      ======================================================== */}

      {selectedSession && (
        <div
          className="session-modal-overlay"
          onClick={() => setSelectedSession(null)}
        >

          <div
            className="session-modal"
            onClick={(e) => e.stopPropagation()}
          >

            {/* MODAL HEADER */}

            <div className="session-modal-header">

              <div className="modal-title-section">

                <div className="modal-title-icon">
                  <ClipboardList size={20} />
                </div>

                <div>
                  <p>SESSION DETAILS</p>

                  <h2>
                    {selectedSession.ticket_code ||
                      "Parking Session"}
                  </h2>
                </div>

              </div>

              <button
                className="session-modal-close"
                onClick={() => setSelectedSession(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>

            </div>

            {/* STATUS */}

            <div className="session-modal-status">

              <span
                className={`session-status ${getStatusClass(
                  selectedSession.status
                )}`}
              >
                {getStatusIcon(selectedSession.status)}

                {getStatusLabel(selectedSession.status)}
              </span>

            </div>

            {/* DETAILS */}

            <div className="session-details-grid">

              <div className="detail-item">
                <span>
                  <Car size={13} />
                  Vehicle
                </span>

                <strong>
                  {selectedSession.vehicle?.license_plate ||
                    "—"}
                </strong>
              </div>

              <div className="detail-item">
                <span>
                  <UserRound size={13} />
                  Customer
                </span>

                <strong>
                  {selectedSession.vehicle?.customer?.name ||
                    "—"}
                </strong>
              </div>

              <div className="detail-item">
                <span>
                  <LogIn size={13} />
                  Phone
                </span>

                <strong>
                  {selectedSession.vehicle?.customer?.phone ||
                    "—"}
                </strong>
              </div>

              <div className="detail-item">
                <span>
                  <ParkingSquare size={13} />
                  Parking Type
                </span>

                <strong>
                  {getParkingTypeLabel(
                    selectedSession.parking_type
                  )}
                </strong>
              </div>

              <div className="detail-item">
                <span>
                  <CircleParking size={13} />
                  Parking Slot
                </span>

                <strong>
                  {selectedSession.parking_slot ||
                    "Not assigned"}
                </strong>
              </div>

              <div className="detail-item">
                <span>
                  <UserRound size={13} />
                  Valet
                </span>

                <strong>
                  {selectedSession.valet?.name ||
                    "Not assigned"}
                </strong>
              </div>

              <div className="detail-item">
                <span>
                  <Clock3 size={13} />
                  Checked In
                </span>

                <strong>
                  {formatDateTime(
                    selectedSession.checked_in_at
                  )}
                </strong>
              </div>

              <div className="detail-item">
                <span>
                  <ParkingSquare size={13} />
                  Parked At
                </span>

                <strong>
                  {formatDateTime(
                    selectedSession.parked_at
                  )}
                </strong>
              </div>

              <div className="detail-item">
                <span>
                  <CheckCircle2 size={13} />
                  Completed At
                </span>

                <strong>
                  {formatDateTime(
                    selectedSession.completed_at
                  )}
                </strong>
              </div>

            </div>

            {/* ASSIGN SLOT */}

            {selectedSession.status === "checked_in" && (
              <div className="assign-slot-section">

                <div className="assign-slot-header">
                  <div>
                    <h3>Assign Parking Slot</h3>

                    <p>
                      Select an available slot for this vehicle.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="slot-refresh-button"
                    onClick={fetchAvailableSlots}
                    disabled={loadingSlots}
                  >
                    <RefreshCw
                      size={14}
                      className={loadingSlots ? "spin-icon" : ""}
                    />
                  </button>
                </div>

                {loadingSlots ? (
                  <div className="slots-loading">
                    <Loader2
                      size={20}
                      className="spin-icon"
                    />

                    <span>
                      Loading available slots...
                    </span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="no-slots-message">
                    <AlertCircle size={18} />

                    <span>
                      No parking slots are currently available.
                    </span>
                  </div>
                ) : (
                  <div className="available-slots-grid">

                    {availableSlots.map((slot) => (

                      <button
                        type="button"
                        key={slot.id}
                        className={`available-slot ${selectedSlot === slot.slot_number
                            ? "selected"
                            : ""
                          }`}
                        onClick={() =>
                          setSelectedSlot(slot.slot_number)
                        }
                      >

                        <CircleParking size={20} />

                        <strong>
                          {slot.slot_number}
                        </strong>

                        <span>
                          {slot.parking_type}
                        </span>

                      </button>

                    ))}

                  </div>
                )}

              </div>
            )}

            {/* ACTIONS */}

            <div className="session-modal-actions">

              {selectedSession.status === "checked_in" ? (
                <button
                  className="session-action primary"
                  disabled={
                    !selectedSlot ||
                    actionLoading === selectedSession.id
                  }
                  onClick={handleAssignSlot}
                >
                  {actionLoading === selectedSession.id ? (
                    <>
                      <Loader2
                        size={15}
                        className="spin-icon"
                      />

                      Assigning...
                    </>
                  ) : (
                    <>
                      <CircleParking size={15} />

                      Assign Slot
                    </>
                  )}
                </button>
              ) : (
                renderAction(selectedSession)
              )}

              <button
                className="session-close-button"
                onClick={() => {
                  setSelectedSession(null);
                  setSelectedSlot("");
                  setAvailableSlots([]);
                }}
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================
          CHECK-IN MODAL
      ======================================================== */}

      {showCheckIn && (
        <div
          className="session-modal-overlay"
          onClick={() => setShowCheckIn(false)}
        >

          <div
            className="check-in-modal"
            onClick={(e) => e.stopPropagation()}
          >

            {/* HEADER */}

            <div className="session-modal-header">

              <div className="modal-title-section">

                <div className="modal-title-icon">
                  <LogIn size={20} />
                </div>

                <div>
                  <p>NEW PARKING SESSION</p>

                  <h2>
                    Check In Vehicle
                  </h2>
                </div>

              </div>

              <button
                className="session-modal-close"
                onClick={() => setShowCheckIn(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>

            </div>

            {/* FORM */}

            <form onSubmit={handleCheckIn}>

              <div className="check-in-form-body">

                <div className="check-in-form-group">

                  <label>
                    Vehicle ID
                  </label>

                  <div className="input-with-icon">

                    <Car size={16} />

                    <input
                      type="text"
                      placeholder="Enter vehicle UUID"
                      value={checkInForm.vehicle_id}
                      onChange={(e) =>
                        setCheckInForm({
                          ...checkInForm,
                          vehicle_id: e.target.value,
                        })
                      }
                      required
                    />

                  </div>

                  <small>
                    The vehicle must already exist in the system.
                  </small>

                </div>

                <div className="check-in-form-group">

                  <label>
                    Parking Type
                  </label>

                  <div className="input-with-icon">

                    <ParkingSquare size={16} />

                    <select
                      value={checkInForm.parking_type}
                      onChange={(e) =>
                        setCheckInForm({
                          ...checkInForm,
                          parking_type: e.target.value,
                        })
                      }
                    >
                      <option value="valet">
                        Valet
                      </option>

                      <option value="self">
                        Self
                      </option>
                    </select>

                  </div>

                </div>

                <div className="check-in-form-group">

                  <label>
                    Ticket Code
                  </label>

                  <div className="input-with-icon">

                    <FileText size={16} />

                    <input
                      type="text"
                      placeholder="e.g. VP-1001"
                      value={checkInForm.ticket_code}
                      onChange={(e) =>
                        setCheckInForm({
                          ...checkInForm,
                          ticket_code: e.target.value,
                        })
                      }
                      required
                    />

                  </div>

                </div>

              </div>

              {/* FORM ACTIONS */}

              <div className="check-in-form-actions">

                <button
                  type="button"
                  className="session-close-button"
                  onClick={() => setShowCheckIn(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="check-in-submit"
                  disabled={actionLoading === "check-in"}
                >
                  {actionLoading === "check-in" ? (
                    <>
                      <Loader2
                        size={15}
                        className="spin-icon"
                      />

                      Checking In...
                    </>
                  ) : (
                    <>
                      <LogIn size={15} />

                      Check In Vehicle
                    </>
                  )}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
};

export default ParkingSessions;
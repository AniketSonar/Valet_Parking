import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Car,
  CheckCircle2,
  Clock3,
  KeyRound,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
  UserRound,
  Warehouse,
  X,
  Play,
} from "lucide-react";

import {
  getValetDashboard,
  getValetParkingSlots,
  assignParkingSlot,
  startRetrieval,
  markReadyForPickup,
  completeReturn,
} from "../../api/parkingApi";

import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import "./css/ValetDashboard.css";

const STATUS_LABELS = {
  checked_in: "Checked In",
  parked: "Parked",
  retrieval_requested: "Retrieval Requested",
  retrieving: "Retrieving",
  ready_for_pickup: "Ready for Pickup",
  returned_completed: "Completed",
};

const formatStatus = (status) =>
  STATUS_LABELS[status] ||
  status?.replaceAll("_", " ") ||
  "Unknown";

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getCustomer = (session) =>
  Array.isArray(session?.vehicle?.customer)
    ? session.vehicle.customer[0]
    : session?.vehicle?.customer;

const getVehicle = (session) =>
  Array.isArray(session?.vehicle)
    ? session.vehicle[0]
    : session?.vehicle;

function ValetDashboard() {
  const [valet, setValet] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [retrievalRequests, setRetrievalRequests] = useState([]);

  const [slots, setSlots] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState("");

  const [slotModalSession, setSlotModalSession] = useState(null);
  const [confirmationSession, setConfirmationSession] = useState(null);

  const [actionLoading, setActionLoading] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  const loadDashboard = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const response = await getValetDashboard();

      setValet(response?.valet || null);
      setDashboard(response?.dashboard || {});
      setSessions(response?.sessions || []);
      setRetrievalRequests(response?.retrieval_requests || []);
    } catch (err) {
      console.error("Failed to load valet dashboard:", err);

      setError(
        err?.message ||
          "Unable to load valet dashboard. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadSlots = useCallback(async () => {
    try {
      const response = await getValetParkingSlots();

      const data = response?.slots || [];

      setSlots(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load parking slots:", err);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadSlots();
  }, [loadDashboard, loadSlots]);

  useRealtimeSync({
    tables: ["parking_sessions", "parking_slots", "retrieval_requests"],
    onUpdate: () => {
      loadDashboard(false);
      loadSlots();
    },
    interval: 3500,
  });

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 3500);

    return () => clearTimeout(timer);
  }, [successMessage]);

  const handleRefresh = async () => {
    await Promise.all([
      loadDashboard(false),
      loadSlots(),
    ]);
  };

  const availableSlots = useMemo(() => {
    return slots.filter((slot) => {
      const status = String(
        slot?.status || ""
      ).toLowerCase();

      return (
        status === "available" ||
        status === "free" ||
        status === "vacant"
      );
    });
  }, [slots]);

  const filteredSessions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return sessions;

    return sessions.filter((session) => {
      const vehicle = getVehicle(session);
      const customer = getCustomer(session);

      return [
        session?.ticket_code,
        session?.parking_slot,
        session?.status,
        vehicle?.license_plate,
        vehicle?.make,
        vehicle?.model,
        vehicle?.color,
        customer?.name,
        customer?.phone,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(term)
        );
    });
  }, [sessions, searchTerm]);

  const performAction = async (
    session,
    action,
    actionFunction,
    successText
  ) => {
    try {
      setActionLoading(`${action}-${session.id}`);
      setError("");
      setSuccessMessage("");

      await actionFunction(session.id);

      setSuccessMessage(successText);

      await loadDashboard(false);
      await loadSlots();
    } catch (err) {
      console.error(`Valet action failed: ${action}`, err);

      setError(
        err?.message ||
          `Unable to ${action.replaceAll("-", " ")}.`
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignSlot = async () => {
    if (!slotModalSession || !selectedSlot) {
      setError("Please select an available parking slot.");
      return;
    }

    try {
      setActionLoading(
        `assign-slot-${slotModalSession.id}`
      );

      setError("");
      setSuccessMessage("");

      await assignParkingSlot(
        slotModalSession.id,
        selectedSlot
      );

      setSuccessMessage(
        `Parking slot ${selectedSlot} assigned successfully.`
      );

      setSlotModalSession(null);
      setSelectedSlot("");

      await loadDashboard(false);
      await loadSlots();
    } catch (err) {
      console.error("Slot assignment failed:", err);

      setError(
        err?.message ||
          "Unable to assign the parking slot."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const stats = [
    {
      label: "Assigned Vehicles",
      value: dashboard?.assigned_vehicles ?? 0,
      icon: Car,
      className: "stat-blue",
    },
    {
      label: "Parked Vehicles",
      value: dashboard?.parked_vehicles ?? 0,
      icon: Warehouse,
      className: "stat-purple",
    },
    {
      label: "Retrieval Requests",
      value: dashboard?.retrieval_requests ?? 0,
      icon: Clock3,
      className: "stat-orange",
    },
    {
      label: "Retrieving Vehicles",
      value: dashboard?.retrieving_vehicles ?? 0,
      icon: RefreshCw,
      className: "stat-cyan",
    },
    {
      label: "Ready for Pickup",
      value: dashboard?.ready_for_pickup ?? 0,
      icon: PackageCheck,
      className: "stat-green",
    },
    {
      label: "Completed Returns",
      value: dashboard?.completed_returns ?? 0,
      icon: CheckCircle2,
      className: "stat-indigo",
    },
  ];

  if (loading) {
    return (
      <div className="valet-page valet-loading-page">
        <div className="valet-loader">
          <RefreshCw size={30} className="spin" />
          <p>Loading valet dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="valet-page">
      <header className="valet-header">
        <div>
          <div className="valet-breadcrumb">
            AURA <span>/</span> Valet Dashboard
          </div>

          <h1>
            Welcome, {valet?.name || "Valet"}
          </h1>

          <p>
            Manage your assigned vehicles and complete
            retrieval tasks efficiently.
          </p>
        </div>

        <div className="valet-header-actions">
          <div className="valet-role-badge">
            <UserRound size={15} />
            Valet
          </div>

          <button
            className="valet-refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh dashboard"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "spin" : ""}
            />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="valet-alert valet-alert-error">
          <div>
            <strong>Something went wrong</strong>
            <span>{error}</span>
          </div>

          <button onClick={() => setError("")}>
            <X size={17} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="valet-alert valet-alert-success">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>

          <button onClick={() => setSuccessMessage("")}>
            <X size={17} />
          </button>
        </div>
      )}

      <section className="valet-stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              className={`valet-stat-card ${stat.className}`}
              key={stat.label}
            >
              <div className="valet-stat-icon">
                <Icon size={21} />
              </div>

              <div className="valet-stat-content">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            </div>
          );
        })}
      </section>

      <section className="valet-main-section">
        <div className="valet-section-heading">
          <div>
            <h2>My Assigned Vehicles</h2>
            <p>
              Vehicles currently assigned to you.
            </p>
          </div>

          <div className="valet-search">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search vehicle, customer or ticket..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
            />
          </div>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="valet-empty-state">
            <div className="valet-empty-icon">
              <Car size={28} />
            </div>

            <h3>
              {searchTerm
                ? "No vehicles found"
                : "No assigned vehicles"}
            </h3>

            <p>
              {searchTerm
                ? "Try a different search term."
                : "You currently have no active vehicles assigned to you."}
            </p>
          </div>
        ) : (
          <div className="valet-task-grid">
            {filteredSessions.map((session) => {
              const vehicle = getVehicle(session);
              const customer = getCustomer(session);

              const isLoading =
                actionLoading &&
                String(actionLoading).endsWith(String(session.id));

              return (
                <article
                  className="valet-task-card"
                  key={session.id}
                >
                  <div className="task-card-top">
                    <div className="vehicle-icon">
                      <Car size={23} />
                    </div>

                    <div className="vehicle-heading">
                      <h3>
                        {vehicle?.make || "Vehicle"}{" "}
                        {vehicle?.model || ""}
                      </h3>

                      <span className="vehicle-plate">
                        {vehicle?.license_plate ||
                          "Plate unavailable"}
                      </span>
                    </div>

                    <span
                      className={`status-pill status-${session.status}`}
                    >
                      {formatStatus(session.status)}
                    </span>
                  </div>

                  <div className="task-details">
                    <div className="task-detail">
                      <UserRound size={16} />
                      <div>
                        <span>Customer</span>
                        <strong>
                          {customer?.name || "Unavailable"}
                        </strong>
                      </div>
                    </div>

                    <div className="task-detail">
                      <Phone size={16} />
                      <div>
                        <span>Phone</span>
                        <strong>
                          {customer?.phone || "Unavailable"}
                        </strong>
                      </div>
                    </div>

                    <div className="task-detail">
                      <MapPin size={16} />
                      <div>
                        <span>Parking Slot</span>
                        <strong>
                          {session?.parking_slot || "Not assigned"}
                        </strong>
                      </div>
                    </div>

                    <div className="task-detail">
                      <KeyRound size={16} />
                      <div>
                        <span>Key</span>
                        <strong>Unavailable</strong>
                      </div>
                    </div>
                  </div>

                  <div className="task-meta">
                    <div>
                      <span>Ticket</span>
                      <strong>
                        {session?.ticket_code || "—"}
                      </strong>
                    </div>

                    <div>
                      <span>Parking Type</span>
                      <strong>
                        {session?.parking_type || "—"}
                      </strong>
                    </div>

                    <div>
                      <span>Checked In</span>
                      <strong>
                        {formatDateTime(
                          session?.checked_in_at
                        )}
                      </strong>
                    </div>

                    {session?.parked_at && (
                      <div>
                        <span>Parked</span>
                        <strong>
                          {formatDateTime(
                            session.parked_at
                          )}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="task-card-actions">
                    <button
                      className="secondary-action"
                      onClick={() =>
                        setSelectedSession(session)
                      }
                    >
                      View Details
                    </button>

                    {session.status === "checked_in" && (
                      <button
                        className="primary-action"
                        onClick={() => {
                          setSlotModalSession(session);
                          setSelectedSlot("");
                        }}
                        disabled={isLoading}
                      >
                        <MapPin size={16} />
                        Assign Slot
                      </button>
                    )}

                    {session.status ===
                      "retrieval_requested" && (
                      <button
                        className="primary-action"
                        onClick={() =>
                          performAction(
                            session,
                            "start-retrieval",
                            startRetrieval,
                            "Vehicle retrieval started."
                          )
                        }
                        disabled={isLoading}
                      >
                        <Play size={16} />
                        {isLoading
                          ? "Starting..."
                          : "Start Retrieval"}
                      </button>
                    )}

                    {session.status === "retrieving" && (
                      <button
                        className="primary-action"
                        onClick={() =>
                          performAction(
                            session,
                            "mark-ready",
                            markReadyForPickup,
                            "Vehicle marked ready for pickup."
                          )
                        }
                        disabled={isLoading}
                      >
                        <PackageCheck size={16} />
                        {isLoading
                          ? "Updating..."
                          : "Mark Ready for Pickup"}
                      </button>
                    )}

                    {session.status ===
                      "ready_for_pickup" && (
                      <button
                        className="primary-action"
                        onClick={() =>
                          setConfirmationSession(session)
                        }
                        disabled={isLoading}
                      >
                        <CheckCircle2 size={16} />
                        {isLoading
                          ? "Completing..."
                          : "Complete Return"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="valet-main-section">
        <div className="valet-section-heading">
          <div>
            <h2>Retrieval Requests</h2>
            <p>
              Vehicles requested by customers for pickup.
            </p>
          </div>

          <span className="section-count">
            {retrievalRequests.length}
          </span>
        </div>

        {retrievalRequests.length === 0 ? (
          <div className="valet-empty-state compact">
            <div className="valet-empty-icon">
              <Clock3 size={25} />
            </div>

            <h3>No retrieval requests</h3>

            <p>
              There are no vehicles waiting for retrieval.
            </p>
          </div>
        ) : (
          <div className="retrieval-list">
            {retrievalRequests.map((session) => {
              const vehicle = getVehicle(session);
              const customer = getCustomer(session);

              const isLoading =
                actionLoading?.endsWith(session.id);

              return (
                <div
                  className="retrieval-row"
                  key={session.id}
                >
                  <div className="retrieval-vehicle">
                    <div className="vehicle-icon small">
                      <Car size={19} />
                    </div>

                    <div>
                      <strong>
                        {vehicle?.license_plate ||
                          "Plate unavailable"}
                      </strong>

                      <span>
                        {vehicle?.make || ""}{" "}
                        {vehicle?.model || ""}
                      </span>
                    </div>
                  </div>

                  <div className="retrieval-customer">
                    <span>Customer</span>
                    <strong>
                      {customer?.name || "Unavailable"}
                    </strong>
                  </div>

                  <div className="retrieval-slot">
                    <span>Slot</span>
                    <strong>
                      {session?.parking_slot || "—"}
                    </strong>
                  </div>

                  <div className="retrieval-ticket">
                    <span>Ticket</span>
                    <strong>
                      {session?.ticket_code || "—"}
                    </strong>
                  </div>

                  <button
                    className="primary-action"
                    onClick={() =>
                      performAction(
                        session,
                        "start-retrieval",
                        startRetrieval,
                        "Vehicle retrieval started."
                      )
                    }
                    disabled={isLoading}
                  >
                    <Play size={15} />
                    {isLoading
                      ? "Starting..."
                      : "Start Retrieval"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="valet-profile-strip">
        <div className="profile-avatar">
          {(valet?.name || "V")
            .charAt(0)
            .toUpperCase()}
        </div>

        <div className="profile-info">
          <strong>
            {valet?.name || "Valet"}
          </strong>

          <span>
            {valet?.email || "—"}
          </span>
        </div>

        <div className="profile-detail">
          <span>Phone</span>
          <strong>
            {valet?.phone || "Unavailable"}
          </strong>
        </div>

        <div className="profile-detail">
          <span>Role</span>
          <strong>Valet</strong>
        </div>

        <div className="profile-detail">
          <span>Account</span>
          <strong>
            {valet?.is_active
              ? "Active"
              : "Inactive"}
          </strong>
        </div>
      </section>

      {slotModalSession && (
        <div
          className="valet-modal-overlay"
          onClick={() => {
            setSlotModalSession(null);
            setSelectedSlot("");
          }}
        >
          <div
            className="valet-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2>Assign Parking Slot</h2>
                <p>
                  Select an available slot for{" "}
                  {getVehicle(slotModalSession)
                    ?.license_plate || "this vehicle"}.
                </p>
              </div>

              <button
                onClick={() => {
                  setSlotModalSession(null);
                  setSelectedSlot("");
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="slot-selection-grid">
              {availableSlots.length === 0 ? (
                <div className="no-slots">
                  <MapPin size={24} />
                  <strong>
                    No available parking slots
                  </strong>
                  <span>
                    Please wait for a slot to become
                    available.
                  </span>
                </div>
              ) : (
                availableSlots.map((slot) => {
                  const slotNumber =
                    slot?.slot_number ??
                    slot?.slotNumber ??
                    slot?.number ??
                    slot?.id;

                  const selected =
                    String(selectedSlot) ===
                    String(slotNumber);

                  return (
                    <button
                      key={slot.id || slotNumber}
                      className={`slot-option ${
                        selected ? "selected" : ""
                      }`}
                      onClick={() =>
                        setSelectedSlot(slotNumber)
                      }
                    >
                      <MapPin size={17} />
                      <span>
                        Slot {slotNumber}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="modal-actions">
              <button
                className="secondary-action"
                onClick={() => {
                  setSlotModalSession(null);
                  setSelectedSlot("");
                }}
              >
                Cancel
              </button>

              <button
                className="primary-action"
                onClick={handleAssignSlot}
                disabled={
                  !selectedSlot ||
                  actionLoading ===
                    `assign-slot-${slotModalSession.id}`
                }
              >
                {actionLoading ===
                `assign-slot-${slotModalSession.id}`
                  ? "Assigning..."
                  : "Assign Slot"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSession && (
        <div
          className="valet-modal-overlay"
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="valet-modal details-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2>Vehicle Details</h2>
                <p>
                  Complete information for the assigned
                  vehicle.
                </p>
              </div>

              <button
                onClick={() => setSelectedSession(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-status">
              <span
                className={`status-pill status-${selectedSession.status}`}
              >
                {formatStatus(selectedSession.status)}
              </span>
            </div>

            <div className="details-section">
              <h3>Vehicle</h3>

              <div className="details-grid">
                <div>
                  <span>License Plate</span>
                  <strong>
                    {getVehicle(selectedSession)
                      ?.license_plate || "Unavailable"}
                  </strong>
                </div>

                <div>
                  <span>Make</span>
                  <strong>
                    {getVehicle(selectedSession)?.make ||
                      "Unavailable"}
                  </strong>
                </div>

                <div>
                  <span>Model</span>
                  <strong>
                    {getVehicle(selectedSession)?.model ||
                      "Unavailable"}
                  </strong>
                </div>

                <div>
                  <span>Color</span>
                  <strong>
                    {getVehicle(selectedSession)?.color ||
                      "Unavailable"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="details-section">
              <h3>Customer</h3>

              <div className="details-grid">
                <div>
                  <span>Name</span>
                  <strong>
                    {getCustomer(selectedSession)?.name ||
                      "Unavailable"}
                  </strong>
                </div>

                <div>
                  <span>Phone</span>
                  <strong>
                    {getCustomer(selectedSession)?.phone ||
                      "Unavailable"}
                  </strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>
                    {getCustomer(selectedSession)?.email ||
                      "Unavailable"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="details-section">
              <h3>Parking Session</h3>

              <div className="details-grid">
                <div>
                  <span>Ticket</span>
                  <strong>
                    {selectedSession.ticket_code || "—"}
                  </strong>
                </div>

                <div>
                  <span>Parking Type</span>
                  <strong>
                    {selectedSession.parking_type || "—"}
                  </strong>
                </div>

                <div>
                  <span>Parking Slot</span>
                  <strong>
                    {selectedSession.parking_slot ||
                      "Not assigned"}
                  </strong>
                </div>

                <div>
                  <span>Checked In</span>
                  <strong>
                    {formatDateTime(
                      selectedSession.checked_in_at
                    )}
                  </strong>
                </div>

                <div>
                  <span>Parked At</span>
                  <strong>
                    {formatDateTime(
                      selectedSession.parked_at
                    )}
                  </strong>
                </div>
              </div>
            </div>

            <div className="details-section key-section">
              <h3>Key Information</h3>

              <div className="key-unavailable">
                <KeyRound size={20} />
                <div>
                  <strong>Key information unavailable</strong>
                  <span>
                    No key number or key status is currently
                    provided by the backend.
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="secondary-action"
                onClick={() =>
                  setSelectedSession(null)
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmationSession && (
        <div
          className="valet-modal-overlay"
          onClick={() => setConfirmationSession(null)}
        >
          <div
            className="valet-modal confirmation-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Complete Return?</h2>
                <p>
                  Confirm that {getVehicle(confirmationSession)?.license_plate || "this vehicle"} has been returned to the customer.
                </p>
              </div>

              <button onClick={() => setConfirmationSession(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-actions">
              <button
                className="secondary-action"
                onClick={() => setConfirmationSession(null)}
              >
                Cancel
              </button>

              <button
                className="primary-action"
                onClick={() => {
                  const session = confirmationSession;
                  setConfirmationSession(null);
                  performAction(
                    session,
                    "complete-return",
                    completeReturn,
                    "Vehicle return completed successfully."
                  );
                }}
                disabled={Boolean(actionLoading)}
              >
                {actionLoading ? "Completing..." : "Complete Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ValetDashboard;
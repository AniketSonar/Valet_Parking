
import { useCallback, useEffect, useMemo, useState } from "react";
import "./css/VehicleOperations.css";
import apiClient from "../../api/apiClient";

import { Car,
  Check,
  Wrench,
  MoveUpRight

 } from 'lucide-react';

// ============================================================
// STATUS HELPERS
// ============================================================

const getStatusLabel = (status) => {
  switch (status) {
    case "checked_in":
      return "Checked In";

    case "parked":
      return "Parked";

    case "retrieval_requested":
      return "Retrieval Requested";

    case "retrieving":
      return "Retrieving";

    case "ready_for_pickup":
      return "Ready for Pickup";

    case "returned_completed":
      return "Completed";

    default:
      return status || "Unknown";
  }
};

const getStatusClass = (status) => {
  switch (status) {
    case "checked_in":
      return "status-processing";

    case "parked":
      return "status-active";

    case "retrieval_requested":
      return "status-warning";

    case "retrieving":
      return "status-processing";

    case "ready_for_pickup":
      return "status-active";

    case "returned_completed":
      return "status-active";

    default:
      return "";
  }
};

// ============================================================
// DATE / TIME HELPERS
// ============================================================

const formatDateTime = (dateString) => {
  if (!dateString) {
    return "N/A";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (dateString) => {
  if (!dateString) {
    return "N/A";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// ============================================================
// COMPONENT
// ============================================================

function VehiclesOperations() {
  // ==========================================================
  // STATE
  // ==========================================================

  const [vehicles, setVehicles] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const [assigningVehicle, setAssigningVehicle] = useState(null);

  const [selectedValet, setSelectedValet] = useState("");

  const [valets, setValets] = useState([]);

  const [loading, setLoading] = useState(true);

  const [operationLoading, setOperationLoading] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

  const [error, setError] = useState("");

  // ==========================================================
  // FETCH PARKING SESSIONS
  // ==========================================================

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiClient(
        "/api/parking-admin/sessions"
      );

      setVehicles(data.sessions || []);
    } catch (err) {
      console.error("Fetch parking sessions error:", err);

      setError(
        err.message ||
          "Failed to load vehicles and parking sessions."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================
  // FETCH VALETS
  // ==========================================================

  const fetchValets = useCallback(async () => {
    try {
      const data = await apiClient(
        "/api/parking-admin/staff"
      );

      const parkingStaff = data.staff || [];

      const valetStaff = parkingStaff.filter(
        (staff) =>
          staff.role === "valet" &&
          staff.is_active === true
      );

      setValets(valetStaff);
    } catch (err) {
      console.error("Fetch valet staff error:", err);

      // Do not block the entire page if staff loading fails.
      setValets([]);
    }
  }, []);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    fetchVehicles();
    fetchValets();
  }, [fetchVehicles, fetchValets]);

  // ==========================================================
  // CLEAR SUCCESS MESSAGE
  // ==========================================================

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 4000);

    return () => clearTimeout(timer);
  }, [successMessage]);

  // ==========================================================
  // COUNTS
  // ==========================================================

  const totalVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status !== "returned_completed"
  ).length;

  const checkedInVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status === "checked_in"
  ).length;

  const parkedVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status === "parked"
  ).length;

  const retrievalRequests = vehicles.filter(
    (vehicle) =>
      vehicle.status === "retrieval_requested"
  ).length;

  const retrievingVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status === "retrieving"
  ).length;

  const readyForPickupVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status === "ready_for_pickup"
  ).length;

  // ==========================================================
  // FILTER
  // ==========================================================

  const filteredVehicles = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return vehicles.filter((vehicle) => {
      const vehicleNumber =
        vehicle.vehicle?.license_plate?.toLowerCase() || "";

      const customerName =
        vehicle.vehicle?.customer?.name?.toLowerCase() || "";

      const customerPhone =
        vehicle.vehicle?.customer?.phone?.toLowerCase() || "";

      const parkingSlot =
        vehicle.parking_slot?.toLowerCase() || "";

      const valetName =
        vehicle.valet?.name?.toLowerCase() || "";

      const ticketCode =
        vehicle.ticket_code?.toLowerCase() || "";

      const matchesSearch =
        !search ||
        vehicleNumber.includes(search) ||
        customerName.includes(search) ||
        customerPhone.includes(search) ||
        parkingSlot.includes(search) ||
        valetName.includes(search) ||
        ticketCode.includes(search);

      const matchesStatus =
        statusFilter === "all" ||
        vehicle.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [
    vehicles,
    searchTerm,
    statusFilter,
  ]);

  // ==========================================================
  // VIEW VEHICLE
  // ==========================================================

  const handleViewVehicle = (vehicle) => {
    setError("");
    setSelectedVehicle(vehicle);
  };

  // ==========================================================
  // OPEN ASSIGN VALET
  // ==========================================================

  const handleOpenAssign = (vehicle) => {
    setError("");

    setAssigningVehicle(vehicle);

    setSelectedValet(
      vehicle.valet?.id || ""
    );
  };

  // ==========================================================
  // ASSIGN VALET
  // ==========================================================

  const handleAssignValet = async () => {
  if (!assigningVehicle) {
    return;
  }

  if (!selectedValet) {
    setError("Please select a valet before assigning.");
    return;
  }

  console.log("ASSIGN VALET REQUEST", {
    sessionId: assigningVehicle.id,
    valetId: selectedValet,
    vehicle: assigningVehicle
  });

  try {
    setOperationLoading(true);
    setError("");

    const data = await apiClient(
      `/api/parking-admin/sessions/${assigningVehicle.id}/valet`,
      {
        method: "PATCH",
        body: JSON.stringify({
          valet_id: selectedValet
        })
      }
    );

    console.log("ASSIGN VALET RESPONSE", data);

    setSuccessMessage(
      data.message || "Valet assigned successfully."
    );

    setAssigningVehicle(null);
    setSelectedValet("");

    await fetchVehicles();
  } catch (err) {
    console.error("ASSIGN VALET ERROR", err);

    setError(
      err.message || "Failed to assign valet."
    );
  } finally {
    setOperationLoading(false);
  }
};

  // ==========================================================
  // STATUS API ACTION
  // ==========================================================

  const updateVehicleStatus = async (
    vehicleId,
    action
  ) => {
    let endpoint;
    let successFallback;

    switch (action) {
      case "request-retrieval":
        endpoint =
          `/api/parking-admin/sessions/${vehicleId}/request-retrieval`;

        successFallback =
          "Vehicle retrieval requested successfully.";
        break;

      case "start-retrieval":
        endpoint =
          `/api/parking-admin/sessions/${vehicleId}/start-retrieval`;

        successFallback =
          "Vehicle retrieval started.";
        break;

      case "ready":
        endpoint =
          `/api/parking-admin/sessions/${vehicleId}/ready`;

        successFallback =
          "Vehicle is ready for pickup.";
        break;

      case "complete":
        endpoint =
          `/api/parking-admin/sessions/${vehicleId}/complete`;

        successFallback =
          "Vehicle return completed successfully.";
        break;

      default:
        return;
    }

    try {
      setOperationLoading(true);
      setError("");

      const data = await apiClient(
        endpoint,
        {
          method: "PATCH",
        }
      );

      setSuccessMessage(
        data.message || successFallback
      );

      await fetchVehicles();

      // Update selected vehicle if modal is open.
      if (selectedVehicle?.id === vehicleId) {
        const updatedVehicle = data.session;

        if (updatedVehicle) {
          setSelectedVehicle((previous) => ({
            ...previous,
            ...updatedVehicle,
          }));
        } else {
          setSelectedVehicle(null);
        }
      }
    } catch (err) {
      console.error(
        "Update vehicle status error:",
        err
      );

      setError(
        err.message ||
          "Failed to update vehicle status."
      );
    } finally {
      setOperationLoading(false);
    }
  };

  // ==========================================================
  // CLOSE VIEW MODAL
  // ==========================================================

  const closeViewModal = () => {
    setSelectedVehicle(null);
  };

  // ==========================================================
  // VEHICLE DATA HELPERS
  // ==========================================================

  const getVehicleNumber = (vehicle) =>
    vehicle?.vehicle?.license_plate ||
    "N/A";

  const getCustomerName = (vehicle) =>
    vehicle?.vehicle?.customer?.name ||
    "N/A";

  const getCustomerPhone = (vehicle) =>
    vehicle?.vehicle?.customer?.phone ||
    "N/A";

  const getCustomerEmail = (vehicle) =>
    vehicle?.vehicle?.customer?.email ||
    "N/A";

  const getValetName = (vehicle) =>
    vehicle?.valet?.name ||
    "Unassigned";

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="parking-page">

      {/* ======================================================
          SUCCESS MESSAGE
      ====================================================== */}

      {successMessage && (
        <div className="parking-success-message">
          <span>✓</span>

          <span>
            {successMessage}
          </span>

          <button
            onClick={() =>
              setSuccessMessage("")
            }
          >
            ×
          </button>
        </div>
      )}

      {/* ======================================================
          ERROR MESSAGE
      ====================================================== */}

      {error && (
        <div className="parking-error-message">
          <span>!</span>

          <span>
            {error}
          </span>

          <button
            onClick={() =>
              setError("")
            }
          >
            ×
          </button>
        </div>
      )}

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="parking-page-header">

        <div>

          <p className="parking-eyebrow">
            PARKING OPERATIONS
          </p>

          <h1>
            Vehicles & Operations
          </h1>

          <p>
            Monitor vehicles currently inside the
            parking facility.
          </p>

        </div>

        <button
          className="create-staff-btn"
          onClick={() => {
            fetchVehicles();
            fetchValets();
          }}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>

      </div>

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div className="parking-summary-grid">

        <div className="parking-summary-card">

          <div className="parking-summary-icon">
            <Car />
          </div>

          <div>
            <span>
              Vehicles Inside
            </span>

            <strong>
              {totalVehicles}
            </strong>
          </div>

        </div>

        <div className="parking-summary-card available">

          <div className="parking-summary-icon">
            <Check />
          </div>

          <div>
            <span>
              Currently Parked
            </span>

            <strong>
              {parkedVehicles}
            </strong>
          </div>

        </div>

        <div className="parking-summary-card maintenance">

          <div className="parking-summary-icon">
            <Wrench />
          </div>

          <div>
            <span>
              Retrieval Requests
            </span>

            <strong>
              {retrievalRequests}
            </strong>
          </div>

        </div>

        <div className="parking-summary-card occupied">

          <div className="parking-summary-icon">
            <MoveUpRight />
          </div>

          <div>
            <span>
              Currently Retrieving
            </span>

            <strong>
              {retrievingVehicles}
            </strong>
          </div>

        </div>

      </div>

      {/* ======================================================
          ADDITIONAL STATUS SUMMARY
      ====================================================== */}

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <span>
          Checked In:{" "}
          <strong>
            {checkedInVehicles}
          </strong>
        </span>

        <span>
          Ready for Pickup:{" "}
          <strong>
            {readyForPickupVehicles}
          </strong>
        </span>
      </div>

      {/* ======================================================
          TABLE
      ====================================================== */}

      <section className="parking-table-card">

        <div className="parking-toolbar">

          <div className="parking-search">

            <span>
              ⌕
            </span>

            <input
              type="text"
              placeholder="Search vehicle, customer, slot or valet..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(
                  e.target.value
                )
              }
            />

          </div>

          <div className="parking-filters">

            <select
              className="parking-filter"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
            >

              <option value="all">
                All Status
              </option>

              <option value="checked_in">
                Checked In
              </option>

              <option value="parked">
                Parked
              </option>

              <option value="retrieval_requested">
                Retrieval Requested
              </option>

              <option value="retrieving">
                Retrieving
              </option>

              <option value="ready_for_pickup">
                Ready for Pickup
              </option>

            </select>

          </div>

        </div>

        {/* LOADING */}

        {loading ? (

          <div
            className="parking-empty"
            style={{
              padding: "60px",
              textAlign: "center",
            }}
          >
            <div>
              <strong>
                Loading vehicles...
              </strong>

              <span>
                Fetching current parking operations.
              </span>
            </div>
          </div>

        ) : (

          <div className="parking-table-wrapper">

            <table className="parking-table">

              <thead>

                <tr>

                  <th>
                    VEHICLE
                  </th>

                  <th>
                    CUSTOMER
                  </th>

                  <th>
                    PARKING SLOT
                  </th>

                  <th>
                    CHECK-IN
                  </th>

                  <th>
                    STATUS
                  </th>

                  <th>
                    ASSIGNED VALET
                  </th>

                  <th>
                    ACTIONS
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredVehicles.length === 0 && (

                  <tr>

                    <td
                      colSpan="7"
                      className="parking-empty"
                    >

                      <div>

                        <strong>
                          No vehicles found
                        </strong>

                        <span>
                          Try changing your search
                          or filter.
                        </span>

                      </div>

                    </td>

                  </tr>

                )}

                {filteredVehicles.map(
                  (vehicle) => (

                    <tr
                      key={vehicle.id}
                    >

                      {/* VEHICLE */}

                      <td>

                        <div className="vehicle-cell">

                          <div className="vehicle-icon">
                           <Car />
                          </div>

                          <div>

                            <strong>
                              {getVehicleNumber(
                                vehicle
                              )}
                            </strong>

                            <span>
                              Ticket:{" "}
                              {vehicle.ticket_code ||
                                "N/A"}
                            </span>

                          </div>

                        </div>

                      </td>

                      {/* CUSTOMER */}

                      <td>

                        <div className="customer-cell">

                          <strong>
                            {getCustomerName(
                              vehicle
                            )}
                          </strong>

                          <span>
                            {getCustomerPhone(
                              vehicle
                            )}
                          </span>

                        </div>

                      </td>

                      {/* SLOT */}

                      <td>

                        {vehicle.parking_slot ? (

                          <span className="slot-badge">
                            {vehicle.parking_slot}
                          </span>

                        ) : (

                          <span className="unassigned-valet">
                            Not Assigned
                          </span>

                        )}

                      </td>

                      {/* CHECK-IN */}

                      <td>

                        <span className="checkin-time">
                          {formatTime(
                            vehicle.checked_in_at
                          )}
                        </span>

                      </td>

                      {/* STATUS */}

                      <td>

                        <span
                          className={`status-badge ${getStatusClass(
                            vehicle.status
                          )}`}
                        >

                          <span className="status-dot"></span>

                          {getStatusLabel(
                            vehicle.status
                          )}

                        </span>

                      </td>

                      {/* VALET */}

                      <td>

                        {vehicle.valet ? (

                          <div className="valet-cell">

                            <div className="valet-avatar">

                              {vehicle.valet.name
                                ?.split(" ")
                                .map(
                                  (word) =>
                                    word[0]
                                )
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}

                            </div>

                            <span>
                              {vehicle.valet.name}
                            </span>

                          </div>

                        ) : (

                          <span className="unassigned-valet">
                            Unassigned
                          </span>

                        )}

                      </td>

                      {/* ACTIONS */}

                      <td>

                        <div className="parking-actions">

                          <button
                            className="parking-action view"
                            onClick={() =>
                              handleViewVehicle(
                                vehicle
                              )
                            }
                          >
                            View
                          </button>

                          <button
                            className="parking-action edit"
                            onClick={() =>
                              handleOpenAssign(
                                vehicle
                              )
                            }
                            disabled={
                              operationLoading
                            }
                          >
                            {vehicle.valet
                              ? "Change Valet"
                              : "Assign Valet"}
                          </button>

                        </div>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

        {/* FOOTER */}

        <div className="parking-table-footer">

          <span>

            Showing{" "}

            <strong>
              {filteredVehicles.length}
            </strong>{" "}

            of{" "}

            <strong>
              {
                vehicles.filter(
                  (vehicle) =>
                    vehicle.status !==
                    "returned_completed"
                ).length
              }
            </strong>

            {" "}active vehicles

          </span>

        </div>

      </section>

      {/* ======================================================
          VIEW VEHICLE MODAL
      ====================================================== */}

      {selectedVehicle && (

        <div
          className="modal-overlay"
          onClick={closeViewModal}
        >

          <div
            className="parking-modal vehicle-details-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <p className="modal-eyebrow">
                  VEHICLE OPERATIONS
                </p>

                <h2>
                  Vehicle Details
                </h2>

                <p>
                  View current parking information.
                </p>

              </div>

              <button
                className="modal-close"
                onClick={closeViewModal}
              >
                ×
              </button>

            </div>

            {/* VEHICLE PROFILE */}

            <div className="vehicle-profile">

              <div className="large-vehicle-icon">
                🚗
              </div>

              <div>

                <h3>
                  {getVehicleNumber(
                    selectedVehicle
                  )}
                </h3>

                <p>
                  {getCustomerName(
                    selectedVehicle
                  )}
                </p>

              </div>

            </div>

            {/* DETAILS */}

            <div className="vehicle-details-grid">

              <div className="vehicle-detail-item">

                <span>
                  Customer
                </span>

                <strong>
                  {getCustomerName(
                    selectedVehicle
                  )}
                </strong>

              </div>

              <div className="vehicle-detail-item">

                <span>
                  Contact Number
                </span>

                <strong>
                  {getCustomerPhone(
                    selectedVehicle
                  )}
                </strong>

              </div>

              <div className="vehicle-detail-item">

                <span>
                  Email
                </span>

                <strong>
                  {getCustomerEmail(
                    selectedVehicle
                  )}
                </strong>

              </div>

              <div className="vehicle-detail-item">

                <span>
                  Parking Slot
                </span>

                <strong>
                  {selectedVehicle.parking_slot ||
                    "Not Assigned"}
                </strong>

              </div>

              <div className="vehicle-detail-item">

                <span>
                  Ticket Code
                </span>

                <strong>
                  {selectedVehicle.ticket_code ||
                    "N/A"}
                </strong>

              </div>

              <div className="vehicle-detail-item">

                <span>
                  Parking Type
                </span>

                <strong>
                  {selectedVehicle.parking_type ||
                    "N/A"}
                </strong>

              </div>

              <div className="vehicle-detail-item">

                <span>
                  Check-in Time
                </span>

                <strong>
                  {formatDateTime(
                    selectedVehicle.checked_in_at
                  )}
                </strong>

              </div>

              <div className="vehicle-detail-item">

                <span>
                  Parked At
                </span>

                <strong>
                  {formatDateTime(
                    selectedVehicle.parked_at
                  )}
                </strong>

              </div>

              <div className="vehicle-detail-item">

                <span>
                  Assigned Valet
                </span>

                <strong>
                  {getValetName(
                    selectedVehicle
                  )}
                </strong>

              </div>

              <div className="vehicle-detail-item">

                <span>
                  Vehicle
                </span>

                <strong>
                  {selectedVehicle.vehicle?.make ||
                    ""}{" "}
                  {selectedVehicle.vehicle?.model ||
                    ""}
                </strong>

              </div>

              <div className="vehicle-detail-item">

                <span>
                  Color
                </span>

                <strong>
                  {selectedVehicle.vehicle?.color ||
                    "N/A"}
                </strong>

              </div>

              <div className="vehicle-detail-item">

                <span>
                  Current Status
                </span>

                <span
                  className={`status-badge ${getStatusClass(
                    selectedVehicle.status
                  )}`}
                >

                  <span className="status-dot"></span>

                  {getStatusLabel(
                    selectedVehicle.status
                  )}

                </span>

              </div>

            </div>

            {/* OPERATIONS */}

            <div className="form-group">

              <label>
                Parking Operation
              </label>

              <select
                value=""
                onChange={(e) => {

                  const action =
                    e.target.value;

                  if (!action) {
                    return;
                  }

                  updateVehicleStatus(
                    selectedVehicle.id,
                    action
                  );

                }}
                disabled={
                  operationLoading
                }
              >

                <option value="">
                  Select an operation
                </option>

                {selectedVehicle.status ===
                  "parked" && (

                  <option value="request-retrieval">
                    Request Retrieval
                  </option>

                )}

                {selectedVehicle.status ===
                  "retrieval_requested" && (

                  <option value="start-retrieval">
                    Start Retrieval
                  </option>

                )}

                {selectedVehicle.status ===
                  "retrieving" && (

                  <option value="ready">
                    Mark Ready for Pickup
                  </option>

                )}

                {selectedVehicle.status ===
                  "ready_for_pickup" && (

                  <option value="complete">
                    Complete Return
                  </option>

                )}

              </select>

            </div>

            {/* FOOTER */}

            <div className="modal-actions">

              <button
                className="cancel-btn"
                onClick={closeViewModal}
                disabled={
                  operationLoading
                }
              >
                Close
              </button>

              <button
                className="create-staff-btn"
                onClick={() => {

                  closeViewModal();

                  handleOpenAssign(
                    selectedVehicle
                  );

                }}
                disabled={
                  operationLoading
                }
              >
                {selectedVehicle.valet
                  ? "Change Valet"
                  : "Assign Valet"}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* ======================================================
          ASSIGN VALET MODAL
      ====================================================== */}

      {assigningVehicle && (

        <div
          className="modal-overlay"
          onClick={() =>
            !operationLoading &&
            setAssigningVehicle(null)
          }
        >

          <div
            className="parking-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <p className="modal-eyebrow">
                  VALET ASSIGNMENT
                </p>

                <h2>
                  Assign Valet
                </h2>

                <p>
                  Assign an operational valet to this vehicle.
                </p>

              </div>

              <button
                className="modal-close"
                onClick={() =>
                  !operationLoading &&
                  setAssigningVehicle(null)
                }
                disabled={
                  operationLoading
                }
              >
                ×
              </button>

            </div>

            {/* VEHICLE */}

            <div className="assignment-preview">

              <div className="vehicle-icon">
                🚗
              </div>

              <div>

                <strong>
                  {getVehicleNumber(
                    assigningVehicle
                  )}
                </strong>

                <span>
                  {getCustomerName(
                    assigningVehicle
                  )}
                </span>

                <span>
                  Slot{" "}
                  {assigningVehicle.parking_slot ||
                    "Not Assigned"}
                </span>

              </div>

            </div>

            {/* VALET */}

            <div className="form-group">

              <label>
                Select Valet
              </label>

              <select
                value={selectedValet}
                onChange={(e) =>
                  setSelectedValet(
                    e.target.value
                  )
                }
                disabled={
                  operationLoading
                }
              >

                <option value="">
                  Select an available valet
                </option>

                {valets.map(
                  (valet) => (

                    <option
                      key={valet.id}
                      value={valet.id}
                    >
                      {valet.name}
                      {valet.phone
                        ? ` · ${valet.phone}`
                        : ""}
                    </option>

                  )
                )}

              </select>

              {valets.length === 0 && (
                <small>
                  No active valets are currently available.
                </small>
              )}

            </div>

            {/* INFO */}

            <div className="parking-role-info">

              <div>
                i
              </div>

              <p>
                The assigned valet will be responsible
                for handling this vehicle during the
                parking or retrieval operation.
              </p>

            </div>

            {/* ACTIONS */}

            <div className="modal-actions">

              <button
                className="cancel-btn"
                onClick={() =>
                  setAssigningVehicle(null)
                }
                disabled={
                  operationLoading
                }
              >
                Cancel
              </button>

              <button
                className="create-staff-btn"
                onClick={
                  handleAssignValet
                }
                disabled={
                  operationLoading ||
                  !selectedValet
                }
              >
                {operationLoading
                  ? "Assigning..."
                  : "Assign Valet"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default VehiclesOperations;


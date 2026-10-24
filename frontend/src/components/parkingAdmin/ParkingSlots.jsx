import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  RefreshCw,
  Search,
  Settings2,
  X,
  Plus,
  CircleParking,
  Loader2,
  CheckCircle2,
  UserCheck,
  Phone,
  Clock,
  Key,
  ShieldAlert,
  Car as CarIcon,
  Ticket,
} from "lucide-react";

import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import "./css/ParkingSlots.css";
import apiClient from "../../api/apiClient";

const CarSVG = ({ className = "" }) => (
  <svg
    className={`parking-car-svg ${className}`}
    viewBox="0 0 52 94"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="carBodyGradient" x1="26" y1="3" x2="26" y2="91">
        <stop offset="0" stopColor="#F8F9FC" />
        <stop offset="0.42" stopColor="#D9DDE5" />
        <stop offset="0.72" stopColor="#AEB4BF" />
        <stop offset="1" stopColor="#8C929D" />
      </linearGradient>

      <linearGradient id="carGlassGradient" x1="26" y1="17" x2="26" y2="47">
        <stop offset="0" stopColor="#6F7785" />
        <stop offset="0.5" stopColor="#3D4552" />
        <stop offset="1" stopColor="#202733" />
      </linearGradient>

      <linearGradient id="carHighlight" x1="11" y1="0" x2="41" y2="0">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.25" />
        <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.8" />
        <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.15" />
      </linearGradient>

      <filter
        id="carShadow"
        x="-60%"
        y="-20%"
        width="220%"
        height="150%"
      >
        <feDropShadow
          dx="0"
          dy="4"
          stdDeviation="3.5"
          floodColor="#111827"
          floodOpacity="0.28"
        />
      </filter>
    </defs>

    <g filter="url(#carShadow)">
      <path
        d="M17.2 4C12.6 4.8 10.2 9.2 9.2 15.4L5.4 39C4.8 43.2 4.8 50.8 5.4 55L9.2 78.6C10.2 84.8 12.6 89.2 17.2 90C20.5 90.7 31.5 90.7 34.8 90C39.4 89.2 41.8 84.8 42.8 78.6L46.6 55C47.2 50.8 47.2 43.2 46.6 39L42.8 15.4C41.8 9.2 39.4 4.8 34.8 4C31.5 3.3 20.5 3.3 17.2 4Z"
        fill="url(#carBodyGradient)"
        stroke="#7C828D"
        strokeWidth="1"
      />

      <path
        d="M15 19C16.1 13.5 19.2 10.2 26 10.2C32.8 10.2 35.9 13.5 37 19L40.2 35.8C40.7 38.5 38.7 40.8 36 40.8H16C13.3 40.8 11.3 38.5 11.8 35.8L15 19Z"
        fill="url(#carGlassGradient)"
        stroke="#8D94A0"
        strokeWidth="0.8"
      />

      <path
        d="M13.2 30.2H38.8"
        stroke="#AEB4BE"
        strokeOpacity="0.42"
        strokeWidth="1"
      />

      <path
        d="M12.4 53.2C13.1 49.8 15.7 47.5 19.1 47.5H32.9C36.3 47.5 38.9 49.8 39.6 53.2L41.4 63.6C41.8 66 40 68.2 37.5 68.2H14.5C12 68.2 10.2 66 10.6 63.6L12.4 53.2Z"
        fill="#4A5260"
        stroke="#8D94A0"
        strokeWidth="0.8"
      />

      <path
        d="M17 17.2C19.5 14.2 22.2 13 26 13"
        stroke="white"
        strokeOpacity="0.42"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      <path
        d="M15.5 54.5C17.8 51.8 20.2 50.6 23.4 50.6"
        stroke="white"
        strokeOpacity="0.18"
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      <path
        d="M7.4 28.2C4.8 27.6 3.4 29.2 3.6 31.5L4.2 34.2L8.1 33.4L8.5 29.4Z"
        fill="#8A909A"
      />

      <path
        d="M44.6 28.2C47.2 27.6 48.6 29.2 48.4 31.5L47.8 34.2L43.9 33.4L43.5 29.4Z"
        fill="#8A909A"
      />

      <path
        d="M9.8 43H42.2"
        stroke="#737A86"
        strokeOpacity="0.38"
        strokeWidth="0.8"
      />

      <path
        d="M10.8 71H41.2"
        stroke="#737A86"
        strokeOpacity="0.32"
        strokeWidth="0.8"
      />

      <path
        d="M17 6.8C20.3 6.2 31.7 6.2 35 6.8"
        stroke="url(#carHighlight)"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      <path
        d="M17 87.2C20.3 87.8 31.7 87.8 35 87.2"
        stroke="#626873"
        strokeOpacity="0.5"
        strokeWidth="1"
        strokeLinecap="round"
      />

      <rect
        x="11"
        y="13.2"
        width="5"
        height="3"
        rx="1.5"
        fill="#F4F5F7"
      />

      <rect
        x="36"
        y="13.2"
        width="5"
        height="3"
        rx="1.5"
        fill="#F4F5F7"
      />

      <rect
        x="11.4"
        y="76"
        width="4.5"
        height="3"
        rx="1.5"
        fill="#D95C64"
      />

      <rect
        x="36.1"
        y="76"
        width="4.5"
        height="3"
        rx="1.5"
        fill="#D95C64"
      />
    </g>
  </svg>
);

const ParkingBay = ({ slot, selected, onClick }) => {
  const status = String(slot.status || "available").toLowerCase();

  const isOccupied = status === "occupied";
  const isMaintenance = status === "maintenance";
  const isRetrieval = status === "retrieval";
  const isReady = status === "ready";
  const isReserved = status === "reserved";
  const isCharging = status === "charging";

  return (
    <button
      type="button"
      className={[
        "target-parking-slot",
        status,
        selected ? "selected" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onClick(slot)}
      aria-label={`Parking slot ${slot.slot_number}, ${status}`}
      aria-pressed={selected}
    >
      <span className="slot-number">{slot.slot_number}</span>

      <span
        className={`slot-status-dot ${status}`}
        aria-hidden="true"
      />

      <div className="slot-space">
        {isOccupied ||
        isRetrieval ||
        isReady ||
        isReserved ||
        isCharging ? (
          <CarSVG />
        ) : isMaintenance ? (
          <div className="slot-maintenance-mark">
            <Settings2 size={18} strokeWidth={1.7} />
          </div>
        ) : (
          <span className="slot-empty-space" aria-hidden="true" />
        )}
      </div>

      {slot.assigned_vehicle && (
        <span className="slot-vehicle-number">
          {slot.assigned_vehicle}
        </span>
      )}

      {isRetrieval && (
        <span className="slot-state-badge retrieval">
          Retrieving
        </span>
      )}

      {isReady && (
        <span className="slot-state-badge ready">
          Ready
        </span>
      )}

      {isReserved && (
        <span className="slot-state-badge reserved">
          Reserved
        </span>
      )}

      {isCharging && (
        <span className="slot-state-badge charging">
          Charging
        </span>
      )}
    </button>
  );
};

const getZoneName = (zone) => {
  const normalized = String(zone || "").toUpperCase();

  if (normalized === "A") return "Zone A";
  if (normalized === "B") return "Zone B";
  if (normalized === "C") return "Zone C";
  if (normalized === "D") return "Zone D";
  if (normalized === "VIP") return "VIP";
  if (normalized === "EV") return "EV";
  if (normalized === "ACCESSIBLE") return "Accessible";

  return zone || "Zone";
};

const getZoneKey = (slot) => {
  const raw = String(slot?.zone || "").trim();

  if (raw) {
    return raw.toUpperCase() === "ACCESSIBLE"
      ? "Accessible"
      : raw.toUpperCase();
  }

  const slotNumber = String(slot?.slot_number || "");
  const match = slotNumber.match(/^[A-Za-z]+/);

  return match?.[0]?.toUpperCase() || "A";
};

const getSlotNumber = (slot) => {
  const value = String(slot?.slot_number || "");

  return parseInt(value.replace(/\D/g, ""), 10) || 0;
};

const ParkingSlots = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [activeZone, setActiveZone] = useState("all");

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState("");

  const [showAddSlot, setShowAddSlot] = useState(false);
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [createSlotError, setCreateSlotError] = useState("");
  const [createSlotSuccess, setCreateSlotSuccess] = useState("");
  const [newSlot, setNewSlot] = useState({
    slot_number: "",
    parking_type: "car",
  });

  const fetchSlots = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");

      const response = await apiClient("/api/parking-slots");

      if (!response || response.success !== true) {
        throw new Error(
          response?.message || "Failed to fetch parking slots."
        );
      }

      const fetchedSlots = Array.isArray(response.slots)
        ? response.slots
        : [];

      setSlots(fetchedSlots);
    } catch (err) {
      console.error("Fetch parking slots error:", err);

      if (!silent) {
        setError(
          err?.message || "Failed to fetch parking slots."
        );
      }

      setSlots([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useRealtimeSync({
    tables: ["parking_slots", "parking_sessions"],
    onUpdate: () => {
      fetchSlots(true);
    },
    interval: 3500,
  });

  const availableZones = useMemo(() => {
    const zoneMap = new Map();

    slots.forEach((slot) => {
      const key = getZoneKey(slot);

      if (!zoneMap.has(key)) {
        zoneMap.set(key, {
          key,
          label: getZoneName(key),
        });
      }
    });

    const preferredOrder = [
      "A",
      "B",
      "C",
      "D",
      "VIP",
      "EV",
      "Accessible",
    ];

    return [...zoneMap.values()].sort((a, b) => {
      const indexA = preferredOrder.indexOf(a.key);
      const indexB = preferredOrder.indexOf(b.key);

      if (indexA === -1 && indexB === -1) {
        return a.label.localeCompare(b.label);
      }

      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });
  }, [slots]);

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
    setSelectedStatus(slot.status || "available");
    setStatusUpdateError("");
  };

  const handleStatusUpdate = async () => {
    if (!selectedSlot || !selectedStatus) return;

    if (selectedStatus === selectedSlot.status) {
      setSelectedSlot(null);
      return;
    }

    try {
      setUpdatingStatus(true);
      setStatusUpdateError("");

      const response = await apiClient(
        `/api/parking-slots/${selectedSlot.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: selectedStatus,
          }),
        }
      );

      if (!response || response.success !== true) {
        throw new Error(
          response?.message ||
            "Failed to update parking slot status."
        );
      }

      setSlots((currentSlots) =>
        currentSlots.map((slot) =>
          slot.id === selectedSlot.id
            ? {
                ...slot,
                status: selectedStatus,
              }
            : slot
        )
      );

      setSelectedSlot(null);
    } catch (err) {
      console.error("Update slot status error:", err);

      setStatusUpdateError(
        err?.message ||
          "Failed to update parking slot status."
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCreateSlot = async (event) => {
    event.preventDefault();

    const slotNumber = newSlot.slot_number.trim().toUpperCase();

    if (!slotNumber) {
      setCreateSlotError("Enter a parking slot number.");
      return;
    }

    const exists = slots.some(
      (slot) =>
        String(slot.slot_number || "").trim().toUpperCase() ===
        slotNumber
    );

    if (exists) {
      setCreateSlotError(
        `${slotNumber} already exists. Please choose another slot number.`
      );
      return;
    }

    try {
      setCreatingSlot(true);
      setCreateSlotError("");
      setCreateSlotSuccess("");

      const response = await apiClient("/api/parking-slots", {
        method: "POST",
        body: JSON.stringify({
          slot_number: slotNumber,
          parking_type: newSlot.parking_type,
        }),
      });

      if (!response || response.success !== true) {
        throw new Error(
          response?.message || "Failed to create parking slot."
        );
      }

      setCreateSlotSuccess(
        `${slotNumber} has been added successfully.`
      );

      setNewSlot({
        slot_number: "",
        parking_type: "car",
      });

      await fetchSlots();

      setTimeout(() => {
        setShowAddSlot(false);
        setCreateSlotSuccess("");
      }, 900);
    } catch (err) {
      console.error("Create parking slot error:", err);

      setCreateSlotError(
        err?.message || "Failed to create parking slot."
      );
    } finally {
      setCreatingSlot(false);
    }
  };

  const openAddSlotModal = () => {
    setCreateSlotError("");
    setCreateSlotSuccess("");
    setNewSlot({
      slot_number: "",
      parking_type: "car",
    });
    setShowAddSlot(true);
  };

  const closeAddSlotModal = () => {
    if (creatingSlot) return;

    setShowAddSlot(false);
    setCreateSlotError("");
    setCreateSlotSuccess("");
  };

  const filteredSlots = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return slots.filter((slot) => {
      const slotNumber = String(
        slot.slot_number || ""
      ).toLowerCase();

      const vehicle = String(
        slot.assigned_vehicle || ""
      ).toLowerCase();

      const customer = String(
        slot.customer_name || ""
      ).toLowerCase();

      const parkingType = String(
        slot.parking_type || "car"
      ).toLowerCase();

      const zone = getZoneKey(slot);

      const matchesSearch =
        !searchTerm ||
        slotNumber.includes(searchTerm) ||
        vehicle.includes(searchTerm) ||
        customer.includes(searchTerm);

      const matchesStatus =
        statusFilter === "all" ||
        String(slot.status || "").toLowerCase() ===
          statusFilter.toLowerCase();

      const matchesZone =
        zoneFilter === "all" ||
        zone.toLowerCase() ===
          zoneFilter.toLowerCase();

      const matchesActiveZone =
        activeZone === "all" ||
        zone.toLowerCase() ===
          activeZone.toLowerCase();

      const matchesType =
        parkingType === "car" ||
        parkingType === "ev" ||
        parkingType === "accessible";

      return (
        matchesSearch &&
        matchesStatus &&
        matchesZone &&
        matchesActiveZone &&
        matchesType
      );
    });
  }, [
    slots,
    search,
    statusFilter,
    zoneFilter,
    activeZone,
  ]);

  const parkingRows = useMemo(() => {
    const sorted = [...filteredSlots].sort(
      (a, b) =>
        getSlotNumber(a) - getSlotNumber(b)
    );

    const groups = [];

    for (let i = 0; i < sorted.length; i += 7) {
      groups.push(sorted.slice(i, i + 7));
    }

    return groups;
  }, [filteredSlots]);

  const slotCounts = useMemo(() => {
    return {
      total: filteredSlots.length,

      available: filteredSlots.filter(
        (slot) => slot.status === "available"
      ).length,

      occupied: filteredSlots.filter(
        (slot) => slot.status === "occupied"
      ).length,

      maintenance: filteredSlots.filter(
        (slot) => slot.status === "maintenance"
      ).length,
    };
  }, [filteredSlots]);

  const formatStatus = (status) => {
    if (!status) return "Unknown";

    return String(status)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) =>
        char.toUpperCase()
      );
  };

  return (
    <div className="parking-slots-page">
      <div className="parking-slots-page-header">
        <div className="parking-slots-heading">
          <span className="parking-slots-eyebrow">
            FACILITY MAP
          </span>

          <h1>Parking Slots</h1>

          <p>
            Manage and monitor parking availability
            in real time.
          </p>
        </div>

        <div className="parking-slots-header-actions">
          <button
            type="button"
            className="parking-add-slot-button"
            onClick={openAddSlotModal}
          >
            <Plus size={16} />
            Add Parking Slot
          </button>
        </div>
      </div>

      <div className="parking-slots-controls">
        <div className="parking-slots-search">
          <Search size={16} />

          <input
            type="text"
            placeholder="Search slot, vehicle or customer..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

          {search && (
            <button
              type="button"
              className="parking-search-clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="parking-slots-filters">
          <div className="parking-select-wrap">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="reserved">Reserved</option>
              <option value="retrieval">Retrieval</option>
              <option value="ready">Ready</option>
              <option value="maintenance">
                Maintenance
              </option>
              <option value="charging">Charging</option>
            </select>

            <ChevronDown size={14} />
          </div>

          <div className="parking-select-wrap">
            <select
              value={zoneFilter}
              onChange={(event) =>
                setZoneFilter(event.target.value)
              }
            >
              <option value="all">All Zones</option>

              {availableZones.map((zone) => (
                <option
                  key={zone.key}
                  value={zone.key}
                >
                  {zone.label}
                </option>
              ))}
            </select>

            <ChevronDown size={14} />
          </div>

          <button
            type="button"
            className="parking-slots-refresh"
            onClick={fetchSlots}
            disabled={loading}
          >
            <RefreshCw
              size={14}
              className={
                loading
                  ? "parking-refresh-spin"
                  : ""
              }
            />

            <span>
              {loading
                ? "Refreshing..."
                : "Refresh"}
            </span>
          </button>
        </div>
      </div>

      {availableZones.length > 0 && (
        <div className="parking-zone-tabs">
          <button
            type="button"
            className={
              activeZone === "all"
                ? "parking-zone-tab active"
                : "parking-zone-tab"
            }
            onClick={() => setActiveZone("all")}
          >
            All
          </button>

          {availableZones.map((zone) => (
            <button
              key={zone.key}
              type="button"
              className={
                activeZone === zone.key
                  ? "parking-zone-tab active"
                  : "parking-zone-tab"
              }
              onClick={() =>
                setActiveZone(zone.key)
              }
            >
              {zone.label}
            </button>
          ))}
        </div>
      )}

      <div className="parking-map-legend">
        <span className="legend-label">
          STATUS
        </span>

        <span className="legend-item">
          <span className="legend-dot available" />
          Available
        </span>

        <span className="legend-item">
          <span className="legend-dot occupied" />
          Occupied
        </span>

        <span className="legend-item">
          <span className="legend-dot retrieval" />
          Retrieval
        </span>

        <span className="legend-item">
          <span className="legend-dot maintenance" />
          Maintenance
        </span>
      </div>

      <div className="parking-layout-card">
        <div className="parking-card-header">
          <div>
            <div className="parking-card-title-row">
              <h2>
                {activeZone === "all"
                  ? "Parking Layout"
                  : getZoneName(activeZone)}
              </h2>

              <span className="parking-card-live-dot" />
            </div>

            <p>
              {slotCounts.total} parking slot
              {slotCounts.total !== 1
                ? "s"
                : ""}{" "}
              displayed
            </p>
          </div>

          <div className="parking-summary">
            <span className="parking-summary-item available">
              <strong>
                {slotCounts.available}
              </strong>
              <span>Available</span>
            </span>

            <span className="parking-summary-item occupied">
              <strong>
                {slotCounts.occupied}
              </strong>
              <span>Occupied</span>
            </span>

            <span className="parking-summary-item maintenance">
              <strong>
                {slotCounts.maintenance}
              </strong>
              <span>Maintenance</span>
            </span>
          </div>
        </div>

        {loading && (
          <div className="parking-slots-loading">
            <div className="parking-loading-spinner" />

            <span>
              Loading facility layout...
            </span>
          </div>
        )}

        {!loading && error && (
          <div className="parking-slots-error">
            <strong>
              Unable to load parking layout
            </strong>

            <span>{error}</span>

            <button
              type="button"
              onClick={fetchSlots}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          filteredSlots.length === 0 && (
            <div className="parking-slots-empty">
              <strong>
                No parking slots found
              </strong>

              <span>
                Try changing your filters or
                search criteria.
              </span>

              <button
                type="button"
                onClick={openAddSlotModal}
              >
                <Plus size={14} />
                Add Parking Slot
              </button>
            </div>
          )}

        {!loading &&
          !error &&
          filteredSlots.length > 0 && (
            <div className="parking-map">
              <div className="parking-map-road-label top">
                <span className="road-arrow">
                  ↓
                </span>

                <span>ENTRANCE</span>
              </div>

              <div className="parking-map-frame">
                <div className="parking-map-inner">
                  <div className="parking-row-label-column">
                    <span>ROW</span>
                  </div>

                  <div className="parking-rows">
                    {parkingRows.map(
                      (rowSlots, rowIndex) => (
                        <React.Fragment
                          key={`row-${rowIndex}`}
                        >
                          <div className="parking-row-grid">
                            {rowSlots.map(
                              (slot) => (
                                <ParkingBay
                                  key={slot.id}
                                  slot={slot}
                                  selected={
                                    selectedSlot?.id ===
                                    slot.id
                                  }
                                  onClick={
                                    handleSlotClick
                                  }
                                />
                              )
                            )}

                            {rowSlots.length < 7 &&
                              Array.from({
                                length:
                                  7 -
                                  rowSlots.length,
                              }).map(
                                (_, index) => (
                                  <div
                                    key={`empty-${index}`}
                                    className="parking-empty-cell"
                                    aria-hidden="true"
                                  />
                                )
                              )}
                          </div>

                          {rowIndex <
                            parkingRows.length -
                              1 && (
                            <div className="parking-central-driveway">
                              <div className="driveway-line" />

                              <span>
                                DRIVEWAY
                              </span>

                              <div className="driveway-line" />
                            </div>
                          )}
                        </React.Fragment>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="parking-map-road-label bottom">
                <span>EXIT</span>

                <span className="road-arrow">
                  ↓
                </span>
              </div>
            </div>
          )}
      </div>

      {selectedSlot && (
        <div
          className="parking-slot-modal-overlay"
          onClick={() =>
            !updatingStatus &&
            setSelectedSlot(null)
          }
        >
          <div
            className="parking-slot-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="parking-slot-modal-header">
              <div>
                <p>SLOT MANAGEMENT</p>

                <h2>
                  {selectedSlot.slot_number}
                </h2>
              </div>

              <button
                type="button"
                className="parking-slot-modal-close"
                onClick={() =>
                  setSelectedSlot(null)
                }
                disabled={updatingStatus}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <div className="parking-slot-preview">
              <div
                className={`modal-slot-preview ${String(
                  selectedSlot.status || ""
                ).toLowerCase()}`}
              >
                <span>
                  {selectedSlot.slot_number}
                </span>

                {selectedSlot.assigned_vehicle ? (
                  <CarSVG />
                ) : (
                  <span className="modal-empty-slot">
                    Available
                  </span>
                )}
              </div>

              <div className="parking-slot-preview-info">
                <span>Current status</span>

                <strong>
                  {formatStatus(
                    selectedSlot.status
                  )}
                </strong>

                {selectedSlot.assigned_vehicle && (
                  <small>
                    {
                      selectedSlot.assigned_vehicle
                    }
                  </small>
                )}
              </div>
            </div>

            <div className="parking-slot-details">
              {/* In-Charge Valet Personnel Card (Featured Prominently) */}
              <div className="slot-incharge-card">
                <div className="incharge-header">
                  <div className="incharge-avatar">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <span className="incharge-badge">PERSON IN CHARGE</span>
                    <h4>{selectedSlot.incharge_valet_name || selectedSlot.valet || "Unassigned"}</h4>
                  </div>
                </div>

                {selectedSlot.incharge_valet_phone && (
                  <div className="incharge-phone">
                    <Phone size={14} />
                    <span>{selectedSlot.incharge_valet_phone}</span>
                  </div>
                )}
                {!selectedSlot.incharge_valet_phone && (
                  <span className="incharge-subtext">
                    {selectedSlot.assigned_vehicle
                      ? "Assigned Valet Attendant for this vehicle"
                      : "No vehicle currently parked in this slot"}
                  </span>
                )}
              </div>

              <div className="slot-detail-grid">
                <div className="slot-detail-item">
                  <span>Parking Type</span>
                  <strong>
                    {selectedSlot.parking_type
                      ? selectedSlot.parking_type.charAt(0).toUpperCase() +
                        selectedSlot.parking_type.slice(1)
                      : "Car"}
                  </strong>
                </div>

                <div className="slot-detail-item">
                  <span>Slot Zone</span>
                  <strong>{getZoneName(getZoneKey(selectedSlot))}</strong>
                </div>

                {selectedSlot.session_ticket && (
                  <div className="slot-detail-item">
                    <span>Ticket #</span>
                    <strong className="ticket-badge">{selectedSlot.session_ticket}</strong>
                  </div>
                )}

                {selectedSlot.assigned_vehicle && (
                  <div className="slot-detail-item">
                    <span>License Plate</span>
                    <strong className="plate-badge">{selectedSlot.assigned_vehicle}</strong>
                  </div>
                )}

                {(selectedSlot.vehicle_make || selectedSlot.vehicle_model) && (
                  <div className="slot-detail-item">
                    <span>Car Model</span>
                    <strong>
                      {selectedSlot.vehicle_make} {selectedSlot.vehicle_model}{" "}
                      {selectedSlot.vehicle_color ? `(${selectedSlot.vehicle_color})` : ""}
                    </strong>
                  </div>
                )}

                {selectedSlot.customer_name && (
                  <div className="slot-detail-item">
                    <span>Customer</span>
                    <strong>{selectedSlot.customer_name}</strong>
                  </div>
                )}

                {selectedSlot.customer_phone && (
                  <div className="slot-detail-item">
                    <span>Customer Phone</span>
                    <strong>{selectedSlot.customer_phone}</strong>
                  </div>
                )}

                {selectedSlot.parked_at && (
                  <div className="slot-detail-item">
                    <span>Parked Since</span>
                    <strong>{new Date(selectedSlot.parked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="parking-status-section">
              <div className="parking-status-heading">
                <span>Change status</span>

                <small>
                  Select a new operational state
                </small>
              </div>

              <div className="parking-status-options">
                <button
                  type="button"
                  className={`parking-status-option available ${
                    selectedStatus ===
                    "available"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedStatus(
                      "available"
                    )
                  }
                  disabled={updatingStatus}
                >
                  <span className="status-option-icon available">
                    <span />
                  </span>

                  <span>Available</span>
                </button>

                <button
                  type="button"
                  className={`parking-status-option occupied ${
                    selectedStatus ===
                    "occupied"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedStatus(
                      "occupied"
                    )
                  }
                  disabled={updatingStatus}
                >
                  <span className="status-option-icon occupied">
                    <CarSVG />
                  </span>

                  <span>Occupied</span>
                </button>

                <button
                  type="button"
                  className={`parking-status-option maintenance ${
                    selectedStatus ===
                    "maintenance"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedStatus(
                      "maintenance"
                    )
                  }
                  disabled={updatingStatus}
                >
                  <span className="status-option-icon maintenance">
                    <Settings2 size={17} />
                  </span>

                  <span>Maintenance</span>
                </button>
              </div>

              {statusUpdateError && (
                <div className="parking-status-update-error">
                  {statusUpdateError}
                </div>
              )}
            </div>

            <div className="parking-slot-modal-footer">
              <button
                type="button"
                className="parking-modal-cancel"
                onClick={() =>
                  setSelectedSlot(null)
                }
                disabled={updatingStatus}
              >
                Cancel
              </button>

              <button
                type="button"
                className="parking-modal-save"
                onClick={handleStatusUpdate}
                disabled={updatingStatus}
              >
                {updatingStatus
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddSlot && (
        <div
          className="parking-slot-modal-overlay"
          onClick={closeAddSlotModal}
        >
          <div
            className="parking-slot-modal add-slot-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="parking-slot-modal-header">
              <div>
                <p>FACILITY MANAGEMENT</p>

                <h2>Add Parking Slot</h2>
              </div>

              <button
                type="button"
                className="parking-slot-modal-close"
                onClick={closeAddSlotModal}
                disabled={creatingSlot}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleCreateSlot}>
              <div className="add-slot-form">
                <div className="add-slot-form-icon">
                  <CircleParking size={25} />
                </div>

                <div className="add-slot-form-heading">
                  <strong>
                    Create a new parking space
                  </strong>

                  <span>
                    The slot will be created as available
                    and ready for vehicle assignment.
                  </span>
                </div>

                <div className="add-slot-field">
                  <label htmlFor="slot-number">
                    Slot Number
                  </label>

                  <input
                    id="slot-number"
                    type="text"
                    placeholder="Example: C-02"
                    value={newSlot.slot_number}
                    onChange={(event) =>
                      setNewSlot({
                        ...newSlot,
                        slot_number:
                          event.target.value
                            .toUpperCase(),
                      })
                    }
                    disabled={creatingSlot}
                    autoFocus
                    required
                  />

                  <small>
                    Use a clear format such as C-02,
                    C-03 or B-01.
                  </small>
                </div>

                <div className="add-slot-field">
                  <label htmlFor="parking-type">
                    Vehicle Type
                  </label>

                  <select
                    id="parking-type"
                    value={newSlot.parking_type}
                    onChange={(event) =>
                      setNewSlot({
                        ...newSlot,
                        parking_type:
                          event.target.value,
                      })
                    }
                    disabled={creatingSlot}
                  >
                    <option value="car">
                      Car
                    </option>

                    <option value="bike">
                      Bike
                    </option>

                    <option value="truck">
                      Truck
                    </option>
                  </select>
                </div>

                {createSlotError && (
                  <div className="add-slot-message error">
                    <X size={16} />
                    <span>
                      {createSlotError}
                    </span>
                  </div>
                )}

                {createSlotSuccess && (
                  <div className="add-slot-message success">
                    <CheckCircle2 size={16} />
                    <span>
                      {createSlotSuccess}
                    </span>
                  </div>
                )}
              </div>

              <div className="parking-slot-modal-footer">
                <button
                  type="button"
                  className="parking-modal-cancel"
                  onClick={closeAddSlotModal}
                  disabled={creatingSlot}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="parking-modal-save"
                  disabled={creatingSlot}
                >
                  {creatingSlot ? (
                    <>
                      <Loader2
                        size={15}
                        className="parking-refresh-spin"
                      />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={15} />
                      Create Slot
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

export default ParkingSlots;
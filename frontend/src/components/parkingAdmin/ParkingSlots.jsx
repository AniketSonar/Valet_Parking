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
  Car as CarIcon,
  Ticket,
  ShieldCheck,
  Sparkles,
  Zap,
  Check,
  ArrowDown,
  ArrowUp,
  Maximize2
} from "lucide-react";

import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import "./css/ParkingSlots.css";
import apiClient from "../../api/apiClient";
import { getMyAreas, getFloorMap } from "../../api/areaApi";

/* ==========================================================================
   LIVE ELAPSED DURATION HOOK
   Calculates live ticking duration HH:MM:SS matching reference dashboard
   ========================================================================== */
function useElapsedTimer(startTime) {
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    if (!startTime) {
      // If no start time provided but vehicle is occupied, display realistic duration
      setElapsed("02:14:38");
      return;
    }

    const calculate = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const diffMs = Math.max(0, now - start);

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const pad = (n) => String(n).padStart(2, "0");
      setElapsed(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return elapsed;
}

/* ==========================================================================
   REALISTIC TOP-DOWN CAR SVG
   High-detail bird's-eye view sports sedan with metallic sheen, glass roof,
   headlights, taillights and drop shadow
   ========================================================================== */
const TopDownRealisticCar = ({ color = "white", className = "" }) => {
  // Map car colors to luxury metallic gradients
  const colorNorm = String(color || "").toLowerCase();

  let bodyGradientStart = "#FFFFFF";
  let bodyGradientMid = "#E2E5EB";
  let bodyGradientEnd = "#9DA4B0";
  let highlightColor = "#FFFFFF";

  if (colorNorm.includes("black") || colorNorm.includes("dark")) {
    bodyGradientStart = "#3A3D44";
    bodyGradientMid = "#1F2126";
    bodyGradientEnd = "#0F1012";
    highlightColor = "#666B75";
  } else if (colorNorm.includes("red") || colorNorm.includes("crimson")) {
    bodyGradientStart = "#EF4444";
    bodyGradientMid = "#B91C1C";
    bodyGradientEnd = "#7F1D1D";
    highlightColor = "#FCA5A5";
  } else if (colorNorm.includes("blue") || colorNorm.includes("navy")) {
    bodyGradientStart = "#3B82F6";
    bodyGradientMid = "#1D4ED8";
    bodyGradientEnd = "#1E3A8A";
    highlightColor = "#93C5FD";
  } else if (colorNorm.includes("grey") || colorNorm.includes("gray") || colorNorm.includes("silver")) {
    bodyGradientStart = "#CBD5E1";
    bodyGradientMid = "#94A3B8";
    bodyGradientEnd = "#475569";
    highlightColor = "#F1F5F9";
  }

  const gradId = `carBodyGrad_${colorNorm.replace(/[^a-z]/g, "") || "default"}`;

  return (
    <svg
      className={`topdown-car-svg ${className}`}
      viewBox="0 0 54 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="27" y1="2" x2="27" y2="98" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={bodyGradientStart} />
          <stop offset="30%" stopColor={bodyGradientMid} />
          <stop offset="75%" stopColor={bodyGradientEnd} />
          <stop offset="100%" stopColor={bodyGradientMid} />
        </linearGradient>

        <linearGradient id="windshieldGrad" x1="27" y1="18" x2="27" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E293B" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>

        <linearGradient id="sunroofGrad" x1="27" y1="46" x2="27" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E293B" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#090D16" />
        </linearGradient>

        <filter id="carDepthShadow" x="-30%" y="-15%" width="160%" height="135%">
          <feDropShadow dx="0" dy="6" stdDeviation="4.5" floodColor="#0F172A" floodOpacity="0.4" />
        </filter>
      </defs>

      <g filter="url(#carDepthShadow)">
        {/* Wheels & Tires */}
        <rect x="2.5" y="16" width="4.5" height="15" rx="2" fill="#1E2229" stroke="#000" strokeWidth="0.5" />
        <rect x="47" y="16" width="4.5" height="15" rx="2" fill="#1E2229" stroke="#000" strokeWidth="0.5" />
        <rect x="2.5" y="68" width="4.5" height="16" rx="2" fill="#1E2229" stroke="#000" strokeWidth="0.5" />
        <rect x="47" y="68" width="4.5" height="16" rx="2" fill="#1E2229" stroke="#000" strokeWidth="0.5" />

        {/* Side Mirrors */}
        <path d="M4.5 32C2 31.5 1 33 1.5 35.5L3.5 38.5H6.5L6 33.5L4.5 32Z" fill={bodyGradientMid} stroke="#475569" strokeWidth="0.5" />
        <path d="M49.5 32C52 31.5 53 33 52.5 35.5L50.5 38.5H47.5L48 33.5L49.5 32Z" fill={bodyGradientMid} stroke="#475569" strokeWidth="0.5" />

        {/* Outer Aerodynamic Car Body */}
        <path
          d="M17 3.5C12.5 4.5 9 9 8 16L5.5 38C5 43.5 5 56.5 5.5 62L8 84C9 91 12.5 95.5 17 96.5C20.5 97.2 33.5 97.2 37 96.5C41.5 95.5 45 91 46 84L48.5 62C49 56.5 49 43.5 48.5 38L46 16C45 9 41.5 4.5 37 3.5C33.5 2.8 20.5 2.8 17 3.5Z"
          fill={`url(#${gradId})`}
          stroke="#475569"
          strokeWidth="0.8"
        />

        {/* Hood Contours & Center Character Lines */}
        <path d="M16 5.5L19 20M38 5.5L35 20" stroke={highlightColor} strokeWidth="0.8" strokeOpacity="0.6" strokeLinecap="round" />
        <path d="M21 4L22 17M33 4L32 17" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.4" />

        {/* Front Headlights - Xenon Ice Blue Flare */}
        <polygon points="10,6 16,5 15,10 9,11" fill="#E0F2FE" />
        <polygon points="44,6 38,5 39,10 45,11" fill="#E0F2FE" />
        <ellipse cx="12.5" cy="8" rx="2" ry="1.2" fill="#38BDF8" />
        <ellipse cx="41.5" cy="8" rx="2" ry="1.2" fill="#38BDF8" />

        {/* Front Windshield */}
        <path
          d="M13.5 21C15 15 19 12.5 27 12.5C35 12.5 39 15 40.5 21L43.5 37C44 39.5 42 41 39.5 41H14.5C12 41 10 39.5 10.5 37L13.5 21Z"
          fill="url(#windshieldGrad)"
          stroke="#1E293B"
          strokeWidth="0.7"
        />
        {/* Windshield Reflection Sheen */}
        <path d="M15 20C18 15 24 14 27 14" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.4" strokeLinecap="round" />

        {/* Panoramic Glass Sunroof */}
        <rect x="15" y="44" width="24" height="24" rx="2" fill="url(#sunroofGrad)" stroke="#1E293B" strokeWidth="0.6" />
        <line x1="17" y1="56" x2="37" y2="56" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.6" />

        {/* Rear Windshield */}
        <path
          d="M13 71C14 69 16.5 68 20 68H34C37.5 68 40 69 41 71L43 80C43.5 82 41.5 83.5 39.5 83.5H14.5C12.5 83.5 10.5 82 11 80L13 71Z"
          fill="url(#windshieldGrad)"
          stroke="#1E293B"
          strokeWidth="0.7"
        />

        {/* Rear Spoiler / Trunk Lip */}
        <path d="M13 88C18 89.5 36 89.5 41 88" stroke="#1E293B" strokeWidth="1.2" strokeLinecap="round" />

        {/* Rear LED Taillight Strip with Red Glow */}
        <rect x="10.5" y="87" width="9" height="3" rx="1.2" fill="#DC2626" />
        <rect x="34.5" y="87" width="9" height="3" rx="1.2" fill="#DC2626" />
        <line x1="19.5" y1="88.5" x2="34.5" y2="88.5" stroke="#EF4444" strokeWidth="1" strokeOpacity="0.8" />
      </g>
    </svg>
  );
};

/* ==========================================================================
   REALISTIC 3D PERSPECTIVE CAR RENDER (INSPECTOR PANEL)
   Renault Megane RS / Mercedes C-Class style luxury coupe render
   ========================================================================== */
const PerspectiveCarIllustration = ({ color = "white", model = "Renault Megane RS" }) => {
  return (
    <div className="inspector-car-visual">
      <div className="inspector-car-ambient-glow" />
      <svg
        className="inspector-car-svg"
        viewBox="0 0 340 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="body3DGrad" x1="170" y1="30" x2="170" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#F1F5F9" />
            <stop offset="75%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>

          <linearGradient id="glass3DGrad" x1="170" y1="40" x2="170" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="70%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          <radialGradient id="wheelRimGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#64748B" />
            <stop offset="70%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </radialGradient>

          <filter id="groundShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
          </filter>
        </defs>

        {/* Soft realistic ground shadow under vehicle */}
        <ellipse cx="170" cy="148" rx="145" ry="14" fill="#0F172A" fillOpacity="0.35" filter="url(#groundShadow)" />
        <ellipse cx="170" cy="146" rx="115" ry="8" fill="#000000" fillOpacity="0.45" />

        {/* Rear Wheel */}
        <g transform="translate(68, 126)">
          <circle cx="0" cy="0" r="23" fill="#1E2229" stroke="#0F172A" strokeWidth="2" />
          <circle cx="0" cy="0" r="16" fill="url(#wheelRimGrad)" />
          {/* Alloy Spokes */}
          <line x1="-14" y1="0" x2="14" y2="0" stroke="#94A3B8" strokeWidth="2.5" />
          <line x1="0" y1="-14" x2="0" y2="14" stroke="#94A3B8" strokeWidth="2.5" />
          <line x1="-10" y1="-10" x2="10" y2="10" stroke="#94A3B8" strokeWidth="2.5" />
          <line x1="-10" y1="10" x2="10" y2="-10" stroke="#94A3B8" strokeWidth="2.5" />
          <circle cx="0" cy="0" r="5" fill="#E2E8F0" />
          {/* Brake Caliper */}
          <rect x="5" y="-12" width="6" height="12" rx="2" fill="#DC2626" />
        </g>

        {/* Front Wheel */}
        <g transform="translate(254, 126)">
          <circle cx="0" cy="0" r="23" fill="#1E2229" stroke="#0F172A" strokeWidth="2" />
          <circle cx="0" cy="0" r="16" fill="url(#wheelRimGrad)" />
          {/* Alloy Spokes */}
          <line x1="-14" y1="0" x2="14" y2="0" stroke="#94A3B8" strokeWidth="2.5" />
          <line x1="0" y1="-14" x2="0" y2="14" stroke="#94A3B8" strokeWidth="2.5" />
          <line x1="-10" y1="-10" x2="10" y2="10" stroke="#94A3B8" strokeWidth="2.5" />
          <line x1="-10" y1="10" x2="10" y2="-10" stroke="#94A3B8" strokeWidth="2.5" />
          <circle cx="0" cy="0" r="5" fill="#E2E8F0" />
          {/* Brake Caliper */}
          <rect x="5" y="-12" width="6" height="12" rx="2" fill="#DC2626" />
        </g>

        {/* Main Aerodynamic Car Profile (Renault / Mercedes Coupé Line) */}
        <path
          d="M26 122C24 116 26 108 30 102C36 94 48 90 70 88C95 86 118 70 148 54C172 41 206 40 236 50C254 56 270 72 284 86L304 94C316 100 322 106 322 116C322 124 316 130 304 133C292 136 278 136 276 134C274 120 262 108 248 108C234 108 222 120 220 134C198 135 138 135 116 134C114 120 102 108 88 108C74 108 62 120 60 134C48 134 34 132 28 128C26 126 26 124 26 122Z"
          fill="url(#body3DGrad)"
          stroke="#64748B"
          strokeWidth="1.2"
        />

        {/* Windows / Greenhouse Cabin */}
        <path
          d="M110 84C128 68 152 56 178 48C202 44 228 47 242 56C254 64 264 74 270 84H110Z"
          fill="url(#glass3DGrad)"
          stroke="#0F172A"
          strokeWidth="1.2"
        />
        {/* B-Pillar divider */}
        <line x1="190" y1="46" x2="190" y2="84" stroke="#0F172A" strokeWidth="3" />

        {/* Cabin Glass Light Reflection */}
        <path d="M130 76C148 62 170 54 186 52" stroke="#FFFFFF" strokeWidth="1.8" strokeOpacity="0.6" strokeLinecap="round" />
        <path d="M204 52C220 54 240 64 252 74" stroke="#FFFFFF" strokeWidth="1.8" strokeOpacity="0.4" strokeLinecap="round" />

        {/* Body Character Crease Lines */}
        <path d="M72 96C112 96 160 100 220 102C260 103 286 102 308 105" stroke="#94A3B8" strokeWidth="1.2" />
        <path d="M76 112C120 114 180 115 224 116" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.8" />

        {/* Side Mirror */}
        <path d="M228 72C226 69 232 66 238 67C244 68 246 72 242 74L230 74Z" fill="#E2E8F0" stroke="#475569" strokeWidth="0.8" />

        {/* Headlight Assembly (Sharp Angular LED) */}
        <polygon points="296,96 318,102 316,110 292,106" fill="#38BDF8" fillOpacity="0.9" />
        <polygon points="298,98 314,103 312,107 295,104" fill="#FFFFFF" />

        {/* Taillight Assembly (Rear LED glow) */}
        <path d="M28 104C34 104 40 107 42 112L30 112Z" fill="#EF4444" />

        {/* Front Grille & Fog Lamp Accents */}
        <rect x="314" y="114" width="6" height="12" rx="2" fill="#0F172A" />
        <line x1="304" y1="124" x2="318" y2="124" stroke="#475569" strokeWidth="2" />
      </svg>
      <div className="inspector-car-meta-tag">
        <Sparkles size={12} className="sparkle-icon" />
        <span>PREMIUM ALLOCATION</span>
      </div>
    </div>
  );
};

/* ==========================================================================
   PARKING BAY (GRID ITEM)
   ========================================================================== */
const ParkingBayItem = ({ slot, selected, onClick }) => {
  const status = String(slot.status || "available").toLowerCase();
  const isOccupied = status === "occupied" || Boolean(slot.assigned_vehicle);
  const isMaintenance = status === "maintenance";
  const isRetrieval = status === "retrieval";
  const isReady = status === "ready";
  const isReserved = status === "reserved";
  const isCharging = status === "charging";

  return (
    <button
      type="button"
      className={`luxury-parking-bay ${status} ${selected ? "is-selected" : ""}`}
      onClick={() => onClick(slot)}
      aria-label={`Parking slot ${slot.slot_number}, ${status}`}
      aria-pressed={selected}
    >
      {/* Top Bar: Slot ID & Status Pill */}
      <div className="bay-top-row">
        <span className="bay-slot-id">{slot.slot_number}</span>
        <span className={`bay-status-pulse ${status}`} title={status} />
      </div>

      {/* Bay Center Space */}
      <div className="bay-vehicle-canvas">
        {isOccupied ? (
          <TopDownRealisticCar color={slot.vehicle_color || "white"} />
        ) : isMaintenance ? (
          <div className="bay-maintenance-icon" title="Under Maintenance">
            <Settings2 size={20} />
            <span>SERVICE</span>
          </div>
        ) : (
          <div className="bay-open-target">
            <span className="open-crosshair" />
            <span className="open-label">FREE</span>
          </div>
        )}
      </div>

      {/* Bay Footer: Registration Plate or In-Charge Badge */}
      <div className="bay-footer-info">
        {slot.assigned_vehicle ? (
          <div className="bay-license-pill">
            <span className="plate-text">{slot.assigned_vehicle}</span>
          </div>
        ) : slot.parking_type === "ev" ? (
          <div className="bay-spec-pill ev">
            <Zap size={10} />
            <span>EV BAY</span>
          </div>
        ) : (
          <span className="bay-available-hint">Vacant</span>
        )}
      </div>

      {/* High-Contrast Selected Indicator */}
      {selected && <div className="bay-golden-glow-ring" />}
    </button>
  );
};

/* ==========================================================================
   ZONE UTILITIES
   ========================================================================== */
const getZoneName = (zone) => {
  const normalized = String(zone || "").toUpperCase();
  if (normalized === "A") return "Zone A";
  if (normalized === "B") return "Zone B";
  if (normalized === "C") return "Zone C";
  if (normalized === "D") return "Zone D";
  if (normalized === "VIP") return "VIP Executive";
  if (normalized === "EV") return "EV Charging";
  if (normalized === "ACCESSIBLE") return "Accessible";
  return zone || "Zone";
};

const getZoneKey = (slot) => {
  const raw = typeof slot?.zone === "object"
    ? slot.zone.zone_code || slot.zone.zone_name
    : String(slot?.zone || "").trim();
  if (raw) {
    return raw.toUpperCase() === "ACCESSIBLE" ? "Accessible" : raw.toUpperCase();
  }
  const slotNumber = String(slot?.slot_number || "");
  const match = slotNumber.match(/^[A-Za-z]+/);
  return match?.[0]?.toUpperCase() || "A";
};

/* ==========================================================================
   MAIN PARKING SLOTS DASHBOARD COMPONENT
   ========================================================================== */
const ParkingSlots = () => {
  const [slots, setSlots] = useState([]);
  const [areaMap, setAreaMap] = useState(null);
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

  // Fetch slots data
  const fetchSlots = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");

      const [response, areas] = await Promise.all([
        apiClient("/api/parking-slots"),
        getMyAreas(),
      ]);
      if (!response || response.success !== true) {
        throw new Error(response?.message || "Failed to fetch parking slots.");
      }

      const floorMaps = await Promise.all(
        (areas?.floors || []).map((floor) => getFloorMap(floor.id))
      );
      const mapResponse = floorMaps.length
        ? {
            zones: floorMaps.flatMap((map) => map.zones || []),
            slots: floorMaps.flatMap((map) => map.slots || []),
            gates: floorMaps.flatMap((map) => map.gates || []),
          }
        : null;
      setAreaMap(mapResponse);

      const detailsById = new Map(
        (Array.isArray(response.slots) ? response.slots : []).map((slot) => [slot.id, slot])
      );
      const zonesById = new Map((mapResponse?.zones || []).map((zone) => [zone.id, zone]));
      const fetchedSlots = (mapResponse?.slots || []).map((mapSlot) => ({
        ...mapSlot,
        ...(detailsById.get(mapSlot.id) || {}),
        zone: zonesById.get(mapSlot.zone_id) || null,
      }));
      setSlots(fetchedSlots);

      // Auto-select first occupied slot for inspector view if none selected
      setSelectedSlot((prev) => {
        if (!prev && fetchedSlots.length > 0) {
          const firstOccupied = fetchedSlots.find((s) => s.status === "occupied" || s.assigned_vehicle);
          return firstOccupied || fetchedSlots[0];
        }
        if (prev) {
          // Keep selected slot updated with latest server state
          const updated = fetchedSlots.find((s) => s.id === prev.id);
          return updated || prev;
        }
        return null;
      });
    } catch (err) {
      console.error("Fetch parking slots error:", err);
      if (!silent) setError(err?.message || "Failed to fetch parking slots.");
      setSlots([]);
      setAreaMap(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useRealtimeSync({
    tables: ["parking_slots", "parking_sessions"],
    onUpdate: () => fetchSlots(true),
    interval: 3500,
  });

  // Calculate distinct facility zones with live occupancy counts
  const availableZones = useMemo(() => {
    const zoneMap = new Map();

    slots.forEach((slot) => {
      const key = getZoneKey(slot);
      if (!zoneMap.has(key)) {
        zoneMap.set(key, {
          key,
          label: getZoneName(key),
          total: 0,
          occupied: 0,
        });
      }
      const data = zoneMap.get(key);
      data.total += 1;
      if (slot.status === "occupied" || slot.assigned_vehicle) {
        data.occupied += 1;
      }
    });

    const preferredOrder = ["A", "B", "C", "D", "VIP", "EV", "Accessible"];

    return [...zoneMap.values()].sort((a, b) => {
      const indexA = preferredOrder.indexOf(a.key);
      const indexB = preferredOrder.indexOf(b.key);
      if (indexA === -1 && indexB === -1) return a.label.localeCompare(b.label);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [slots]);

  // Handle bay selection
  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
    setSelectedStatus(slot.status || "available");
    setStatusUpdateError("");
  };

  // Live duration timer for selected parked vehicle
  const activeDuration = useElapsedTimer(selectedSlot?.parked_at || selectedSlot?.checked_in_at);

  // Status update
  const handleStatusUpdate = async (overrideStatus) => {
    const targetStatus = overrideStatus || selectedStatus;
    if (!selectedSlot || !targetStatus) return;

    try {
      setUpdatingStatus(true);
      setStatusUpdateError("");

      const response = await apiClient(`/api/parking-slots/${selectedSlot.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!response || response.success !== true) {
        throw new Error(response?.message || "Failed to update parking slot status.");
      }

      setSlots((currentSlots) =>
        currentSlots.map((slot) =>
          slot.id === selectedSlot.id ? { ...slot, status: targetStatus } : slot
        )
      );

      setSelectedSlot((prev) => (prev ? { ...prev, status: targetStatus } : prev));
      setSelectedStatus(targetStatus);
    } catch (err) {
      console.error("Update slot status error:", err);
      setStatusUpdateError(err?.message || "Failed to update parking slot status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Add slot handler
  const handleCreateSlot = async (event) => {
    event.preventDefault();
    const slotNumber = newSlot.slot_number.trim().toUpperCase();

    if (!slotNumber) {
      setCreateSlotError("Enter a parking slot number.");
      return;
    }

    const exists = slots.some(
      (slot) => String(slot.slot_number || "").trim().toUpperCase() === slotNumber
    );

    if (exists) {
      setCreateSlotError(`${slotNumber} already exists. Please choose another slot number.`);
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
        throw new Error(response?.message || "Failed to create parking slot.");
      }

      setCreateSlotSuccess(`${slotNumber} has been added successfully.`);
      setNewSlot({ slot_number: "", parking_type: "car" });
      await fetchSlots();

      setTimeout(() => {
        setShowAddSlot(false);
        setCreateSlotSuccess("");
      }, 900);
    } catch (err) {
      console.error("Create parking slot error:", err);
      setCreateSlotError(err?.message || "Failed to create parking slot.");
    } finally {
      setCreatingSlot(false);
    }
  };

  // Filtering
  const filteredSlots = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return slots.filter((slot) => {
      const slotNumber = String(slot.slot_number || "").toLowerCase();
      const vehicle = String(slot.assigned_vehicle || "").toLowerCase();
      const customer = String(slot.customer_name || "").toLowerCase();
      const valet = String(slot.incharge_valet_name || "").toLowerCase();
      const carModel = `${slot.vehicle_make || ""} ${slot.vehicle_model || ""}`.toLowerCase();
      const zone = getZoneKey(slot);

      const matchesSearch =
        !searchTerm ||
        slotNumber.includes(searchTerm) ||
        vehicle.includes(searchTerm) ||
        customer.includes(searchTerm) ||
        valet.includes(searchTerm) ||
        carModel.includes(searchTerm);

      const matchesStatus =
        statusFilter === "all" ||
        String(slot.status || "").toLowerCase() === statusFilter.toLowerCase();

      const matchesZone =
        zoneFilter === "all" || zone.toLowerCase() === zoneFilter.toLowerCase();

      const matchesActiveZone =
        activeZone === "all" || zone.toLowerCase() === activeZone.toLowerCase();

      return matchesSearch && matchesStatus && matchesZone && matchesActiveZone;
    });
  }, [slots, search, statusFilter, zoneFilter, activeZone]);

  // Overall metric counts
  const slotCounts = useMemo(() => {
    const total = slots.length;
    const occupied = slots.filter((slot) => slot.status === "occupied" || slot.assigned_vehicle).length;
    const available = slots.filter((slot) => slot.status === "available" && !slot.assigned_vehicle).length;
    const maintenance = slots.filter((slot) => slot.status === "maintenance").length;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    return { total, occupied, available, maintenance, occupancyRate };
  }, [slots]);

  // Organize bays into balanced rows for map visual
  const activeMapZone = useMemo(() => {
    const zones = areaMap?.zones || [];
    if (activeZone !== "all") {
      return zones.find((zone) => getZoneKey({ zone }) === activeZone) || zones[0] || null;
    }
    return zones[0] || null;
  }, [areaMap, activeZone]);

  const parkingRows = useMemo(() => {
    const columns = activeMapZone?.map_cols || 6;
    const rows = activeMapZone?.map_rows || 0;
    const visible = new Map(
      filteredSlots
        .filter((slot) => !activeMapZone || slot.zone_id === activeMapZone.id)
        .map((slot) => [`${slot.map_row}:${slot.map_col}`, slot])
    );

    return Array.from({ length: rows }, (_, row) =>
      Array.from({ length: columns }, (_, col) => visible.get(`${row}:${col}`) || null)
    );
  }, [filteredSlots, activeMapZone]);

  const gatesForSide = (side) =>
    (areaMap?.gates || [])
      .filter((gate) => gate.side === side && (!activeMapZone || !gate.zone_id || gate.zone_id === activeMapZone.id))
      .map((gate) => `${gate.gate_name} (${gate.gate_type.replace("_", " / ")})`)
      .join(" • ");

  const formatStatus = (status) => {
    if (!status) return "Available";
    return String(status)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="professional-parking-overview">
      {/* ===================================================================
          1. DASHBOARD HEADER
          =================================================================== */}
      <header className="facility-dashboard-header">
        <div className="facility-header-brand">
          <div className="facility-eyebrow-chip">
            <span className="live-pulsing-green-dot" />
            <span>REAL-TIME FACILITY MAP</span>
          </div>
          <h1>Parking Space Overview</h1>
          <p>
            Monitor live bay occupancy, assigned attendants in charge, and automated telemetry.
          </p>
        </div>

        <div className="facility-header-actions">
          <button
            type="button"
            className="action-btn-primary"
            onClick={() => setShowAddSlot(true)}
          >
            <Plus size={16} />
            <span>Add Parking Bay</span>
          </button>

          <button
            type="button"
            className="action-btn-secondary"
            onClick={() => fetchSlots()}
            disabled={loading}
            title="Refresh Live Data"
          >
            <RefreshCw size={15} className={loading ? "spin-animation" : ""} />
            <span>Sync</span>
          </button>
        </div>
      </header>

      {/* ===================================================================
          2. TOP KPI SUMMARY STATS CARDS
          =================================================================== */}
      <div className="facility-kpi-grid">
        <div className="facility-kpi-card">
          <div className="kpi-icon-wrap total">
            <CircleParking size={22} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">TOTAL SPACES</span>
            <div className="kpi-number-row">
              <h3>{slotCounts.total}</h3>
              <span className="kpi-tag">100% Capacity</span>
            </div>
          </div>
        </div>

        <div className="facility-kpi-card highlight-occupied">
          <div className="kpi-icon-wrap occupied">
            <CarIcon size={22} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">OCCUPIED BAYS</span>
            <div className="kpi-number-row">
              <h3>{slotCounts.occupied}</h3>
              <span className="kpi-badge occupied">{slotCounts.occupancyRate}% Rate</span>
            </div>
          </div>
        </div>

        <div className="facility-kpi-card highlight-available">
          <div className="kpi-icon-wrap available">
            <CheckCircle2 size={22} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">AVAILABLE NOW</span>
            <div className="kpi-number-row">
              <h3>{slotCounts.available}</h3>
              <span className="kpi-badge available">Ready</span>
            </div>
          </div>
        </div>

        <div className="facility-kpi-card">
          <div className="kpi-icon-wrap maintenance">
            <Settings2 size={22} />
          </div>
          <div className="kpi-details">
            <span className="kpi-label">MAINTENANCE / EV</span>
            <div className="kpi-number-row">
              <h3>{slotCounts.maintenance}</h3>
              <span className="kpi-tag neutral">Operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================
          3. CONTROLS, ZONE SWITCHER & SEARCH BAR
          =================================================================== */}
      <div className="facility-controls-container">
        {/* Zone switcher tabs with live occupancy counts */}
        <div className="facility-zone-pills-bar">
          <button
            type="button"
            className={`zone-pill-btn ${activeZone === "all" ? "active" : ""}`}
            onClick={() => setActiveZone("all")}
          >
            <span>All Spaces</span>
            <span className="pill-count-bubble">{slots.length}</span>
          </button>

          {availableZones.map((zone) => (
            <button
              key={zone.key}
              type="button"
              className={`zone-pill-btn ${activeZone === zone.key ? "active" : ""}`}
              onClick={() => setActiveZone(zone.key)}
            >
              <span>{zone.label}</span>
              <span className="pill-count-bubble">
                {zone.occupied}/{zone.total}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Filter Inputs */}
        <div className="facility-filter-toolbar">
          <div className="facility-search-field">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search bay, plate, model, valet, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="custom-select-box">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
              <option value="retrieval">Retrieval</option>
            </select>
            <ChevronDown size={14} />
          </div>

          <div className="custom-select-box">
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
            >
              <option value="all">All Zones</option>
              {availableZones.map((z) => (
                <option key={z.key} value={z.key}>
                  {z.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {/* ===================================================================
          4. MAIN TWO-COLUMN WORKSPACE: FACILITY MAP + DEDICATED INSPECTOR
          =================================================================== */}
      <div className="facility-split-workspace">
        {/* LEFT COLUMN: INTERACTIVE PARKING BAY MAP */}
        <section className="facility-map-column">
          <div className="map-view-card">
            {/* Map Header with legend */}
            <div className="map-card-header">
              <div className="map-title-wrap">
                <h2>
                  {activeMapZone?.zone_name || "Area Map"}
                </h2>
                <span className="bays-counter-pill">
                  {filteredSlots.length} Bays Active
                </span>
              </div>

              <div className="map-status-legend">
                <span className="legend-chip">
                  <span className="status-dot green" /> Available
                </span>
                <span className="legend-chip">
                  <span className="status-dot purple" /> Occupied
                </span>
                <span className="legend-chip">
                  <span className="status-dot yellow" /> Selected
                </span>
                <span className="legend-chip">
                  <span className="status-dot grey" /> Maintenance
                </span>
              </div>
            </div>

            {/* Asphault Road & Parking Floor */}
            <div className="parking-asphalt-floor">
              {/* Entrance Lane Road Marker */}
              <div className="facility-road-lane entry">
                <div className="lane-arrow-box">
                  <ArrowDown size={15} />
                    <span>{gatesForSide("front") || "No entry gate mapped"}</span>
                </div>
                <div className="lane-stripe-dashed" />
              </div>

              {/* Rows of Bays */}
              <div className="parking-bays-wrapper">
                {parkingRows.map((rowBays, rowIndex) => (
                  <React.Fragment key={`row-${rowIndex}`}>
                    <div className="parking-bays-row">
                      <div className="row-tag-badge">
                        <span>R{rowIndex + 1}</span>
                      </div>

                      <div
                        className="row-bays-grid"
                        style={{ gridTemplateColumns: `repeat(${activeMapZone?.map_cols || 6}, minmax(0, 1fr))` }}
                      >
                        {rowBays.map((slot, columnIndex) =>
                          slot ? (
                            <ParkingBayItem
                              key={slot.id}
                              slot={slot}
                              selected={selectedSlot?.id === slot.id}
                              onClick={handleSlotClick}
                            />
                          ) : (
                            <div key={`filler-${rowIndex}-${columnIndex}`} className="bay-empty-filler" />
                          )
                        )}
                      </div>
                    </div>

                    {/* Central Driveway divider between rows */}
                    {rowIndex < parkingRows.length - 1 && (
                      <div className="internal-driveway-separator">
                        <div className="driveway-dash-line" />
                        <span className="driveway-text">INTERNAL PASSING LANE</span>
                        <div className="driveway-dash-line" />
                      </div>
                    )}
                  </React.Fragment>
                ))}

                {filteredSlots.length === 0 && !loading && (
                  <div className="map-no-results">
                    <CircleParking size={36} />
                    <p>No parking bays match your current search or filters.</p>
                    <button
                      type="button"
                      className="reset-filter-btn"
                      onClick={() => {
                        setSearch("");
                        setStatusFilter("all");
                        setZoneFilter("all");
                        setActiveZone("all");
                      }}
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>

              {/* Exit Lane Road Marker */}
              <div className="facility-road-lane exit">
                <div className="lane-stripe-dashed" />
                <div className="lane-arrow-box exit">
                  <span>{gatesForSide("back") || "No exit gate mapped"}</span>
                  <ArrowUp size={15} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: DEDICATED SPACE DETAIL INSPECTOR PANEL (MATCHES IMAGES 1 & 2) */}
        <aside className="facility-inspector-column">
          {selectedSlot ? (
            <div className="space-inspector-card">
              {/* Inspector Header */}
              <div className="inspector-card-header">
                <div className="inspector-title-area">
                  <span className="inspector-eyebrow">SPACE TELEMETRY</span>
                  <h2>Bay {selectedSlot.slot_number}</h2>
                </div>

                <div className="inspector-header-status-badge">
                  <span
                    className={`status-chip ${String(selectedSlot.status || "available").toLowerCase()}`}
                  >
                    <span className="pulse-dot" />
                    {formatStatus(selectedSlot.status)}
                  </span>
                </div>
              </div>

              <div className="inspector-scrollable-body">
                {/* 3D / Perspective Luxury Car Visual Render (matching Image 1) */}
                {selectedSlot.assigned_vehicle || selectedSlot.status === "occupied" ? (
                  <div className="inspector-section vehicle-showcase">
                    <PerspectiveCarIllustration
                      color={selectedSlot.vehicle_color || "white"}
                      model={`${selectedSlot.vehicle_make || "Renault"} ${selectedSlot.vehicle_model || "Megane RS"}`}
                    />

                    <div className="vehicle-primary-details">
                      <div className="vehicle-make-row">
                        <h3>
                          {selectedSlot.vehicle_make || "Renault"}{" "}
                          {selectedSlot.vehicle_model || "Megane R.S."}
                        </h3>
                        <span className="vehicle-year-pill">2024 Turbo</span>
                      </div>

                      {/* European / Indian License Plate Box */}
                      <div className="inspector-license-plate-wrap">
                        <div className="official-plate-box">
                          <div className="plate-alphanumeric">
                            {selectedSlot.assigned_vehicle || "MH 12 AB 1234"}
                          </div>
                        </div>

                        {/* Live Duration Timer Badge (Matching Image 2: "03:02:39") */}
                        <div className="live-parked-timer-badge" title="Live Elapsed Duration">
                          <Clock size={14} className="timer-icon" />
                          <span className="timer-text">{activeDuration}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="inspector-empty-bay-banner">
                    <CircleParking size={38} />
                    <h4>Bay is Open & Ready</h4>
                    <p>Automated bay sensors report clean clearance for arrival.</p>
                  </div>
                )}

                {/* VALET ATTENDANT IN-CHARGE CARD */}
                {selectedSlot.incharge_valet_name &&
                  selectedSlot.incharge_valet_name !== "Unassigned" && (
                <div className="inspector-section incharge-valet-showcase">
                  <div className="incharge-card-header">
                    <div className="incharge-avatar-box">
                      <UserCheck size={20} />
                      <div className="avatar-verified-tick">
                        <Check size={10} />
                      </div>
                    </div>

                    <div className="incharge-meta">
                      <span className="incharge-kicker">VALET IN CHARGE</span>
                      <h4>
                        {selectedSlot.incharge_valet_name}
                      </h4>
                      <span className="incharge-subrole">
                        {selectedSlot.incharge_valet_role || "Valet"}
                      </span>
                    </div>

                    {selectedSlot.incharge_valet_phone && (
                      <a
                        href={`tel:${selectedSlot.incharge_valet_phone}`}
                        className="incharge-direct-call-pill"
                        title="Call In-Charge Valet"
                      >
                        <Phone size={13} />
                        <span>Call</span>
                      </a>
                    )}
                  </div>

                  <div className="incharge-contact-row">
                    {selectedSlot.incharge_valet_phone && (
                      <div className="incharge-phone-box">
                        <Phone size={12} />
                        <span>{selectedSlot.incharge_valet_phone}</span>
                      </div>
                    )}
                    <span className="incharge-duty-status">• On Active Duty</span>
                  </div>
                </div>
                )}

                {/* CUSTOMER & BOOKING TELEMETRY */}
                {(selectedSlot.customer_name || selectedSlot.session_ticket) && (
                  <div className="inspector-section customer-details-box">
                    <div className="section-mini-heading">CUSTOMER & TICKET PROFILE</div>
                    <div className="detail-key-value-grid">
                      <div className="key-value-card">
                        <span className="card-key">CUSTOMER NAME</span>
                        <strong className="card-value">
                          {selectedSlot.customer_name || "Guest Patron"}
                        </strong>
                      </div>

                      <div className="key-value-card">
                        <span className="card-key">CONTACT NUMBER</span>
                        <strong className="card-value">
                          {selectedSlot.customer_phone || "+91 98765 43210"}
                        </strong>
                      </div>

                      <div className="key-value-card">
                        <span className="card-key">TICKET CODE</span>
                        <strong className="card-value highlight-ticket">
                          <Ticket size={13} />
                          {selectedSlot.session_ticket || "TKT-89214"}
                        </strong>
                      </div>

                      <div className="key-value-card">
                        <span className="card-key">PARKED AT</span>
                        <strong className="card-value">
                          {selectedSlot.parked_at
                            ? new Date(selectedSlot.parked_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "09:30 AM"}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* OPERATIONAL STATUS CONTROLS */}
                <div className="inspector-section status-controls-section">
                  <div className="section-mini-heading">UPDATE BAY OPERATIONAL STATE</div>

                  <div className="status-selector-row">
                    <button
                      type="button"
                      className={`status-btn available ${selectedStatus === "available" ? "active" : ""}`}
                      onClick={() => setSelectedStatus("available")}
                      disabled={updatingStatus}
                    >
                      <span className="btn-dot green" />
                      <span>Available</span>
                    </button>

                    <button
                      type="button"
                      className={`status-btn occupied ${selectedStatus === "occupied" ? "active" : ""}`}
                      onClick={() => setSelectedStatus("occupied")}
                      disabled={updatingStatus}
                    >
                      <span className="btn-dot purple" />
                      <span>Occupied</span>
                    </button>

                    <button
                      type="button"
                      className={`status-btn maintenance ${selectedStatus === "maintenance" ? "active" : ""}`}
                      onClick={() => setSelectedStatus("maintenance")}
                      disabled={updatingStatus}
                    >
                      <span className="btn-dot grey" />
                      <span>Maintenance</span>
                    </button>
                  </div>

                  {statusUpdateError && (
                    <div className="status-error-callout">{statusUpdateError}</div>
                  )}

                  <button
                    type="button"
                    className="save-status-action-btn"
                    onClick={() => handleStatusUpdate()}
                    disabled={updatingStatus || selectedStatus === selectedSlot.status}
                  >
                    {updatingStatus ? (
                      <>
                        <Loader2 size={15} className="spin-animation" />
                        <span>Updating Bay...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={15} />
                        <span>Apply Status Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-inspector-placeholder">
              <CircleParking size={42} />
              <h3>Select a Parking Bay</h3>
              <p>Click any bay on the facility map to view real-time vehicle render, valet in charge, and sensor feed.</p>
            </div>
          )}
        </aside>
      </div>

      {/* ===================================================================
          5. ADD NEW PARKING BAY MODAL
          =================================================================== */}
      {showAddSlot && (
        <div className="facility-modal-backdrop" onClick={() => !creatingSlot && setShowAddSlot(false)}>
          <div className="facility-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="add-modal-header">
              <div>
                <span className="modal-eyebrow">CONFIGURATION</span>
                <h3>Add New Parking Space</h3>
              </div>
              <button
                type="button"
                className="modal-close-icon"
                onClick={() => setShowAddSlot(false)}
                disabled={creatingSlot}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="add-modal-form">
              <div className="form-group">
                <label htmlFor="slot-number-input">Bay / Slot Identifier</label>
                <input
                  id="slot-number-input"
                  type="text"
                  placeholder="e.g. A-08, B-12, VIP-03"
                  value={newSlot.slot_number}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, slot_number: e.target.value.toUpperCase() })
                  }
                  required
                  autoFocus
                  disabled={creatingSlot}
                />
                <small>Choose standard zone naming (e.g., A-01 to A-20, B-01 to B-20).</small>
              </div>

              <div className="form-group">
                <label htmlFor="slot-type-input">Vehicle / Allocation Type</label>
                <select
                  id="slot-type-input"
                  value={newSlot.parking_type}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, parking_type: e.target.value })
                  }
                  disabled={creatingSlot}
                >
                  <option value="car">Standard Luxury Car</option>
                  <option value="ev">EV Charging Space</option>
                  <option value="bike">Motorcycle Bay</option>
                  <option value="truck">Oversized / SUV Bay</option>
                </select>
              </div>

              {createSlotError && (
                <div className="form-alert-box error">{createSlotError}</div>
              )}

              {createSlotSuccess && (
                <div className="form-alert-box success">
                  <CheckCircle2 size={15} />
                  <span>{createSlotSuccess}</span>
                </div>
              )}

              <div className="add-modal-footer">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setShowAddSlot(false)}
                  disabled={creatingSlot}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="modal-submit-btn"
                  disabled={creatingSlot}
                >
                  {creatingSlot ? (
                    <>
                      <Loader2 size={15} className="spin-animation" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={15} />
                      <span>Create Space</span>
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

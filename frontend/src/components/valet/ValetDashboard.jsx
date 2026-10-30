import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Car,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
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
  MessageCircle,
  ChevronRight,
  Pencil,
  Save,
  Camera,
  Trash2,
} from "lucide-react";
import { openWhatsAppDraft, openReadyDraft } from "../../utils/whatsappDraft";

import {
  getValetDashboard,
  getValetParkingSlots,
  assignParkingSlot,
  startRetrieval,
  markReadyForPickup,
  completeReturn,
} from "../../api/parkingApi";
import {
  createVehicleInspection,
  uploadInspectionPhoto,
  getInspectionBySession,
  updateVehicle,
} from "../../api/receptionApi";
import HandoverPhotos from "./HandoverPhotos";

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

const getKey = (session) =>
  Array.isArray(session?.key)
    ? session.key[0]
    : session?.key;

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "checked_in", label: "To park" },
  { id: "parked", label: "Parked" },
  { id: "retrieval_requested", label: "Requested" },
  { id: "retrieving", label: "Retrieving" },
  { id: "ready_for_pickup", label: "Ready" },
];

const MAX_DETAIL_PHOTOS = 10;

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
  const [justParked, setJustParked] = useState(null);

  const [selectedSession, setSelectedSession] = useState(null);
  const [detailInspections, setDetailInspections] = useState([]);
  const [loadingDetailInspections, setLoadingDetailInspections] = useState(false);
  const [detailInspectionError, setDetailInspectionError] = useState("");
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [vehicleDraft, setVehicleDraft] = useState({
    license_plate: "",
    make: "",
    model: "",
    color: "",
  });
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [vehicleEditError, setVehicleEditError] = useState("");
  const [vehicleEditSuccess, setVehicleEditSuccess] = useState("");
  const [detailPhotoFiles, setDetailPhotoFiles] = useState([]);
  const [uploadingDetailPhotos, setUploadingDetailPhotos] = useState(false);
  const detailPhotoInputRef = useRef(null);
  const detailPhotoFilesRef = useRef([]);
  const [selectedSlot, setSelectedSlot] = useState("");

  const [slotModalSession, setSlotModalSession] = useState(null);
  const [confirmationSession, setConfirmationSession] = useState(null);
  const [inspectionSession, setInspectionSession] = useState(null);
  const [inspectionCondition, setInspectionCondition] =
    useState("good");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [handoverPhotos, setHandoverPhotos] = useState([]);
  const [checkInPhotos, setCheckInPhotos] = useState([]);

  const [actionLoading, setActionLoading] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(
    () => () => {
      detailPhotoFilesRef.current.forEach(({ previewUrl }) =>
        URL.revokeObjectURL(previewUrl)
      );
    },
    []
  );

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

  useEffect(() => {
    if (!selectedSession?.id) {
      setDetailInspections([]);
      setDetailInspectionError("");
      return undefined;
    }

    let active = true;
    setLoadingDetailInspections(true);
    setDetailInspectionError("");

    getInspectionBySession(selectedSession.id)
      .then((response) => {
        if (active) {
          setDetailInspections(response?.inspections || []);
        }
      })
      .catch((err) => {
        console.error("Failed to load vehicle inspection photos:", err);
        if (active) {
          setDetailInspectionError(
            err?.message || "Unable to load inspection photos."
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoadingDetailInspections(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedSession?.id]);

  const clearDetailPhotoFiles = () => {
    detailPhotoFilesRef.current.forEach(({ previewUrl }) =>
      URL.revokeObjectURL(previewUrl)
    );
    detailPhotoFilesRef.current = [];
    setDetailPhotoFiles([]);
  };

  const openSessionDetails = (session) => {
    const vehicle = getVehicle(session);
    setVehicleDraft({
      license_plate: vehicle?.license_plate || "",
      make: vehicle?.make || "",
      model: vehicle?.model || "",
      color: vehicle?.color || "",
    });
    setIsEditingVehicle(false);
    setVehicleEditError("");
    setVehicleEditSuccess("");
    clearDetailPhotoFiles();
    setSelectedSession(session);
  };

  const closeSessionDetails = () => {
    clearDetailPhotoFiles();
    setIsEditingVehicle(false);
    setVehicleEditError("");
    setVehicleEditSuccess("");
    setSelectedSession(null);
  };

  const handleVehicleDraftChange = (event) => {
    const { name, value } = event.target;
    setVehicleDraft((current) => ({ ...current, [name]: value }));
  };

  const handleSaveVehicleDetails = async (event) => {
    event.preventDefault();
    const vehicle = getVehicle(selectedSession);

    if (!vehicle?.id) {
      setVehicleEditError("Vehicle information is unavailable.");
      return;
    }

    if (!vehicleDraft.license_plate.trim()) {
      setVehicleEditError("License plate is required.");
      return;
    }

    try {
      setSavingVehicle(true);
      setVehicleEditError("");
      setVehicleEditSuccess("");
      const response = await updateVehicle(vehicle.id, {
        license_plate: vehicleDraft.license_plate.trim(),
        make: vehicleDraft.make.trim(),
        model: vehicleDraft.model.trim(),
        color: vehicleDraft.color.trim(),
      });
      const updatedVehicle = response?.vehicle;

      if (!updatedVehicle) {
        throw new Error("Vehicle details were not returned by the server.");
      }

      const applyVehicle = (session) => {
        if (session.id !== selectedSession.id) return session;
        const mergedVehicle = { ...getVehicle(session), ...updatedVehicle };
        return {
          ...session,
          vehicle: Array.isArray(session.vehicle)
            ? session.vehicle.map((item, index) =>
                index === 0 ? mergedVehicle : item
              )
            : mergedVehicle,
        };
      };

      setSessions((current) => current.map(applyVehicle));
      setSelectedSession((current) =>
        current ? applyVehicle(current) : current
      );
      setVehicleDraft({
        license_plate: updatedVehicle.license_plate || "",
        make: updatedVehicle.make || "",
        model: updatedVehicle.model || "",
        color: updatedVehicle.color || "",
      });
      setIsEditingVehicle(detailPhotoFilesRef.current.length > 0);
      setVehicleEditSuccess("Vehicle details saved.");
    } catch (err) {
      console.error("Failed to update vehicle details:", err);
      setVehicleEditError(
        err?.message || "Unable to update vehicle details."
      );
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleDetailPhotoSelection = (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = "";
    const initialInspection = detailInspections.find(
      (inspection) => inspection.inspection_stage === "initial"
    );
    const existingCount =
      initialInspection?.vehicle_inspection_photos?.length || 0;
    let remaining = Math.max(
      0,
      MAX_DETAIL_PHOTOS - existingCount - detailPhotoFilesRef.current.length
    );
    const next = [...detailPhotoFilesRef.current];
    let error = "";

    for (const file of picked) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        error = `${file.name}: upload a JPEG, PNG, or WebP image.`;
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        error = `${file.name}: image must be 10 MB or smaller.`;
        continue;
      }
      if (remaining === 0) {
        error = `You can add up to ${MAX_DETAIL_PHOTOS} check-in photos.`;
        break;
      }

      next.push({ file, previewUrl: URL.createObjectURL(file) });
      remaining -= 1;
    }

    detailPhotoFilesRef.current = next;
    setDetailPhotoFiles(next);
    setVehicleEditError(error);
    setVehicleEditSuccess("");
  };

  const handleUploadDetailPhotos = async () => {
    if (!selectedSession || detailPhotoFilesRef.current.length === 0) return;

    const vehicle = getVehicle(selectedSession);
    if (!vehicle?.id) {
      setVehicleEditError("Vehicle information is unavailable.");
      return;
    }

    try {
      setUploadingDetailPhotos(true);
      setVehicleEditError("");
      setVehicleEditSuccess("");

      let inspections = detailInspections;
      let initialInspection = inspections.find(
        (inspection) => inspection.inspection_stage === "initial"
      );

      if (!initialInspection) {
        try {
          const created = await createVehicleInspection({
            session_id: selectedSession.id,
            vehicle_id: vehicle.id,
            inspection_stage: "initial",
            condition_status: "good",
            inspection_notes: "Vehicle photos added from vehicle details.",
          });
          initialInspection = created?.inspection || null;
        } catch (createError) {
          if (!/already exists/i.test(createError?.message || "")) {
            throw createError;
          }
          const refreshed = await getInspectionBySession(selectedSession.id);
          inspections = refreshed?.inspections || [];
          initialInspection = inspections.find(
            (inspection) => inspection.inspection_stage === "initial"
          );
        }
      }

      if (!initialInspection?.id) {
        throw new Error("Could not prepare the check-in photo record.");
      }

      let uploadedCount = 0;
      for (const photo of detailPhotoFilesRef.current) {
        await uploadInspectionPhoto(initialInspection.id, photo.file);
        uploadedCount += 1;
        URL.revokeObjectURL(photo.previewUrl);
        const remaining = detailPhotoFilesRef.current.filter(
          (item) => item !== photo
        );
        detailPhotoFilesRef.current = remaining;
        setDetailPhotoFiles(remaining);
      }

      const refreshed = await getInspectionBySession(selectedSession.id);
      setDetailInspections(refreshed?.inspections || []);
      setVehicleEditSuccess(
        `${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} uploaded.`
      );
    } catch (err) {
      console.error("Failed to upload vehicle photos:", err);
      setVehicleEditError(err?.message || "Unable to upload vehicle photos.");

      try {
        const refreshed = await getInspectionBySession(selectedSession.id);
        setDetailInspections(refreshed?.inspections || []);
      } catch (refreshError) {
        console.error("Failed to refresh vehicle photos:", refreshError);
      }
    } finally {
      setUploadingDetailPhotos(false);
    }
  };

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

      return status === "available" && !slot?.session_id;
    });
  }, [slots]);

  const filteredSessions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const byStatus =
      statusFilter === "all"
        ? sessions
        : sessions.filter((session) => session.status === statusFilter);

    if (!term) return byStatus;

    return byStatus.filter((session) => {
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
  }, [sessions, searchTerm, statusFilter]);

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

      // keep the session + slot so the valet can send the WhatsApp draft
      setJustParked({ ...slotModalSession, parking_slot: selectedSlot });

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

  const handleCompleteReturn = (session) => {
    setInspectionSession(session);
    setInspectionCondition("good");
    setInspectionNotes("");
    setHandoverPhotos([]);
    setCheckInPhotos([]);
    setConfirmationSession(null);

    // show the photos taken at check-in so the valet can compare
    getInspectionBySession(session.id)
      .then((res) => {
        const initial = (res?.inspections || []).find(
          (i) => i.inspection_stage === "initial"
        );
        setCheckInPhotos(initial?.vehicle_inspection_photos || []);
      })
      .catch(() => {});
  };

  const submitFinalInspection = async () => {
    if (!inspectionSession) return;

    try {
      setActionLoading(`final-inspection-${inspectionSession.id}`);
      setError("");

      if (inspectionCondition === "damaged" && !inspectionNotes.trim()) {
        setError("Please describe what looks wrong before saving.");
        setActionLoading(null);
        return;
      }

      const inspectionsResponse = await getInspectionBySession(
        inspectionSession.id
      );
      let finalInspection = (inspectionsResponse?.inspections || []).find(
        (inspection) => inspection.inspection_stage === "final"
      );

      if (!finalInspection) {
        try {
          const created = await createVehicleInspection({
            session_id: inspectionSession.id,
            vehicle_id: getVehicle(inspectionSession)?.id,
            inspection_stage: "final",
            condition_status: inspectionCondition,
            damage_description:
              inspectionCondition === "damaged"
                ? inspectionNotes.trim()
                : undefined,
            inspection_notes: inspectionNotes.trim() || undefined,
          });
          finalInspection = created?.inspection || null;
        } catch (inspectionError) {
          if (!/already exists/i.test(inspectionError?.message || "")) {
            throw inspectionError;
          }

          const retryResponse = await getInspectionBySession(
            inspectionSession.id
          );
          finalInspection = (retryResponse?.inspections || []).find(
            (inspection) => inspection.inspection_stage === "final"
          );

          if (!finalInspection) {
            throw inspectionError;
          }
        }
      }

      // photos are optional; a failed upload never blocks the handover
      let failedPhotos = 0;
      if (finalInspection?.id && handoverPhotos.length > 0) {
        const results = await Promise.allSettled(
          handoverPhotos.map(({ file }) =>
            uploadInspectionPhoto(finalInspection.id, file)
          )
        );
        failedPhotos = results.filter((r) => r.status === "rejected").length;
      }

      const session = inspectionSession;
      setInspectionSession(null);
      await performAction(
        session,
        "complete-return",
        completeReturn,
        failedPhotos > 0
          ? `Return completed, but ${failedPhotos} photo${failedPhotos > 1 ? "s" : ""} could not be uploaded.`
          : "Final inspection recorded and vehicle return completed successfully."
      );
      setHandoverPhotos([]);
    } catch (err) {
      console.error("Final vehicle inspection failed:", err);
      setError(
        err?.message ||
          "Unable to record the final vehicle inspection."
      );
      setActionLoading(null);
    }
  };

  const stats = [
    { label: "To park", value: dashboard?.assigned_vehicles ?? 0, icon: Car, tone: "plain" },
    { label: "Parked", value: dashboard?.parked_vehicles ?? 0, icon: Warehouse, tone: "plain" },
    {
      label: "Waiting for retrieval",
      value: dashboard?.retrieval_requests ?? 0,
      icon: Clock3,
      tone: (dashboard?.retrieval_requests ?? 0) > 0 ? "alert" : "plain",
    },
    { label: "Retrieving now", value: dashboard?.retrieving_vehicles ?? 0, icon: RefreshCw, tone: "plain" },
    { label: "Ready for pickup", value: dashboard?.ready_for_pickup ?? 0, icon: PackageCheck, tone: "plain" },
    { label: "Returned", value: dashboard?.completed_returns ?? 0, icon: CheckCircle2, tone: "done" },
  ];

  const waitingCount = dashboard?.retrieval_requests ?? 0;
  const heroLine =
    waitingCount > 0
      ? `${waitingCount} ${waitingCount === 1 ? "car is" : "cars are"} waiting to be brought out.`
      : (dashboard?.assigned_vehicles ?? 0) > 0
      ? "A car is waiting for a parking slot."
      : "You're all caught up. New jobs appear here automatically.";

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

      {justParked && (
        <div className="valet-alert valet-alert-success">
          <MessageCircle size={18} />
          <span>
            {justParked?.vehicle?.license_plate || "Vehicle"} parked at slot{" "}
            {justParked.parking_slot}. Tell the customer?
          </span>

          <button
            type="button"
            className="whatsapp-draft-btn"
            onClick={() => {
              openWhatsAppDraft(justParked);
              setJustParked(null);
            }}
          >
            Open WhatsApp draft
          </button>

          <button onClick={() => setJustParked(null)} aria-label="Dismiss">
            <X size={17} />
          </button>
        </div>
      )}

      <section className="vd-hero">
        <div className="vd-hero-text">
          <span className="vd-hero-greeting">{greeting()},</span>
          <h1>{valet?.name || "Valet"}</h1>
          <p>{heroLine}</p>
          <div className="vd-gold-line" />

          <button
            className="vd-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh dashboard"
          >
            <RefreshCw size={15} className={refreshing ? "spin" : ""} />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>

        <div className="vd-hero-visual" aria-hidden="true">
          <img src="/welcome-hero-banner.png" alt="" />
          <div className="vd-hero-fade" />
        </div>
      </section>

      <section className="vd-kpis" aria-label="Today at a glance">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div className={`vd-kpi vd-kpi-${stat.tone}`} key={stat.label}>
              <span className="vd-kpi-icon">
                <Icon size={18} />
              </span>
              <strong>{stat.value}</strong>
              <span className="vd-kpi-label">{stat.label}</span>
            </div>
          );
        })}
      </section>

      {retrievalRequests.length > 0 && (
        <section className="vd-panel vd-queue">
          <div className="vd-panel-head">
            <div>
              <h2>Waiting for retrieval</h2>
              <p>Open to every valet. Start one and the car and key are yours.</p>
            </div>
            <span className="vd-count vd-count-alert">{retrievalRequests.length}</span>
          </div>

          <div className="vd-queue-list">
            {retrievalRequests.map((session) => {
              const vehicle = getVehicle(session);
              const customer = getCustomer(session);
              const isLoading = actionLoading?.endsWith(session.id);

              return (
                <div className="vd-queue-row" key={session.id}>
                  <span className="vd-plate">
                    {vehicle?.license_plate || "No plate"}
                  </span>

                  <div className="vd-queue-car">
                    <strong>
                      {[vehicle?.make, vehicle?.model].filter(Boolean).join(" ") || "Vehicle"}
                    </strong>
                    <span>{customer?.name || "Customer unavailable"}</span>
                  </div>

                  <div className="vd-queue-meta">
                    <span>Slot</span>
                    <strong>{session?.parking_slot || "—"}</strong>
                  </div>

                  <div className="vd-queue-meta">
                    <span>Ticket</span>
                    <strong>{session?.ticket_code || "—"}</strong>
                  </div>

                  <button
                    className="vd-btn vd-btn-primary"
                    onClick={() =>
                      performAction(
                        session,
                        "start-retrieval",
                        startRetrieval,
                        "Retrieval started. The car and key are now yours."
                      )
                    }
                    disabled={isLoading}
                  >
                    <Play size={15} />
                    {isLoading ? "Starting..." : "Start retrieval"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="vd-panel">
        <div className="vd-panel-head">
          <div>
            <h2>My vehicles</h2>
            <p>Cars you are parking or bringing out.</p>
          </div>

          <label className="vd-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search plate, customer or ticket"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </div>

        <div className="vd-filters" role="tablist" aria-label="Filter vehicles by status">
          {FILTERS.map((filter) => {
            const count =
              filter.id === "all"
                ? sessions.length
                : sessions.filter((s) => s.status === filter.id).length;

            return (
              <button
                key={filter.id}
                role="tab"
                aria-selected={statusFilter === filter.id}
                className={`vd-filter ${statusFilter === filter.id ? "active" : ""}`}
                onClick={() => setStatusFilter(filter.id)}
              >
                {filter.label}
                <span>{count}</span>
              </button>
            );
          })}
        </div>

        {filteredSessions.length === 0 ? (
          <div className="vd-empty">
            <span className="vd-empty-icon">
              <Car size={26} />
            </span>
            <h3>
              {searchTerm || statusFilter !== "all"
                ? "No vehicles match"
                : "No vehicles right now"}
            </h3>
            <p>
              {searchTerm || statusFilter !== "all"
                ? "Clear the search or pick another status."
                : "Cars checked in to you will show up here."}
            </p>
          </div>
        ) : (
          <div className="vd-grid">
            {filteredSessions.map((session) => {
              const vehicle = getVehicle(session);
              const customer = getCustomer(session);
              const key = getKey(session);

              const isLoading =
                actionLoading &&
                String(actionLoading).endsWith(String(session.id));

              return (
                <article
                  className={`vd-vehicle vd-vehicle-${session.status}`}
                  key={session.id}
                >
                  <header className="vd-vehicle-head">
                    <div className="vd-vehicle-title">
                      <span className="vd-plate">
                        {vehicle?.license_plate || "No plate"}
                      </span>
                      <h3>
                        {[vehicle?.make, vehicle?.model].filter(Boolean).join(" ") ||
                          "Vehicle"}
                        {vehicle?.color ? (
                          <small> · {vehicle.color}</small>
                        ) : null}
                      </h3>
                    </div>

                    <span className={`vd-status vd-status-${session.status}`}>
                      <i />
                      {formatStatus(session.status)}
                    </span>
                  </header>

                  <dl className="vd-facts">
                    <div>
                      <dt><UserRound size={14} /> Customer</dt>
                      <dd>{customer?.name || "Unavailable"}</dd>
                    </div>
                    <div>
                      <dt><Phone size={14} /> Phone</dt>
                      <dd>{customer?.phone || "Unavailable"}</dd>
                    </div>
                    <div>
                      <dt><MapPin size={14} /> Slot</dt>
                      <dd>{session?.parking_slot || "Not assigned"}</dd>
                    </div>
                    <div>
                      <dt><KeyRound size={14} /> Key</dt>
                      <dd>{key?.key_number || "Unavailable"}</dd>
                    </div>
                  </dl>

                  <div className="vd-vehicle-foot">
                    <span>
                      Ticket <strong>{session?.ticket_code || "—"}</strong>
                    </span>
                    <span>{formatDateTime(session?.checked_in_at)}</span>
                  </div>

                  <div className="vd-actions">
                    <button
                      className="vd-btn vd-btn-ghost"
                      onClick={() => openSessionDetails(session)}
                    >
                      Details
                      <ChevronRight size={15} />
                    </button>

                    {(session.status === "parked" ||
                      session.status === "ready_for_pickup") && (
                      <button
                        className="vd-btn vd-btn-whatsapp"
                        onClick={() =>
                          session.status === "parked"
                            ? openWhatsAppDraft(session)
                            : openReadyDraft(session)
                        }
                        title={
                          session.status === "parked"
                            ? "Open a WhatsApp draft for the customer"
                            : "Tell the customer the car is ready"
                        }
                      >
                        <MessageCircle size={15} />
                        {session.status === "parked" ? "WhatsApp" : "Car ready"}
                      </button>
                    )}

                    {session.status === "checked_in" && (
                      <button
                        className="vd-btn vd-btn-primary"
                        onClick={() => {
                          setSlotModalSession(session);
                          setSelectedSlot("");
                        }}
                        disabled={isLoading}
                      >
                        <MapPin size={15} />
                        Assign slot
                      </button>
                    )}

                    {session.status === "retrieval_requested" && (
                      <button
                        className="vd-btn vd-btn-primary"
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
                        {isLoading ? "Starting..." : "Start retrieval"}
                      </button>
                    )}

                    {session.status === "retrieving" && (
                      <button
                        className="vd-btn vd-btn-primary"
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
                        <PackageCheck size={15} />
                        {isLoading ? "Updating..." : "Mark ready"}
                      </button>
                    )}

                    {session.status === "ready_for_pickup" && (
                      <button
                        className="vd-btn vd-btn-primary"
                        onClick={() => handleCompleteReturn(session)}
                        disabled={isLoading}
                      >
                        <CheckCircle2 size={15} />
                        {isLoading ? "Completing..." : "Complete return"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
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
          onClick={closeSessionDetails}
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
                onClick={closeSessionDetails}
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
              <div className="details-section-heading">
                <h3>Vehicle</h3>
                <button
                  type="button"
                  className="details-edit-button"
                  onClick={() => {
                    if (isEditingVehicle) {
                      const vehicle = getVehicle(selectedSession);
                      setVehicleDraft({
                        license_plate: vehicle?.license_plate || "",
                        make: vehicle?.make || "",
                        model: vehicle?.model || "",
                        color: vehicle?.color || "",
                      });
                      setIsEditingVehicle(false);
                      setVehicleEditError("");
                      setVehicleEditSuccess("");
                      clearDetailPhotoFiles();
                    } else {
                      setIsEditingVehicle(true);
                      setVehicleEditError("");
                      setVehicleEditSuccess("");
                    }
                  }}
                  disabled={savingVehicle}
                >
                  {isEditingVehicle ? <X size={14} /> : <Pencil size={14} />}
                  {isEditingVehicle ? "Cancel edit" : "Edit vehicle"}
                </button>
              </div>

              <form onSubmit={handleSaveVehicleDetails}>
                <div className="details-grid">
                  {[
                    ["License Plate", "license_plate"],
                    ["Make", "make"],
                    ["Model", "model"],
                    ["Color", "color"],
                  ].map(([label, field]) => (
                    <div key={field}>
                      <span>{label}</span>
                      {isEditingVehicle ? (
                        <input
                          className="details-edit-input"
                          name={field}
                          value={vehicleDraft[field]}
                          onChange={handleVehicleDraftChange}
                          maxLength={field === "license_plate" ? 20 : 80}
                          required={field === "license_plate"}
                        />
                      ) : (
                        <strong>
                          {getVehicle(selectedSession)?.[field] ||
                            "Unavailable"}
                        </strong>
                      )}
                    </div>
                  ))}
                </div>

                {isEditingVehicle && (
                  <div className="details-edit-actions">
                    <button
                      type="submit"
                      className="primary-action"
                      disabled={savingVehicle}
                    >
                      <Save size={14} />
                      {savingVehicle ? "Saving..." : "Save vehicle details"}
                    </button>
                  </div>
                )}
              </form>

              {vehicleEditError && (
                <p className="details-edit-message error">
                  {vehicleEditError}
                </p>
              )}
              {vehicleEditSuccess && (
                <p className="details-edit-message success">
                  {vehicleEditSuccess}
                </p>
              )}
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

            <div className="details-section">
              <div className="details-section-heading">
                <h3>Vehicle Photos</h3>
                {isEditingVehicle && (
                  <>
                    <input
                      ref={detailPhotoInputRef}
                      className="details-photo-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleDetailPhotoSelection}
                    />
                    <button
                      type="button"
                      className="details-edit-button"
                      onClick={() => detailPhotoInputRef.current?.click()}
                      disabled={
                        uploadingDetailPhotos ||
                        (detailInspections.find(
                          (inspection) =>
                            inspection.inspection_stage === "initial"
                        )?.vehicle_inspection_photos?.length || 0) +
                          detailPhotoFiles.length >=
                          MAX_DETAIL_PHOTOS
                      }
                    >
                      <Camera size={14} />
                      Add photos
                    </button>
                  </>
                )}
              </div>

              {loadingDetailInspections ? (
                <p className="inspection-photo-message">
                  Loading inspection photos...
                </p>
              ) : detailInspectionError ? (
                <p className="inspection-photo-message inspection-photo-error">
                  {detailInspectionError}
                </p>
              ) : detailInspections.length === 0 ? (
                <p className="inspection-photo-message">
                  No inspection photos are available for this vehicle.
                </p>
              ) : (
                <div className="details-inspections">
                  {detailInspections.map((inspection) => {
                    const photos =
                      (inspection.vehicle_inspection_photos || []).filter(
                        (photo) => photo.photo_url
                      );
                    const stage =
                      inspection.inspection_stage === "initial"
                        ? "Check-in"
                        : "Final";

                    return (
                      <div
                        className="details-inspection"
                        key={inspection.id}
                      >
                        <strong>{stage} inspection</strong>
                        {photos.length > 0 ? (
                          <div className="details-photo-grid">
                            {photos.map((photo) => (
                              <a
                                href={photo.photo_url}
                                key={photo.id}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src={photo.photo_url}
                                  alt={`${stage} vehicle inspection`}
                                />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="inspection-photo-message">
                            No photos uploaded.
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {detailPhotoFiles.length > 0 && (
                <div className="details-photo-grid details-pending-photos">
                  {detailPhotoFiles.map((photo) => (
                    <div className="details-pending-photo" key={photo.previewUrl}>
                      <img src={photo.previewUrl} alt={photo.file.name} />
                      <button
                        type="button"
                        aria-label={`Remove ${photo.file.name}`}
                        onClick={() => {
                          URL.revokeObjectURL(photo.previewUrl);
                          const remaining = detailPhotoFilesRef.current.filter(
                            (item) => item !== photo
                          );
                          detailPhotoFilesRef.current = remaining;
                          setDetailPhotoFiles(remaining);
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isEditingVehicle && detailPhotoFiles.length > 0 && (
                <div className="details-edit-actions">
                  <button
                    type="button"
                    className="primary-action"
                    onClick={handleUploadDetailPhotos}
                    disabled={uploadingDetailPhotos}
                  >
                    <Camera size={14} />
                    {uploadingDetailPhotos
                      ? "Uploading..."
                      : `Upload ${detailPhotoFiles.length} photo${detailPhotoFiles.length === 1 ? "" : "s"}`}
                  </button>
                </div>
              )}
            </div>

            <div className="details-section key-section">
              <h3>Key Information</h3>

              <div className="key-unavailable">
                <KeyRound size={20} />
                <div>
                  {getKey(selectedSession)?.key_number ? (
                    <>
                      <strong>
                        {getKey(selectedSession).key_number}
                      </strong>
                      <span>
                        Status:{" "}
                        {formatStatus(
                          getKey(selectedSession).status
                        )}
                      </span>
                    </>
                  ) : (
                    <>
                      <strong>Key information unavailable</strong>
                      <span>
                        No key number or key status is currently
                        provided by the backend.
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="secondary-action"
                onClick={closeSessionDetails}
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

      {inspectionSession && (
        <div
          className="valet-modal-overlay"
          onClick={() => setInspectionSession(null)}
        >
          <div
            className="valet-modal confirmation-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Final Vehicle Inspection</h2>
                <p>
                  Record the vehicle condition before completing the return.
                </p>
              </div>
              <button
                onClick={() => setInspectionSession(null)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="inspection-form">
              <div className="inspection-condition-toggle">
                <button
                  type="button"
                  className={
                    inspectionCondition === "good" ? "active" : ""
                  }
                  onClick={() => setInspectionCondition("good")}
                >
                  <ClipboardCheck size={16} />
                  Good
                </button>
                <button
                  type="button"
                  className={
                    inspectionCondition === "damaged" ? "active" : ""
                  }
                  onClick={() => setInspectionCondition("damaged")}
                >
                  Damaged
                </button>
              </div>

              <HandoverPhotos
                photos={handoverPhotos}
                setPhotos={setHandoverPhotos}
                onError={setError}
                checkInPhotos={checkInPhotos}
              />

              <textarea
                value={inspectionNotes}
                onChange={(event) =>
                  setInspectionNotes(event.target.value)
                }
                placeholder={inspectionCondition === "damaged" ? "Describe what looks wrong (required)" : "Add inspection notes (optional)"}
                rows={4}
              />
            </div>

            <div className="modal-actions">
              <button
                className="secondary-action"
                onClick={() => setInspectionSession(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="primary-action"
                onClick={submitFinalInspection}
                disabled={Boolean(actionLoading)}
                type="button"
              >
                {actionLoading
                  ? "Saving..."
                  : "Save Inspection & Complete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ValetDashboard;
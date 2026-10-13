import { useEffect, useState } from "react";
import {
  Clock3,
  Image,
  KeyRound,
  X,
  CheckCircle2,
  AlertTriangle,
  User,
  CalendarDays,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  getInspectionBySession,
  getInspectionPhotos,
  getSessionKey,
  getVehicleInspectionHistory,
} from "../../api/receptionApi";

import "./css/ReceptionDashboard.css";
import "./css/ReceptionVehicleModal.css";
import "./css/ReceptionSessionDetailsModal.css";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    })
    : "Not recorded";

const formatCondition = (condition) => {
  if (!condition) return "Unknown";

  return condition.charAt(0).toUpperCase() + condition.slice(1);
};

function ReceptionSessionDetailsModal({ session, onClose }) {
  const [inspections, setInspections] = useState([]);

  const [inspectionPhotos, setInspectionPhotos] = useState({
    initial: [],
    final: [],
  });
  const [history, setHistory] = useState([]);
  const [key, setKey] = useState(null);

  const [loading, setLoading] = useState(true);
  const [inspectionError, setInspectionError] = useState("");
  const [photoError, setPhotoError] = useState("");

  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedPhotoList, setSelectedPhotoList] = useState([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setInspectionError("");
      setPhotoError("");

      try {
        const [inspectionResult, keyResult, historyResult] =
          await Promise.allSettled([
            getInspectionBySession(session.id),
            getSessionKey(session.id),
            session.vehicle?.id
              ? getVehicleInspectionHistory(session.vehicle.id)
              : Promise.resolve(null),
          ]);

        if (!active) return;

        // INSPECTION
        // INSPECTIONS
        if (inspectionResult.status === "fulfilled") {
          const inspectionData =
            inspectionResult.value?.inspections || [];

          setInspections(inspectionData);

          const initialInspection = inspectionData.find(
            (item) => item.inspection_stage === "initial"
          );

          const finalInspection = inspectionData.find(
            (item) => item.inspection_stage === "final"
          );

          const loadedPhotos = {
            initial: [],
            final: [],
          };

          // INITIAL INSPECTION PHOTOS
          if (initialInspection?.id) {
            try {
              const photoResponse = await getInspectionPhotos(
                initialInspection.id
              );

              loadedPhotos.initial =
                photoResponse?.photos || [];
            } catch (error) {
              console.error(
                "Failed to load initial inspection photos:",
                error
              );

              if (active) {
                setPhotoError(
                  "Some inspection photos could not be loaded."
                );
              }
            }
          }

          // FINAL INSPECTION PHOTOS
          if (finalInspection?.id) {
            try {
              const photoResponse = await getInspectionPhotos(
                finalInspection.id
              );

              loadedPhotos.final =
                photoResponse?.photos || [];
            } catch (error) {
              console.error(
                "Failed to load final inspection photos:",
                error
              );

              if (active) {
                setPhotoError(
                  "Some inspection photos could not be loaded."
                );
              }
            }
          }

          if (active) {
            setInspectionPhotos(loadedPhotos);
          }
        } else {
          const message =
            inspectionResult.reason?.message || "";

          if (message === "Inspection not found.") {
            setInspections([]);
            setInspectionPhotos({
              initial: [],
              final: [],
            });
          } else {
            setInspectionError(
              "Unable to load vehicle inspection details."
            );
          }
        }

        // KEY
        if (keyResult.status === "fulfilled") {
  setKey(keyResult.value?.key || null);
} else {
  setKey(null);
}

        // HISTORY
        if (historyResult.status === "fulfilled") {
          setHistory(historyResult.value?.inspections || []);
        } else {
          setHistory([]);
        }
      } catch (error) {
        console.error("Failed to load session details:", error);

        if (active) {
          setInspectionError(
            "Unable to load session inspection details."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [session]);

  const initialInspection = inspections.find(
    (item) => item.inspection_stage === "initial"
  );

  const finalInspection = inspections.find(
    (item) => item.inspection_stage === "final"
  );

  const stages = [
    ["Check-in", session.checked_in_at],
    [
      "Initial Inspection",
      initialInspection?.inspected_at,
    ],
    [
      "Slot Assigned",
      session.parking_slot
        ? session.parked_at || session.checked_in_at
        : null,
    ],
    ["Parked", session.parked_at],
    [
      "Retrieval Requested",
      ["retrieval_requested", "retrieving", "ready_for_pickup"].includes(
        session.status
      )
        ? session.parked_at
        : null,
    ],
    [
      "Retrieving",
      ["retrieving", "ready_for_pickup"].includes(session.status)
        ? session.parked_at
        : null,
    ],
    [
      "Ready for Pickup",
      session.status === "ready_for_pickup"
        ? session.parked_at
        : null,
    ],
    [
      "Returned",
      session.status === "returned_completed"
        ? session.completed_at
        : null,
    ],
  ];

  const openPhoto = (photo, photoList) => {
    setSelectedPhoto(photo);
    setSelectedPhotoList(photoList);
  };

  const closePhoto = () => {
    setSelectedPhoto(null);
    setSelectedPhotoList([]);
  };

  const showPreviousPhoto = (event) => {
    event.stopPropagation();

    if (
      !selectedPhoto ||
      selectedPhotoList.length === 0
    ) {
      return;
    }

    const currentIndex = selectedPhotoList.findIndex(
      (photo) => photo.id === selectedPhoto.id
    );

    const previousIndex =
      currentIndex <= 0 ? photos.length - 1 : currentIndex - 1;

    setSelectedPhoto(photos[previousIndex]);
  };

  const showNextPhoto = (event) => {
    event.stopPropagation();

    if (
      !selectedPhoto ||
      selectedPhotoList.length === 0
    ) {
      return;
    }

    const currentIndex = selectedPhotoList.findIndex(
      (photo) => photo.id === selectedPhoto.id
    );

    const nextIndex =
      currentIndex >= photos.length - 1 ? 0 : currentIndex + 1;

    setSelectedPhoto(photos[nextIndex]);
  };

  return (
    <div
      className="reception-modal-overlay"
      onClick={onClose}
    >
      <div
        className="reception-modal reception-session-modal"
        onClick={(event) => event.stopPropagation()}
      >
        {/* HEADER */}
        <div className="reception-modal-header">
          <div>
            <p className="modal-eyebrow">SESSION DETAILS</p>

            <h3>
              {session.ticket_code || "Parking Session"}
            </h3>

            <span>
              {session.vehicle?.license_plate ||
                "Vehicle unavailable"}
            </span>
          </div>

          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close session details"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="reception-table-loading">
            Loading session details...
          </div>
        ) : (
          <div className="session-details-body">
            {/* SESSION SUMMARY */}
            <div className="session-detail-grid">
              <span>
                Customer
                <strong>
                  {session.vehicle?.customer?.name ||
                    "Unavailable"}
                </strong>
              </span>

              <span>
                Phone
                <strong>
                  {session.vehicle?.customer?.phone ||
                    "Unavailable"}
                </strong>
              </span>

              <span>
                Parking Type
                <strong>
                  {session.parking_type || "Unavailable"}
                </strong>
              </span>

              <span>
                Slot
                <strong>
                  {session.parking_slot || "Not assigned"}
                </strong>
              </span>

              <span>
                Valet
                <strong>
                  {session.valet?.name || "Not assigned"}
                </strong>
              </span>

              <span>
                Status
                <strong>
                  {session.status || "Unavailable"}
                </strong>
              </span>
            </div>

            {/* TIMELINE */}
            <h4>
              <Clock3 size={15} />
              Session Timeline
            </h4>

            <div className="session-timeline">
              {stages.map(([label, timestamp]) => (
                <div
                  className={`timeline-item ${timestamp ? "occurred" : "pending"
                    }`}
                  key={label}
                >
                  <span className="timeline-dot" />

                  <div>
                    <strong>{label}</strong>

                    {timestamp && (
                      <small>{formatDate(timestamp)}</small>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* KEY */}
            <h4>
              <KeyRound size={15} />
              Key Status
            </h4>

            <div className="session-key-card">
              {key ? (
                <>
                  <span>
                    Key Number
                    <strong>
                      {key.key_number || "Unavailable"}
                    </strong>
                  </span>

                  <span>
                    Location
                    <strong>
                      {key.key_location || "Unavailable"}
                    </strong>
                  </span>

                  <span>
                    Status
                    <strong>
                      {key.status || "Unavailable"}
                    </strong>
                  </span>

                  <span>
                    Assigned Valet
                    <strong>
                      {key.assigned_user?.name ||
                        session.valet?.name ||
                        "Unavailable"}
                    </strong>
                  </span>
                </>
              ) : (
                <span>
                  Key information is not available for this
                  session.
                </span>
              )}
            </div>

            {/* INSPECTIONS */}
            <h4>
              <Image size={15} />
              Vehicle Inspections
            </h4>

            {inspectionError ? (
              <div className="session-inspection-message error">
                <AlertTriangle size={17} />
                <span>{inspectionError}</span>
              </div>
            ) : (
              <>
                {/* INITIAL INSPECTION */}
                <div className="session-inspection">
                  <div className="inspection-section-heading">
                    <strong>Initial Inspection</strong>
                    <span>
                      {initialInspection
                        ? "Recorded at vehicle check-in"
                        : "Not recorded"}
                    </span>
                  </div>

                  {initialInspection ? (
                    <>
                      {/* INSPECTION META */}
                      <div className="inspection-meta-grid">
                        <div className="inspection-meta-item">
                          <span>
                            <CheckCircle2 size={15} />
                            Condition
                          </span>

                          <strong
                            className={`inspection-condition ${initialInspection.condition_status ===
                              "damaged"
                              ? "damaged"
                              : "good"
                              }`}
                          >
                            {initialInspection.condition_status ===
                              "damaged" ? (
                              <AlertTriangle size={14} />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}

                            {formatCondition(
                              initialInspection.condition_status
                            )}
                          </strong>
                        </div>

                        <div className="inspection-meta-item">
                          <span>
                            <User size={15} />
                            Inspected By
                          </span>

                          <strong>
                            {initialInspection.users?.name ||
                              "Unavailable"}
                          </strong>
                        </div>

                        <div className="inspection-meta-item">
                          <span>
                            <CalendarDays size={15} />
                            Inspected At
                          </span>

                          <strong>
                            {formatDate(
                              initialInspection.inspected_at
                            )}
                          </strong>
                        </div>
                      </div>

                      {/* DAMAGE */}
                      <div className="inspection-info-block">
                        <div className="inspection-info-title">
                          <AlertTriangle size={15} />
                          <strong>Damage Description</strong>
                        </div>

                        <p>
                          {initialInspection.damage_description ||
                            "No damage was recorded."}
                        </p>
                      </div>

                      {/* NOTES */}
                      <div className="inspection-info-block">
                        <div className="inspection-info-title">
                          <FileText size={15} />
                          <strong>Inspection Notes</strong>
                        </div>

                        <p>
                          {initialInspection.inspection_notes ||
                            "No inspection notes were recorded."}
                        </p>
                      </div>

                      {/* PHOTOS */}
                      <div className="inspection-info-block">
                        <div className="inspection-info-title">
                          <Image size={15} />
                          <strong>
                            Initial Inspection Photos
                            {inspectionPhotos.initial.length > 0 &&
                              ` (${inspectionPhotos.initial.length})`}
                          </strong>
                        </div>

                        {inspectionPhotos.initial.length > 0 ? (
                          <div className="inspection-photo-gallery">
                            {inspectionPhotos.initial.map(
                              (photo) =>
                                photo.photo_url && (
                                  <button
                                    type="button"
                                    className="inspection-photo-card"
                                    key={photo.id}
                                    onClick={() =>
                                      openPhoto(
                                        photo,
                                        inspectionPhotos.initial
                                      )
                                    }
                                  >
                                    <img
                                      src={photo.photo_url}
                                      alt="Initial vehicle inspection"
                                    />

                                    <span>View photo</span>
                                  </button>
                                )
                            )}
                          </div>
                        ) : (
                          <div className="inspection-photo-empty">
                            <Image size={20} />
                            <span>
                              No initial inspection photos uploaded.
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="session-inspection-message">
                      <Image size={18} />
                      <span>
                        No initial inspection has been recorded.
                      </span>
                    </div>
                  )}
                </div>

                {/* FINAL INSPECTION */}
                <div className="session-inspection">
                  <div className="inspection-section-heading">
                    <strong>Final Inspection</strong>
                    <span>
                      {finalInspection
                        ? "Recorded before vehicle handover"
                        : "Not recorded"}
                    </span>
                  </div>

                  {finalInspection ? (
                    <>
                      {/* INSPECTION META */}
                      <div className="inspection-meta-grid">
                        <div className="inspection-meta-item">
                          <span>
                            <CheckCircle2 size={15} />
                            Condition
                          </span>

                          <strong
                            className={`inspection-condition ${finalInspection.condition_status ===
                              "damaged"
                              ? "damaged"
                              : "good"
                              }`}
                          >
                            {finalInspection.condition_status ===
                              "damaged" ? (
                              <AlertTriangle size={14} />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}

                            {formatCondition(
                              finalInspection.condition_status
                            )}
                          </strong>
                        </div>

                        <div className="inspection-meta-item">
                          <span>
                            <User size={15} />
                            Inspected By
                          </span>

                          <strong>
                            {finalInspection.users?.name ||
                              "Unavailable"}
                          </strong>
                        </div>

                        <div className="inspection-meta-item">
                          <span>
                            <CalendarDays size={15} />
                            Inspected At
                          </span>

                          <strong>
                            {formatDate(
                              finalInspection.inspected_at
                            )}
                          </strong>
                        </div>
                      </div>

                      {/* DAMAGE */}
                      <div className="inspection-info-block">
                        <div className="inspection-info-title">
                          <AlertTriangle size={15} />
                          <strong>Damage Description</strong>
                        </div>

                        <p>
                          {finalInspection.damage_description ||
                            "No damage was recorded."}
                        </p>
                      </div>

                      {/* NOTES */}
                      <div className="inspection-info-block">
                        <div className="inspection-info-title">
                          <FileText size={15} />
                          <strong>Inspection Notes</strong>
                        </div>

                        <p>
                          {finalInspection.inspection_notes ||
                            "No inspection notes were recorded."}
                        </p>
                      </div>

                      {/* PHOTOS */}
                      <div className="inspection-info-block">
                        <div className="inspection-info-title">
                          <Image size={15} />
                          <strong>
                            Final Inspection Photos
                            {inspectionPhotos.final.length > 0 &&
                              ` (${inspectionPhotos.final.length})`}
                          </strong>
                        </div>

                        {inspectionPhotos.final.length > 0 ? (
                          <div className="inspection-photo-gallery">
                            {inspectionPhotos.final.map(
                              (photo) =>
                                photo.photo_url && (
                                  <button
                                    type="button"
                                    className="inspection-photo-card"
                                    key={photo.id}
                                    onClick={() =>
                                      openPhoto(
                                        photo,
                                        inspectionPhotos.final
                                      )
                                    }
                                  >
                                    <img
                                      src={photo.photo_url}
                                      alt="Final vehicle inspection"
                                    />

                                    <span>View photo</span>
                                  </button>
                                )
                            )}
                          </div>
                        ) : (
                          <div className="inspection-photo-empty">
                            <Image size={20} />
                            <span>
                              No final inspection photos uploaded.
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="session-inspection-message">
                      <Image size={18} />
                      <span>
                        Final inspection not recorded.
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* HISTORY */}
            <h4>
              <Clock3 size={15} />
              Inspection History
            </h4>

            {history.length === 0 ? (
              <p className="session-muted">
                No previous inspections.
              </p>
            ) : (
              <div className="inspection-history-list">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="inspection-history-item"
                  >
                    <div>
                      <strong>
                        {formatDate(item.inspected_at)}
                      </strong>

                      <span
                        className={`history-condition ${item.condition_status === "damaged"
                          ? "damaged"
                          : "good"
                          }`}
                      >
                        {formatCondition(
                          item.condition_status
                        )}
                      </span>
                    </div>

                    <span>
                      {item.damage_description ||
                        item.inspection_notes ||
                        "No notes recorded"}
                    </span>

                    {item.users?.name && (
                      <small>
                        Inspected by {item.users.name}
                      </small>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FOOTER */}
        <div className="modal-footer">
          <button
            className="modal-btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      {/* PHOTO LIGHTBOX */}
      {selectedPhoto && (
        <div
          className="inspection-photo-lightbox"
          onClick={closePhoto}
        >
          <button
            type="button"
            className="inspection-lightbox-close"
            onClick={closePhoto}
            aria-label="Close photo preview"
          >
            <X size={22} />
          </button>

          {selectedPhotoList.length > 1 && (
            <>
              <button
                type="button"
                className="inspection-lightbox-nav previous"
                onClick={showPreviousPhoto}
                aria-label="Previous photo"
              >
                <ChevronLeft size={28} />
              </button>

              <button
                type="button"
                className="inspection-lightbox-nav next"
                onClick={showNextPhoto}
                aria-label="Next photo"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}

          <img
            src={selectedPhoto.photo_url}
            alt="Vehicle inspection enlarged"
            onClick={(event) => event.stopPropagation()}
          />

          <div className="inspection-lightbox-counter">
            {selectedPhotoList.findIndex(
              (photo) => photo.id === selectedPhoto.id
            ) + 1}{" "}
            / {selectedPhotoList.length}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReceptionSessionDetailsModal;



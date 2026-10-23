import { useEffect, useMemo, useState } from "react";
import { Camera, ClipboardCheck, Clock3, KeyRound, X } from "lucide-react";
import { getVehicleById, getVehicleInspectionHistory, getInspectionPhotos } from "../../api/receptionApi";
import "./css/ReceptionDashboard.css";

const ACTIVE = ["checked_in", "parked", "retrieval_requested", "retrieving", "ready_for_pickup"];
const formatDate = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Not recorded";

export default function ReceptionVehicleDetailsModal({ vehicle, sessions = [], onClose }) {
  const [details, setDetails] = useState(vehicle);
  const [history, setHistory] = useState([]);
  const [historyPhotos, setHistoryPhotos] = useState({});
  const [loading, setLoading] = useState(true);
  const current = useMemo(() => sessions.find((s) => s.vehicle?.id === vehicle.id && ACTIVE.includes(s.status)), [sessions, vehicle.id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [vehicleResponse, historyResponse] = await Promise.all([
          getVehicleById(vehicle.id).catch(() => null),
          getVehicleInspectionHistory(vehicle.id).catch(() => null),
        ]);
        const inspections = historyResponse?.inspections || [];
        if (mounted) {
          setDetails(vehicleResponse?.vehicle || vehicle);
          setHistory(inspections);
        }
        const photoEntries = await Promise.all(inspections.map(async (inspection) => [inspection.id, (await getInspectionPhotos(inspection.id).catch(() => null))?.photos || []]));
        if (mounted) setHistoryPhotos(Object.fromEntries(photoEntries));
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [vehicle]);

  return (
    <div className="reception-modal-overlay" onClick={onClose}>
      <div className="reception-modal reception-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reception-modal-header"><div><p className="modal-eyebrow">VEHICLE DETAILS</p><h3>{details.license_plate || "Vehicle"}</h3><span>{details.make} {details.model}</span></div><button className="modal-close-btn" onClick={onClose}><X size={18} /></button></div>
        {loading ? <div className="reception-table-loading">Loading vehicle details...</div> : <div className="modal-form-body">
          <div className="detail-summary-grid">
            <div><span>Vehicle ID</span><strong>{details.id}</strong></div><div><span>License Plate</span><strong>{details.license_plate}</strong></div>
            <div><span>Make / Model</span><strong>{details.make} {details.model}</strong></div><div><span>Color</span><strong>{details.color || "—"}</strong></div>
            <div><span>Customer / Owner</span><strong>{details.customer?.name || "—"}</strong></div><div><span>Phone</span><strong>{details.customer?.phone || "—"}</strong></div>
          </div>

          <section className="detail-section"><div className="detail-section-heading"><KeyRound size={16} /><h4>Current Parking Status</h4></div>
            {current ? <div className="detail-session-card"><div><span>Status</span><strong>{current.status}</strong></div><div><span>Slot</span><strong>{current.parking_slot || "Not assigned"}</strong></div><div><span>Ticket</span><strong>{current.ticket_code}</strong></div><div><span>Parking Type</span><strong>{current.parking_type || "—"}</strong></div><div><span>Valet</span><strong>{current.valet?.name || "Not assigned"}</strong></div></div> : <p className="session-muted">Vehicle is not in an active parking session.</p>}
          </section>

          <section className="detail-section"><div className="detail-section-heading"><ClipboardCheck size={16} /><h4>Inspection History</h4></div>
            {history.length ? history.map((item) => <div className="inspection-history-card" key={item.id}>
              <div className="inspection-history-header"><div><strong>{item.condition_status === "damaged" ? "Damaged" : "Good"}</strong><span>{formatDate(item.inspected_at)}</span></div><span>{item.users?.name || "Reception staff"}</span></div>
              <p><b>Damage:</b> {item.damage_description || "None recorded"}</p><p><b>Notes:</b> {item.inspection_notes || "None recorded"}</p>
              {(historyPhotos[item.id] || []).length > 0 && <div className="inspection-photo-gallery">{historyPhotos[item.id].map((photo) => photo.photo_url && <img key={photo.id} src={photo.photo_url} alt="Vehicle inspection" />)}</div>}
            </div>) : <p className="session-muted">No inspections have been recorded for this vehicle.</p>}
          </section>
          <section className="detail-section"><div className="detail-section-heading"><Camera size={16} /><h4>Inspection Photos</h4></div><p className="session-muted">Only photos stored by the inspection API are shown. No dummy images are used.</p></section>
        </div>}
        <div className="modal-footer"><button className="modal-btn-secondary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

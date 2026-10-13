import { useMemo } from "react";
import { Car, Clock3, X } from "lucide-react";
import "./css/ReceptionDashboard.css";

const formatDate = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Not recorded";

export default function ReceptionCustomerDetailsModal({ customer, sessions = [], onClose, onViewVehicle }) {
  const customerSessions = useMemo(() => sessions.filter((s) => s.vehicle?.customer?.id === customer.id), [sessions, customer.id]);
  const current = customerSessions.find((s) => ["checked_in", "parked", "retrieval_requested", "retrieving", "ready_for_pickup"].includes(s.status));
  const previous = customerSessions.filter((s) => s.status === "returned_completed");

  return (
    <div className="reception-modal-overlay" onClick={onClose}>
      <div className="reception-modal reception-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reception-modal-header">
          <div><p className="modal-eyebrow">CUSTOMER DETAILS</p><h3>{customer.name}</h3><span>{customer.email || "No email registered"}</span></div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-form-body">
          <div className="detail-summary-grid">
            <div><span>Customer ID</span><strong>{customer.id}</strong></div>
            <div><span>Phone</span><strong>{customer.phone || "—"}</strong></div>
            <div><span>Email</span><strong>{customer.email || "—"}</strong></div>
            <div><span>Registered</span><strong>{formatDate(customer.created_at)}</strong></div>
          </div>

          <section className="detail-section">
            <div className="detail-section-heading"><Car size={16} /><h4>Registered Vehicles</h4></div>
            {customer.vehicles?.length ? customer.vehicles.map((vehicle) => (
              <button className="detail-list-row clickable" key={vehicle.id} onClick={() => onViewVehicle?.(vehicle)}>
                <span><strong>{vehicle.license_plate}</strong><small>{vehicle.make} {vehicle.model}{vehicle.color ? ` · ${vehicle.color}` : ""}</small></span>
                <span className="detail-link">View</span>
              </button>
            )) : <p className="session-muted">No registered vehicles.</p>}
          </section>

          <section className="detail-section">
            <div className="detail-section-heading"><Clock3 size={16} /><h4>Current Active Session</h4></div>
            {current ? (
              <div className="detail-session-card"><div><span>Ticket</span><strong>{current.ticket_code}</strong></div><div><span>Vehicle</span><strong>{current.vehicle?.license_plate || "—"}</strong></div><div><span>Status</span><strong>{current.status}</strong></div><div><span>Slot</span><strong>{current.parking_slot || "Not assigned"}</strong></div></div>
            ) : <p className="session-muted">No active parking session.</p>}
          </section>

          <section className="detail-section">
            <div className="detail-section-heading"><Clock3 size={16} /><h4>Previous Parking History</h4></div>
            {previous.length ? previous.map((s) => (
              <div className="detail-history-row" key={s.id}><div><strong>{s.ticket_code}</strong><span>{s.vehicle?.license_plate || "—"} · {s.parking_type || "—"}</span></div><div><span>Returned</span><strong>{formatDate(s.completed_at)}</strong></div></div>
            )) : <p className="session-muted">No previous parking history is available in the loaded session data.</p>}
          </section>
        </div>
        <div className="modal-footer"><button className="modal-btn-secondary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

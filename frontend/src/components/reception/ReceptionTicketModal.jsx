import { useState } from "react";
import { CheckCircle2, Search, X } from "lucide-react";
import { completeReceptionHandover, verifyReceptionTicket } from "../../api/receptionApi";
import "./css/ReceptionDashboard.css";
import "./css/ReceptionVehicleModal.css";

function ReceptionTicketModal({ onClose, onComplete }) {
  const [ticket, setTicket] = useState("");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);

  const verify = async (event) => {
    event.preventDefault();
    if (!ticket.trim()) return;
    try {
      setLoading(true);
      setError("");
      const response = await verifyReceptionTicket(ticket.trim().toUpperCase());
      setSession(response?.session || null);
      setVerified(true);
    } catch (err) {
      setError(err?.message || "Unable to verify this ticket.");
      setSession(null);
      setVerified(false);
    } finally {
      setLoading(false);
    }
  };

  const complete = async () => {
    if (!session || session.status !== "ready_for_pickup") return;
    try {
      setCompleting(true);
      setError("");
      await completeReceptionHandover(session.id);
      onComplete?.();
      onClose();
    } catch (err) {
      setError(err?.message || "Unable to complete vehicle handover.");
    } finally {
      setCompleting(false);
    }
  };

  return <div className="reception-modal-overlay" onClick={onClose}><div className="reception-modal" onClick={(event) => event.stopPropagation()}>
    <div className="reception-modal-header"><div><p className="modal-eyebrow">HANDOVER</p><h3>Verify Ticket / QR</h3><span>Verify the vehicle before customer handover.</span></div><button className="modal-close-btn" onClick={onClose}><X size={18} /></button></div>
    <form className="modal-form-body" onSubmit={verify}><div className="modal-field"><label>Ticket Code</label><div className="modal-input-wrap"><Search size={15} /><input value={ticket} onChange={(event) => setTicket(event.target.value.toUpperCase())} placeholder="Enter ticket code" /></div></div><button className="modal-btn-primary" type="submit" disabled={loading}>{loading ? "Verifying..." : "Verify Ticket"}</button></form>
    {error && <div className="modal-error">{error}</div>}
    {verified && session && <div className="reception-ticket-result"><div className="ticket-result-status"><CheckCircle2 size={18} /> Ticket verified</div><div className="ticket-result-grid"><span>Ticket<strong>{session.ticket_code || "Unavailable"}</strong></span><span>Customer<strong>{session.vehicle?.customer?.name || "Unavailable"}</strong></span><span>Vehicle<strong>{session.vehicle?.license_plate || "Unavailable"}</strong></span><span>Parking Type<strong>{session.parking_type || "Unavailable"}</strong></span><span>Slot<strong>{session.parking_slot || "Unavailable"}</strong></span><span>Status<strong>{session.status || "Unavailable"}</strong></span><span>Valet<strong>{session.valet?.name || "Unavailable"}</strong></span></div>{session.status === "ready_for_pickup" ? <button className="modal-btn-primary" type="button" onClick={complete} disabled={completing}>{completing ? "Completing Handover..." : "Complete Handover"}</button> : <p className="ticket-result-note">Handover becomes available when the valet marks this vehicle ready for pickup.</p>}</div>}
  </div></div>;
}

export default ReceptionTicketModal;

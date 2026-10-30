import { useState } from "react";
import { MessageCircle, Search, CarFront } from "lucide-react";

import {
  verifyReceptionTicket,
  requestReceptionRetrieval,
} from "../../api/receptionApi";

/**
 * "Customer messaged us on WhatsApp" helper.
 * The customer's message contains the ticket code. The valet types it here,
 * confirms the car and creates the retrieval request - no API needed.
 */
const WhatsAppRetrieval = ({ onRequested }) => {
  const [ticket, setTicket] = useState("");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const lookup = async (event) => {
    event.preventDefault();
    const code = ticket.trim().toUpperCase();
    if (!code) return;

    try {
      setLoading(true);
      setMessage({ type: "", text: "" });
      setSession(null);
      const res = await verifyReceptionTicket(code);
      setSession(res?.session || null);
      if (!res?.session) {
        setMessage({ type: "error", text: "No car found for this ticket." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err?.message || "Ticket not found." });
    } finally {
      setLoading(false);
    }
  };

  const request = async () => {
    try {
      setLoading(true);
      await requestReceptionRetrieval(session.id);
      setMessage({
        type: "success",
        text: `Retrieval requested for ${session.vehicle?.license_plate || "the car"}.`,
      });
      setSession(null);
      setTicket("");
      onRequested?.();
    } catch (err) {
      setMessage({ type: "error", text: err?.message || "Could not request retrieval." });
    } finally {
      setLoading(false);
    }
  };

  const vehicle = session?.vehicle || {};
  const canRequest = session?.status === "parked";

  return (
    <div className="whatsapp-retrieval-card">
      <div className="whatsapp-retrieval-title">
        <MessageCircle size={18} />
        <div>
          <strong>Request from WhatsApp</strong>
          <span>Any valet can take this, even if you did not park the car.</span>
        </div>
      </div>

      <form className="whatsapp-retrieval-form" onSubmit={lookup}>
        <input
          value={ticket}
          onChange={(e) => setTicket(e.target.value.toUpperCase())}
          placeholder="Ticket code"
        />
        <button type="submit" className="primary-action" disabled={loading || !ticket.trim()}>
          <Search size={15} />
          Find car
        </button>
      </form>

      {message.text && (
        <div className={message.type === "error" ? "page-error" : "page-success"}>
          {message.text}
        </div>
      )}

      {session && (
        <div className="whatsapp-retrieval-result">
          <CarFront size={20} />
          <div>
            <strong>{vehicle.license_plate || "Vehicle"}</strong>
            <span>
              {vehicle.customer?.name || "Customer"} · Slot {session.parking_slot || "—"} ·{" "}
              {String(session.status || "").replaceAll("_", " ")}
            </span>
          </div>

          {canRequest ? (
            <button type="button" className="primary-action" onClick={request} disabled={loading}>
              Request Retrieval
            </button>
          ) : (
            <small>
              {session.status === "retrieval_requested" || session.status === "retrieving"
                ? "Already requested."
                : "This car cannot be requested right now."}
            </small>
          )}
        </div>
      )}
    </div>
  );
};

export default WhatsAppRetrieval;

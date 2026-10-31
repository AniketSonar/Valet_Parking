import { useCallback, useEffect, useState } from "react";
import { History, RefreshCw, X } from "lucide-react";
import { getCustomerHistory } from "../../api/customerApi";
import "./css/CustomerPortal.css";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "Unavailable";

function ParkingHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => { try { setLoading(true); setError(""); const response = await getCustomerHistory(); setHistory(response?.history || []); } catch { setError("Unable to load your parking history."); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  return <main className="customer-page"><header className="customer-page-header"><div><span className="customer-eyebrow">ACTIVITY</span><h1>Parking History</h1><p>Completed parking sessions from your account.</p></div><button type="button" className="customer-action-button secondary" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? "customer-spin" : ""} /> Refresh</button></header>
    {error && <div className="customer-alert error"><span>{error}</span><button type="button" onClick={() => setError("")}><X size={16} /></button></div>}
    {loading ? <div className="customer-state"><RefreshCw className="customer-spin" size={26} /><p>Loading your parking history...</p></div> : history.length === 0 ? <div className="customer-empty-state"><div className="customer-empty-icon"><History size={28} /></div><h3>No Completed Sessions</h3><p>Your completed parking sessions will appear here.</p></div> : <div className="customer-history-card"><div className="customer-history-table-wrap"><table className="customer-history-table"><thead><tr><th>TICKET</th><th>VEHICLE</th><th>TYPE</th><th>SLOT</th><th>CHECK-IN</th><th>COMPLETED</th><th>DURATION</th></tr></thead><tbody>{history.map((session) => <tr key={session.id}><td><strong>{session.ticket_code || "Unavailable"}</strong></td><td><strong>{session.vehicle?.license_plate || "Unavailable"}</strong><small>{[session.vehicle?.make, session.vehicle?.model].filter(Boolean).join(" ") || ""}</small></td><td>{session.parking_type || "Unavailable"}</td><td>{session.parking_slot || "Unavailable"}</td><td>{formatDate(session.checked_in_at)}</td><td>{formatDate(session.completed_at)}</td><td>{session.parking_duration || "Unavailable"}</td></tr>)}</tbody></table></div><div className="customer-history-footer">Showing {history.length} completed session{history.length === 1 ? "" : "s"}</div></div>}
  </main>;
}

export default ParkingHistory;

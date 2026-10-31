import { useCallback, useEffect, useState } from "react";
import { CarFront, Clock3, RefreshCw, X } from "lucide-react";
import { getCustomerVehicles } from "../../api/customerApi";
import "./css/CustomerPortal.css";

const statusLabels = { checked_in: "Checked In", parked: "Parked", retrieval_requested: "Retrieval Requested", retrieving: "Retrieving", ready_for_pickup: "Ready for Pickup" };

function MyVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => { try { setLoading(true); setError(""); const response = await getCustomerVehicles(); setVehicles(response?.vehicles || []); } catch { setError("Unable to load your vehicles."); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  return <main className="customer-page">
    <header className="customer-page-header"><div><span className="customer-eyebrow">MY ACCOUNT</span><h1>My Vehicles</h1><p>Vehicles registered to your customer account.</p></div><button type="button" className="customer-action-button secondary" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? "customer-spin" : ""} /> Refresh</button></header>
    {error && <div className="customer-alert error"><span>{error}</span><button type="button" onClick={() => setError("")}><X size={16} /></button></div>}
    {loading ? <div className="customer-state"><RefreshCw className="customer-spin" size={26} /><p>Loading your vehicles...</p></div> : vehicles.length === 0 ? <div className="customer-empty-state"><div className="customer-empty-icon"><CarFront size={28} /></div><h3>No Vehicles Registered</h3><p>There are no vehicles linked to your customer account yet.</p></div> : <div className="customer-vehicle-grid">{vehicles.map((vehicle) => { const session = vehicle.current_session; return <article className="customer-vehicle-card" key={vehicle.id}><div className="customer-vehicle-card-top"><div className="customer-vehicle-mark"><CarFront size={22} /></div><div><h3>{vehicle.license_plate || "Plate unavailable"}</h3><p>{[vehicle.make, vehicle.model, vehicle.color].filter(Boolean).join(" · ") || "Vehicle details unavailable"}</p></div></div><div className="customer-vehicle-info"><span><small>Current Status</small><strong className={session ? `customer-inline-status status-${session.status}` : "customer-muted"}>{session ? statusLabels[session.status] || session.status : "No active session"}</strong></span><span><small>Ticket</small><strong>{session?.ticket_code || "Unavailable"}</strong></span><span><small>Parking Slot</small><strong>{session?.parking_slot || "Unavailable"}</strong></span><span><small><Clock3 size={12} /> Check-in</small><strong>{session?.checked_in_at ? new Date(session.checked_in_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }) : "Unavailable"}</strong></span></div></article>; })}</div>}
  </main>;
}

export default MyVehicles;

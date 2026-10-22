import { useCallback, useEffect, useState } from "react";
import { Mail, Phone, RefreshCw, UserRound, X } from "lucide-react";
import { getCustomerProfile } from "../../api/customerApi";
import "./css/CustomerPortal.css";

function CustomerProfile() {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => { try { setLoading(true); setError(""); const response = await getCustomerProfile(); setCustomer(response?.customer || null); } catch { setError("Unable to load your profile."); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const initials = customer?.name?.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "C";

  return <main className="customer-page"><header className="customer-page-header"><div><span className="customer-eyebrow">ACCOUNT</span><h1>Profile</h1><p>Your AURA customer account information.</p></div><button type="button" className="customer-action-button secondary" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? "customer-spin" : ""} /> Refresh</button></header>
    {error && <div className="customer-alert error"><span>{error}</span><button type="button" onClick={() => setError("")}><X size={16} /></button></div>}
    {loading ? <div className="customer-state"><RefreshCw className="customer-spin" size={26} /><p>Loading your profile...</p></div> : !customer ? <div className="customer-empty-state"><UserRound size={28} /><h3>Profile Unavailable</h3><p>Your customer profile could not be found.</p></div> : <section className="customer-profile-card"><div className="customer-profile-hero"><div className="customer-large-avatar">{initials}</div><div><h2>{customer.name || "Customer"}</h2><span>Customer account</span></div></div><div className="customer-profile-grid"><div><UserRound size={18} /><span><small>Name</small><strong>{customer.name || "Unavailable"}</strong></span></div><div><Mail size={18} /><span><small>Email</small><strong>{customer.email || "Unavailable"}</strong></span></div><div><Phone size={18} /><span><small>Phone</small><strong>{customer.phone || "Unavailable"}</strong></span></div>{customer.created_at && <div><UserRound size={18} /><span><small>Account Created</small><strong>{new Date(customer.created_at).toLocaleDateString()}</strong></span></div>}</div></section>}
  </main>;
}

export default CustomerProfile;

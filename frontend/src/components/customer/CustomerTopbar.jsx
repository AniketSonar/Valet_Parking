import { ChevronDown, Search } from "lucide-react";
import NotificationCenter from "../notifications/NotificationCenter";
import "./css/CustomerPortal.css";

function CustomerTopbar({ customer, onProfile }) {
  const name = customer?.name || "Customer";

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "C";

  return (
    <header className="customer-topbar">
      <div className="customer-breadcrumb">
        <span>Customer Portal</span>
        <strong>/ {"Dashboard"}</strong>
      </div>

      <div className="customer-topbar-actions">
        <div className="customer-topbar-search">
          <Search size={16} />
          <input
            aria-label="Search"
            placeholder="Search your vehicles..."
          />
        </div>

        <NotificationCenter />

        <button
          type="button"
          className="customer-profile-chip"
          onClick={onProfile}
        >
          <span className="customer-avatar">
            {initials}
          </span>

          <span className="customer-profile-meta">
            <strong>{name}</strong>
            <small>Customer</small>
          </span>

          <ChevronDown size={15} />
        </button>
      </div>
    </header>
  );
}

export default CustomerTopbar;
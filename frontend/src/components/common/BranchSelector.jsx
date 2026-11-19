import React from "react";
import { Building2 } from "lucide-react";
import "./BranchSelector.css";

/**
 * BranchSelector - Displays all hotel branches as visible pills/chips/cards.
 * Eliminates hidden dropdowns across all modules.
 *
 * Props:
 * - hotels: Array of hotel objects (id, building_name, location, etc.)
 * - selectedHotel: Currently selected hotel id ('all' or building id)
 * - onSelectHotel: Callback when a branch is clicked (id) => void
 * - showAllOption: Whether to include an "All Branches" option (default: true)
 * - allLabel: Label for the all option (default: "All Branches")
 * - label: Optional header label (e.g. "Hotel Branch:")
 * - size: "sm" | "md" | "lg" (default: "md")
 * - variant: "pills" | "cards" (default: "pills")
 */
export default function BranchSelector({
  hotels = [],
  selectedHotel = "all",
  onSelectHotel = () => {},
  showAllOption = true,
  allLabel = "All Branches",
  label = "",
  size = "md",
  variant = "pills",
}) {
  const userRole = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}")?.role;
    } catch {
      return null;
    }
  })();

  const isManager = userRole === "manager" || userRole === "parking_admin";
  const effectiveShowAll = isManager ? false : showAllOption;
  return (
    <div className={`branch-selector-wrapper branch-selector-${size} branch-selector-${variant}`}>
      {label && (
        <span className="branch-selector-title">
          <Building2 size={15} className="branch-selector-icon" />
          {label}
        </span>
      )}

      <div className="branch-selector-list" role="tablist" aria-label="Branch selector">
        {effectiveShowAll && (
          <button
            type="button"
            role="tab"
            aria-selected={selectedHotel === "all"}
            className={`branch-pill ${selectedHotel === "all" ? "active" : ""}`}
            onClick={() => onSelectHotel("all")}
          >
            <Building2 size={14} className="branch-pill-icon" />
            <span className="branch-pill-name">{allLabel}</span>
            {hotels.length > 0 && (
              <span className="branch-pill-count">{hotels.length}</span>
            )}
          </button>
        )}

        {hotels.map((h) => {
          const isSelected = selectedHotel === h.id;
          const name = h.building_name || h.name || "Branch";
          const loc = h.location && h.location !== name ? h.location : "";

          return (
            <button
              key={h.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`branch-pill ${isSelected ? "active" : ""}`}
              onClick={() => onSelectHotel(h.id)}
              title={`${name}${loc ? ` - ${loc}` : ""}`}
            >
              <span className={`branch-status-dot ${isSelected ? "active" : ""}`} />
              <span className="branch-pill-name">{name}</span>
              {loc && <span className="branch-pill-location">{loc}</span>}
            </button>
          );
        })}

        {hotels.length === 0 && (
          <span className="branch-selector-empty">No branches available</span>
        )}
      </div>
    </div>
  );
}

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
  const currentUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const userRole = currentUser?.role;
  const isManager = userRole === "manager" || userRole === "parking_admin";
  const assignedHotelId = currentUser?.assigned_hotel_id;

  // For manager, strictly restrict to their assigned hotel branch
  const effectiveHotels = React.useMemo(() => {
    if (!isManager) return hotels;
    if (assignedHotelId) {
      const match = hotels.filter((h) => h.id === assignedHotelId);
      if (match.length > 0) return match;
    }
    // If backend already filtered to manager's branch (1 branch), use it
    if (hotels.length === 1) return hotels;
    // Fallback: first hotel
    return hotels.slice(0, 1);
  }, [hotels, isManager, assignedHotelId]);

  // If manager has 'all' selected, automatically snap to their assigned hotel
  React.useEffect(() => {
    if (isManager && selectedHotel === "all" && effectiveHotels.length > 0) {
      onSelectHotel(effectiveHotels[0].id);
    }
  }, [isManager, selectedHotel, effectiveHotels, onSelectHotel]);

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
            {effectiveHotels.length > 0 && (
              <span className="branch-pill-count">{effectiveHotels.length}</span>
            )}
          </button>
        )}

        {effectiveHotels.map((h) => {
          const isSelected = selectedHotel === h.id || (isManager && effectiveHotels.length === 1);
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
              title={isManager ? `Assigned Branch: ${name}` : `${name}${loc ? ` - ${loc}` : ""}`}
              style={isManager ? { cursor: "default" } : {}}
            >
              <span className={`branch-status-dot ${isSelected ? "active" : ""}`} />
              <span className="branch-pill-name">{name}</span>
              {!isManager && loc ? (
                <span className="branch-pill-location">{loc}</span>
              ) : null}
            </button>
          );
        })}

        {effectiveHotels.length === 0 && (
          <span className="branch-selector-empty">No branches available</span>
        )}
      </div>
    </div>
  );
}

import React from "react";
import { Building2, MapPin, Layers, Car, ShieldCheck, CheckCircle2 } from "lucide-react";
import "./BranchDashboardCards.css";

/**
 * BranchDashboardCards
 *
 * Renders individual hotel branches side by side in a grid/flex layout.
 * Each branch card displays its name, location, slot capacity, floors, and active status.
 * Clicking a branch card switches to that branch's dashboard immediately.
 */
export default function BranchDashboardCards({
  hotels = [],
  selectedHotel = "all",
  onSelectHotel = () => {},
  totalStats = null,
}) {
  const isAllSelected = selectedHotel === "all";

  // Calculate combined metrics for the "All Branches" card
  const totalSlotsCombined = hotels.reduce((acc, h) => acc + (h.slots_count || 0), 0);
  const totalFloorsCombined = hotels.reduce((acc, h) => acc + (h.floors_count || 0), 0);

  return (
    <section className="branch-cards-section" aria-label="Branch Dashboards">
      <div className="branch-cards-header">
        <div className="branch-cards-title-wrap">
          <Building2 size={18} className="branch-cards-title-icon" />
          <h2 className="branch-cards-heading">Hotel Branches</h2>
          <span className="branch-cards-badge">{hotels.length} Active Branches</span>
        </div>
        <p className="branch-cards-sub">
          Click any branch card below to open and view its dedicated branch dashboard.
        </p>
      </div>

      <div className="branch-cards-grid">
        {/* All Branches Overview Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectHotel("all")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectHotel("all");
            }
          }}
          className={`branch-card branch-card-all ${isAllSelected ? "active" : ""}`}
        >
          <div className="branch-card-top">
            <div className="branch-card-icon-wrap all">
              <Building2 size={22} />
            </div>
            <div className="branch-card-status-badge">
              {isAllSelected ? (
                <span className="branch-status-viewing">
                  <CheckCircle2 size={13} /> Active View
                </span>
              ) : (
                <span className="branch-status-view">Click to View</span>
              )}
            </div>
          </div>

          <div className="branch-card-content">
            <h3 className="branch-card-name">All Hotel Branches</h3>
            <div className="branch-card-location">
              <MapPin size={13} />
              <span>Combined Global Operations</span>
            </div>
          </div>

          <div className="branch-card-divider" />

          <div className="branch-card-metrics">
            <div className="branch-card-metric-col">
              <span className="metric-label">Total Branches</span>
              <span className="metric-val">{hotels.length}</span>
            </div>
            <div className="branch-card-metric-col">
              <span className="metric-label">Total Slots</span>
              <span className="metric-val">{totalSlotsCombined > 0 ? totalSlotsCombined : (totalStats?.availableSlots ? totalStats.availableSlots + (totalStats.activeParkingSessions || 0) : "Live")}</span>
            </div>
            <div className="branch-card-metric-col">
              <span className="metric-label">Total Levels</span>
              <span className="metric-val">{totalFloorsCombined > 0 ? totalFloorsCombined : "All"}</span>
            </div>
          </div>

          <div className="branch-card-footer">
            <span className="branch-card-action-text">
              {isAllSelected ? "Currently Viewing Combined Dashboard" : "Switch to Combined Dashboard →"}
            </span>
          </div>
        </div>

        {/* Individual Branch Cards (Side by Side) */}
        {hotels.map((h) => {
          const isSelected = selectedHotel === h.id;
          const name = h.building_name || h.name || "Hotel Branch";
          const loc = h.location && h.location !== name ? h.location : (h.display_address || "City Location");
          const slots = h.slots_count ?? 0;
          const floors = h.floors_count ?? 0;
          const staff = h.staff_count ?? h.total_staff ?? 0;

          return (
            <div
              key={h.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectHotel(h.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectHotel(h.id);
                }
              }}
              className={`branch-card ${isSelected ? "active" : ""}`}
            >
              <div className="branch-card-top">
                <div className="branch-card-icon-wrap">
                  <Building2 size={22} />
                </div>
                <div className="branch-card-status-badge">
                  {isSelected ? (
                    <span className="branch-status-viewing">
                      <CheckCircle2 size={13} /> Active Branch
                    </span>
                  ) : (
                    <span className="branch-status-view">Click to View</span>
                  )}
                </div>
              </div>

              <div className="branch-card-content">
                <h3 className="branch-card-name" title={name}>{name}</h3>
                <div className="branch-card-location" title={loc}>
                  <MapPin size={13} />
                  <span>{loc}</span>
                </div>
              </div>

              <div className="branch-card-divider" />

              <div className="branch-card-metrics">
                <div className="branch-card-metric-col">
                  <span className="metric-label">Capacity</span>
                  <span className="metric-val">{slots > 0 ? `${slots} bays` : "Active"}</span>
                </div>
                <div className="branch-card-metric-col">
                  <span className="metric-label">Levels</span>
                  <span className="metric-val">{floors > 0 ? `${floors} fl` : "1 lvl"}</span>
                </div>
                <div className="branch-card-metric-col">
                  <span className="metric-label">Staff</span>
                  <span className="metric-val">{staff > 0 ? staff : "Assigned"}</span>
                </div>
              </div>

              <div className="branch-card-footer">
                <span className="branch-card-action-text">
                  {isSelected ? `Currently Viewing ${name} Dashboard` : `Open ${name} Dashboard →`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

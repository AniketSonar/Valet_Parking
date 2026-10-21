import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Users, UserCheck, Shield, Car, Check, CircleDot, Clock, TriangleAlert } from "lucide-react";
import { getParkingStaff, getParkingSessions, assignValet } from "../../api/parkingApi";
import "./css/ValetManagement.css";



const getInitials = (name) => {
  if (!name) return "NA";
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const formatRoleLabel = (role) => {
  const labels = {
    valet: "Valet",
    reception_security: "Security / Reception",
    cashier: "Cashier",
    parking_admin: "Parking Admin",
  };
  return labels[role] || role || "Staff";
};

function ValetManagement() {
  const [staff, setStaff] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [assigningStaff, setAssigningStaff] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [staffRes, sessionsRes] = await Promise.all([
        getParkingStaff(),
        getParkingSessions({
          status: "checked_in,parked,retrieval_requested,retrieving,ready_for_pickup"
        }),
      ]);

      if (staffRes && staffRes.success) {
        setStaff(staffRes.staff || []);
      } else {
        throw new Error(staffRes?.message || "Failed to load staff.");
      }

      if (sessionsRes && sessionsRes.success) {
        setActiveSessions(sessionsRes.sessions || []);
      }
    } catch (err) {
      console.error("Load valet management data error:", err);
      setError(err.message || "Failed to load valet staff and operations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derive staff status and active assignment
  const staffWithStatus = useMemo(() => {
    return staff.map((member) => {
      const activeAssignment = activeSessions.find(
        (s) => s.valet?.id === member.id
      );

      let availability = "Offline";
      if (member.is_active) {
        availability = activeAssignment ? "Busy" : "Available";
      }

      return {
        ...member,
        displayRole: formatRoleLabel(member.role),
        availability,
        assignment: activeAssignment
          ? activeAssignment.vehicle?.license_plate || `Session #${activeAssignment.id}`
          : "No assignment",
        status: member.is_active ? "Active" : "Inactive",
      };
    });
  }, [staff, activeSessions]);

  const filteredStaff = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return staffWithStatus.filter((member) => {
      const matchesSearch =
        !search ||
        member.name?.toLowerCase().includes(search) ||
        member.email?.toLowerCase().includes(search) ||
        member.assignment?.toLowerCase().includes(search);

      const matchesRole =
        roleFilter === "all" ||
        member.role === roleFilter ||
        member.displayRole === roleFilter;

      const matchesAvailability =
        availabilityFilter === "all" ||
        member.availability.toLowerCase() === availabilityFilter.toLowerCase();

      return matchesSearch && matchesRole && matchesAvailability;
    });
  }, [staffWithStatus, searchTerm, roleFilter, availabilityFilter]);

  const totalStaff = staffWithStatus.length;
  const activeCount = staffWithStatus.filter((m) => m.status === "Active").length;
  const availableCount = staffWithStatus.filter((m) => m.availability === "Available").length;
  const busyCount = staffWithStatus.filter((m) => m.availability === "Busy").length;

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assigningStaff || !selectedSessionId) return;

    try {
      setSubmittingAssign(true);
      setError("");

      const res = await assignValet(selectedSessionId, assigningStaff.id);
      if (res && res.success) {
        setSuccessMessage(`Valet ${assigningStaff.name} assigned successfully.`);
        setTimeout(() => setSuccessMessage(""), 3500);
        setAssigningStaff(null);
        setSelectedSessionId("");
        await loadData();
      } else {
        throw new Error(res?.message || "Failed to assign valet.");
      }
    } catch (err) {
      console.error("Assign valet error:", err);
      setError(err.message || "Failed to assign valet to session.");
    } finally {
      setSubmittingAssign(false);
    }
  };

  return (
    <div className="parking-staff-page">
      {/* HEADER */}
      <div className="parking-staff-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p className="parking-staff-eyebrow">OPERATIONS</p>
          <h1>Staff / Valets</h1>
          <p>Monitor operational staff availability and active assignments.</p>
        </div>

        <button
          className="create-staff-btn"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "36px", padding: "0 16px" }}
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "refresh-spinning" : ""} />
          <span>{loading ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {successMessage && (
        <div style={{ background: "#ecfdf5", color: "#047857", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontWeight: "600", fontSize: "13px" }}>
          <Check /> {successMessage}
        </div>
      )}

      {error && (
        <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontWeight: "600", fontSize: "13px" }}>
          <TriangleAlert /> {error}
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="parking-staff-summary">
        <div className="parking-staff-summary-card">
          <div className="staff-summary-icon"><Users /></div>
          <div>
            <span>Total Staff</span>
            <strong>{loading ? "--" : totalStaff}</strong>
          </div>
        </div>

        <div className="parking-staff-summary-card">
          <div className="staff-summary-icon"><Check /></div>
          <div>
            <span>Active Staff</span>
            <strong>{loading ? "--" : activeCount}</strong>
          </div>
        </div>

        <div className="parking-staff-summary-card">
          <div className="staff-summary-icon"><CircleDot/></div>
          <div>
            <span>Available</span>
            <strong>{loading ? "--" : availableCount}</strong>
          </div>
        </div>

        <div className="parking-staff-summary-card">
          <div className="staff-summary-icon"><Clock /></div>
          <div>
            <span>Currently Busy</span>
            <strong>{loading ? "--" : busyCount}</strong>
          </div>
        </div>
      </div>

      {/* TABLE CARD */}
      <section className="parking-staff-card">
        <div className="parking-staff-toolbar">
          <div className="parking-staff-search">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search staff by name, email or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="parking-staff-filters">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="valet">Valet</option>
              <option value="reception_security">Security / Reception</option>
              <option value="cashier">Cashier</option>
            </select>

            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
            >
              <option value="all">All Availability</option>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>

        <div className="parking-staff-table-wrapper">
          {loading && filteredStaff.length === 0 ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#7b7389" }}>
              <RefreshCw size={24} className="refresh-spinning" style={{ marginBottom: "12px" }} />
              <div>Loading valet staff...</div>
            </div>
          ) : (
            <table className="parking-staff-table">
              <thead>
                <tr>
                  <th>STAFF MEMBER</th>
                  <th>ROLE</th>
                  <th>EMAIL</th>
                  <th>AVAILABILITY</th>
                  <th>CURRENT ASSIGNMENT</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="parking-staff-empty">
                      <div>
                        <span><Users /></span>
                        <strong>No staff members found</strong>
                        <p>Try changing your search or filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div className="parking-staff-member">
                          <div className="parking-staff-avatar">{getInitials(member.name)}</div>
                          <div>
                            <strong>{member.name}</strong>
                            <span>Staff #{String(member.id).slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="parking-staff-role">{member.displayRole}</span>
                      </td>

                      <td>
                        <span className="parking-staff-phone">{member.email || "N/A"}</span>
                      </td>

                      <td>
                        <span className={`availability-badge availability-${member.availability.toLowerCase()}`}>
                          <span className="availability-dot"></span>
                          {member.availability}
                        </span>
                      </td>

                      <td>
                        <span className={member.assignment === "No assignment" ? "no-assignment" : "staff-assignment"}>
                          {member.assignment}
                        </span>
                      </td>

                      <td>
                        <span className={`staff-status-badge ${member.status === "Active" ? "staff-status-active" : "staff-status-inactive"}`}>
                          {member.status}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="view-staff-btn"
                            onClick={() => setSelectedStaff(member)}
                          >
                            View
                          </button>
                          {member.role === "valet" && member.is_active && (
                            <button
                              className="view-staff-btn"
                              style={{ background: "#f4eef8", color: "#5e3573", borderColor: "#e8dcf0" }}
                              onClick={() => {
                                setAssigningStaff(member);
                                setSelectedSessionId("");
                              }}
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="parking-staff-footer">
          <span>
            Showing <strong>{filteredStaff.length}</strong> of <strong>{staff.length}</strong> staff members
          </span>
        </div>
      </section>

      {/* STAFF DETAILS MODAL */}
      {selectedStaff && (
        <div className="parking-staff-modal-overlay" onClick={() => setSelectedStaff(null)}>
          <div className="parking-staff-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="parking-staff-modal-header">
              <div>
                <p>STAFF PROFILE</p>
                <h2>Staff Details</h2>
                <span>Operational staff information.</span>
              </div>
              <button onClick={() => setSelectedStaff(null)}>×</button>
            </div>

            <div className="parking-staff-profile">
              <div className="parking-staff-large-avatar">{getInitials(selectedStaff.name)}</div>
              <div>
                <h3>{selectedStaff.name}</h3>
                <p>{selectedStaff.displayRole}</p>
                <span className={`availability-badge availability-${selectedStaff.availability.toLowerCase()}`}>
                  <span className="availability-dot"></span>
                  {selectedStaff.availability}
                </span>
              </div>
            </div>

            <div className="parking-staff-details-grid">
              <div>
                <span>Email</span>
                <strong>{selectedStaff.email}</strong>
              </div>
              <div>
                <span>Current Assignment</span>
                <strong>{selectedStaff.assignment}</strong>
              </div>
              <div>
                <span>Account Status</span>
                <strong>{selectedStaff.status}</strong>
              </div>
              <div>
                <span>Staff ID</span>
                <strong>{selectedStaff.id}</strong>
              </div>
            </div>

            <div className="parking-staff-modal-footer">
              <button onClick={() => setSelectedStaff(null)}>Close</button>
              {selectedStaff.role === "valet" && selectedStaff.availability === "Available" && (
                <button
                  className="assign-valet-btn"
                  onClick={() => {
                    setAssigningStaff(selectedStaff);
                    setSelectedStaff(null);
                    setSelectedSessionId("");
                  }}
                >
                  Assign to Vehicle
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN VALET TO SESSION MODAL */}
      {assigningStaff && (
        <div className="parking-staff-modal-overlay" onClick={() => setAssigningStaff(null)}>
          <div className="parking-staff-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="parking-staff-modal-header">
              <div>
                <p>VALET ASSIGNMENT</p>
                <h2>Assign Valet</h2>
                <span>Select a vehicle session for {assigningStaff.name}</span>
              </div>
              <button onClick={() => setAssigningStaff(null)}>×</button>
            </div>

            <form onSubmit={handleAssignSubmit} style={{ padding: "20px 24px" }}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#5a5067", marginBottom: "8px" }}>
                  Select Active Parking Session
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #e8e4ee", padding: "0 12px", fontSize: "13px", outline: "none" }}
                  required
                >
                  <option value="">-- Choose a parking session --</option>
                  {activeSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.vehicle?.license_plate || "No Plate"} - Slot {session.parking_slot || "Unassigned"} ({session.status})
                    </option>
                  ))}
                </select>
                {activeSessions.length === 0 && (
                  <p style={{ fontSize: "12px", color: "#7b7389", marginTop: "6px" }}>
                    No active parking sessions available for assignment.
                  </p>
                )}
              </div>

              <div className="parking-staff-modal-footer" style={{ padding: "0", borderTop: "none" }}>
                <button type="button" onClick={() => setAssigningStaff(null)} disabled={submittingAssign}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="assign-valet-btn"
                  disabled={!selectedSessionId || submittingAssign}
                >
                  {submittingAssign ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ValetManagement;
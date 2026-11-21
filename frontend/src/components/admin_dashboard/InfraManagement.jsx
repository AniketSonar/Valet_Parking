import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2,
  Users,
  Plus,
  Edit2,
  Trash2,
  Layers,
  MapPin,
  Car,
  Search,
  Check,
  AlertCircle,
  RefreshCw,
  X,
  Shield,
  Briefcase,
  Sliders,
  ChevronDown,
  UserCheck,
} from "lucide-react";
import {
  getBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  configureHotel,
  getFloors,
} from "../../api/areaApi";
import {
  getAllStaff,
} from "../../api/adminApi";
import {
  createStaff,
  updateStaff,
  updateStaffStatus,
} from "../../api/staffApi";
import BranchSelector from "../common/BranchSelector";
import "./InfraManagement.css";

export default function InfraManagement() {
  const [activeTab, setActiveTab] = useState("hotels"); // "hotels" | "staff"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Hotels state
  const [hotels, setHotels] = useState([]);
  const [hotelSearch, setHotelSearch] = useState("");

  // Staff state
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffHotel, setSelectedStaffHotel] = useState("all");
  const [staffRoleFilter, setStaffRoleFilter] = useState("all");
  const [staffSearch, setStaffSearch] = useState("");

  // Hotel Modals
  const [showAddHotelModal, setShowAddHotelModal] = useState(false);
  const [showEditHotelModal, setShowEditHotelModal] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [hotelForm, setHotelForm] = useState({
    hotel_name: "",
    location: "",
    address: "",
    manager_id: "",
  });

  // Configure Infra Modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configHotel, setConfigHotel] = useState(null);
  const [configLevels, setConfigLevels] = useState([
    { floor_name: "Basement 1", floor_number: -1, slot_count: 20, block_code: "B1", parking_type: "car" },
    { floor_name: "Ground Floor", floor_number: 0, slot_count: 30, block_code: "G", parking_type: "car" },
    { floor_name: "Level 1", floor_number: 1, slot_count: 25, block_code: "L1", parking_type: "car" },
  ]);

  // Staff Modals
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [statusStaff, setStatusStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "manager",
    hotel_id: "",
    floor_id: "",
    position_name: "",
  });
  const [staffFloors, setStaffFloors] = useState([]);
  const [staffFloorsLoading, setStaffFloorsLoading] = useState(false);
  const [staffFloorsError, setStaffFloorsError] = useState("");

  // Action loading flags
  const [actionLoading, setActionLoading] = useState(false);

  // Load all initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [hotelsRes, staffRes] = await Promise.all([
        getBuildings(),
        getAllStaff(),
      ]);

      if (hotelsRes?.buildings) {
        setHotels(hotelsRes.buildings);
      }
      if (staffRes?.users) {
        setStaffList(staffRes.users);
      }
    } catch (err) {
      console.error("Error loading infra data:", err);
      setError(err?.message || "Failed to load infrastructure data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let active = true;
    if (!showAddStaffModal || staffForm.role !== "valet" || !staffForm.hotel_id) {
      setStaffFloors([]);
      setStaffFloorsLoading(false);
      setStaffFloorsError("");
      return () => {
        active = false;
      };
    }

    setStaffFloors([]);
    setStaffFloorsLoading(true);
    setStaffFloorsError("");
    getFloors(staffForm.hotel_id)
      .then((res) => {
        if (!active) return;
        if (res?.success === false || !Array.isArray(res?.floors)) {
          throw new Error(res?.message || "Failed to load floors for the selected branch.");
        }
        const floors = res.floors;
        setStaffFloors(floors);
        setStaffForm((current) => {
          const currentFloorExists = floors.some((floor) => floor.id === current.floor_id);
          const preferredFloor = floors.find((floor) => Number(floor.floor_number) >= 0) || floors[0];
          return {
            ...current,
            floor_id: currentFloorExists ? current.floor_id : preferredFloor?.id || "",
          };
        });
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error loading floors for staff assignment:", err);
        const message = err?.message || "Failed to load floors for the selected branch.";
        setStaffFloorsError(message);
        setError(message);
      })
      .finally(() => {
        if (active) setStaffFloorsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [showAddStaffModal, staffForm.role, staffForm.hotel_id]);

  const showNotification = (msg, isErr = false) => {
    if (isErr) {
      setError(msg);
      setTimeout(() => setError(""), 5000);
    } else {
      setSuccess(msg);
      setTimeout(() => setSuccess(""), 4000);
    }
  };

  // -------------------------------------------------------------
  // HOTEL ACTIONS
  // -------------------------------------------------------------

  const handleCreateHotel = async (e) => {
    e.preventDefault();
    if (!hotelForm.hotel_name.trim()) {
      showNotification("Hotel name is required.", true);
      return;
    }
    try {
      setActionLoading(true);
      const res = await createBuilding(hotelForm);
      if (res?.success) {
        showNotification("Hotel branch added successfully.");
        setShowAddHotelModal(false);
        setHotelForm({ hotel_name: "", location: "", address: "", manager_id: "" });
        await loadData();
      } else {
        throw new Error(res?.message || "Failed to create hotel.");
      }
    } catch (err) {
      showNotification(err.message || "Failed to create hotel branch.", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateHotel = async (e) => {
    e.preventDefault();
    if (!editingHotel) return;
    try {
      setActionLoading(true);
      const res = await updateBuilding(editingHotel.id, {
        building_name: hotelForm.hotel_name,
        address: hotelForm.address,
        location: hotelForm.location,
        status: editingHotel.status || "active",
        manager_id: hotelForm.manager_id,
      });
      if (res?.success) {
        showNotification("Hotel branch updated successfully.");
        setShowEditHotelModal(false);
        setEditingHotel(null);
        await loadData();
      } else {
        throw new Error(res?.message || "Failed to update hotel.");
      }
    } catch (err) {
      showNotification(err.message || "Failed to update hotel branch.", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteHotel = async (hotel) => {
    if (!window.confirm(`Are you sure you want to delete "${hotel.building_name}"?`)) return;
    try {
      setActionLoading(true);
      const res = await deleteBuilding(hotel.id);
      if (res?.success) {
        showNotification("Hotel branch deleted successfully.");
        await loadData();
      } else {
        throw new Error(res?.message || "Failed to delete hotel.");
      }
    } catch (err) {
      showNotification(err.message || "Cannot delete hotel branch.", true);
    } finally {
      setActionLoading(false);
    }
  };

  // Configure parking levels
  const openConfigModal = async (hotel) => {
    setConfigHotel(hotel);
    setShowConfigModal(true);
    try {
      const res = await getFloors(hotel.id);
      if (res?.floors && Array.isArray(res.floors) && res.floors.length > 0) {
        setConfigLevels(
          res.floors.map((f) => {
            const blockCode = (f.floor_name || "L").replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "L1";
            return {
              id: f.id,
              floor_name: f.floor_name,
              floor_number: f.floor_number ?? 0,
              slot_count: f.total_slots || 20,
              block_code: blockCode,
              parking_type: "car",
            };
          })
        );
      } else {
        setConfigLevels([
          { floor_name: "Basement 1", floor_number: -1, slot_count: 20, block_code: "B1", parking_type: "car" },
          { floor_name: "Ground Floor", floor_number: 0, slot_count: 30, block_code: "G", parking_type: "car" },
          { floor_name: "Level 1", floor_number: 1, slot_count: 25, block_code: "L1", parking_type: "car" },
        ]);
      }
    } catch {
      setConfigLevels([
        { floor_name: "Basement 1", floor_number: -1, slot_count: 20, block_code: "B1", parking_type: "car" },
        { floor_name: "Ground Floor", floor_number: 0, slot_count: 30, block_code: "G", parking_type: "car" },
        { floor_name: "Level 1", floor_number: 1, slot_count: 25, block_code: "L1", parking_type: "car" },
      ]);
    }
  };

  const addConfigLevelRow = () => {
    const validNums = configLevels.map((l) => Number(l.floor_number)).filter((n) => !isNaN(n));
    const nextNum = validNums.length > 0 ? Math.max(...validNums) + 1 : 1;
    setConfigLevels([
      ...configLevels,
      {
        floor_name: `Level ${nextNum}`,
        floor_number: nextNum,
        slot_count: 20,
        block_code: `L${nextNum}`,
        parking_type: "car",
      },
    ]);
  };

  const removeConfigLevelRow = (index) => {
    if (configLevels.length <= 1) {
      showNotification("At least one level is required.", true);
      return;
    }
    setConfigLevels(configLevels.filter((_, idx) => idx !== index));
  };

  const handleSaveInfraConfig = async () => {
    if (!configHotel) return;
    try {
      setActionLoading(true);
      const res = await configureHotel({
        building_id: configHotel.id,
        levels: configLevels,
      });
      if (res?.success) {
        showNotification(`Parking infrastructure configured for ${configHotel.building_name}!`);
        setShowConfigModal(false);
        await loadData();
      } else {
        throw new Error(res?.message || "Failed to configure infrastructure.");
      }
    } catch (err) {
      showNotification(err.message || "Failed to configure infrastructure.", true);
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------------------------------------------
  // STAFF ACTIONS
  // -------------------------------------------------------------

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.email || !staffForm.password) {
      showNotification("Name, email, and password are required.", true);
      return;
    }
    if (staffForm.role === "valet" && staffFloorsError) {
      showNotification(staffFloorsError, true);
      return;
    }
    if (staffForm.role === "valet" && staffFloorsLoading) {
      showNotification("Wait for the selected branch floors to finish loading.", true);
      return;
    }
    if (staffForm.role === "valet" && staffFloors.length > 0 && !staffForm.floor_id) {
      showNotification("Select a floor for this valet.", true);
      return;
    }
    try {
      setActionLoading(true);
      const res = await createStaff(staffForm);
      if (res?.success) {
        showNotification("Staff member created and assigned successfully.");
        setShowAddStaffModal(false);
        setStaffForm({
          name: "",
          email: "",
          phone: "",
          password: "",
          role: "manager",
          hotel_id: hotels[0]?.id || "",
          floor_id: "",
          position_name: "",
        });
        await loadData();
      } else {
        throw new Error(res?.message || "Failed to create staff member.");
      }
    } catch (err) {
      showNotification(err.message || "Failed to create staff member.", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    try {
      setActionLoading(true);
      const res = await updateStaff(editingStaff.id, {
        name: staffForm.name,
        email: staffForm.email,
        phone: staffForm.phone,
        role: staffForm.role,
        hotel_id: staffForm.hotel_id,
      });
      if (res?.success) {
        showNotification("Staff details and assignment updated.");
        setShowEditStaffModal(false);
        setEditingStaff(null);
        await loadData();
      } else {
        throw new Error(res?.message || "Failed to update staff.");
      }
    } catch (err) {
      showNotification(err.message || "Failed to update staff member.", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStaffStatus = (staff) => {
    setStatusStaff(staff);
  };

  const handleConfirmStaffStatus = async () => {
    if (!statusStaff) return;

    try {
      setActionLoading(true);
      const newStatus = !statusStaff.is_active;
      const res = await updateStaffStatus(statusStaff.id, newStatus);

      if (!res?.success) {
        throw new Error(res?.message || "Failed to change staff status.");
      }

      showNotification(
        res.message || `Staff ${newStatus ? "activated" : "deactivated"} successfully.`
      );
      setStatusStaff(null);
      await loadData();
    } catch (err) {
      showNotification(err?.message || "Failed to change staff status.", true);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered lists
  const filteredHotels = useMemo(() => {
    if (!hotelSearch.trim()) return hotels;
    const s = hotelSearch.toLowerCase();
    return hotels.filter(
      (h) =>
        h.building_name?.toLowerCase().includes(s) ||
        h.location?.toLowerCase().includes(s) ||
        h.address?.toLowerCase().includes(s)
    );
  }, [hotels, hotelSearch]);

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      // Exclude customer accounts
      if (s.role === "customer") return false;

      // Hotel branch filter
      if (selectedStaffHotel !== "all") {
        if (s.hotel_id !== selectedStaffHotel) return false;
      }

      // Role filter
      if (staffRoleFilter !== "all") {
        if (s.role !== staffRoleFilter) return false;
      }

      // Search term
      if (staffSearch.trim()) {
        const query = staffSearch.toLowerCase();
        const matchesName = s.name?.toLowerCase().includes(query);
        const matchesEmail = s.email?.toLowerCase().includes(query);
        const matchesPhone = s.phone?.toLowerCase().includes(query);
        const matchesHotel = s.hotel_name?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesHotel) return false;
      }

      return true;
    });
  }, [staffList, selectedStaffHotel, staffRoleFilter, staffSearch]);

  return (
    <div className="infra-container">
      {/* Header Banner */}
      <div className="infra-header">
        <div className="infra-title-section">
          <h1>Infrastructure & Branch Management</h1>
        </div>

        {/* Tab Switcher */}
        <div className="infra-tabs">
          <button
            type="button"
            className={`infra-tab-btn ${activeTab === "hotels" ? "active" : ""}`}
            onClick={() => setActiveTab("hotels")}
          >
            <Building2 size={16} />
            Add & Manage Hotels ({hotels.length})
          </button>
          <button
            type="button"
            className={`infra-tab-btn ${activeTab === "staff" ? "active" : ""}`}
            onClick={() => setActiveTab("staff")}
          >
            <Users size={16} />
            Staff Members ({staffList.filter(s => s.role !== 'customer').length})
          </button>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="infra-alert success">
          <Check size={16} />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="infra-alert error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================
          TAB A: HOTELS & INFRASTRUCTURE
          ======================================================== */}
      {activeTab === "hotels" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Actions Bar */}
          <div className="infra-actions-bar">
            <div className="infra-search-box">
              <Search size={16} color="#9ca3af" />
              <input
                type="text"
                placeholder="Search hotel name, location, address..."
                value={hotelSearch}
                onChange={(e) => setHotelSearch(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="infra-btn-secondary"
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCw size={15} className={loading ? "spin" : ""} />
                Refresh
              </button>
              <button
                type="button"
                className="infra-btn-primary"
                onClick={() => {
                  setHotelForm({ hotel_name: "", location: "", address: "", manager_id: "" });
                  setShowAddHotelModal(true);
                }}
              >
                <Plus size={16} />
                Add New Hotel Branch
              </button>
            </div>
          </div>

          {/* Hotels Pipeline / One-by-One List Order */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
              <RefreshCw size={24} className="spin" style={{ margin: "0 auto 10px auto" }} />
              <p>Loading hotel branches...</p>
            </div>
          ) : filteredHotels.length === 0 ? (
            <div style={{ background: "#fff", padding: "48px", borderRadius: "16px", textAlign: "center", border: "1px dashed #d1d5db" }}>
              <Building2 size={40} color="#9ca3af" style={{ margin: "0 auto 12px auto" }} />
              <h3 style={{ margin: "0 0 6px 0", color: "#374151" }}>No Hotel Branches Found</h3>
              <p style={{ color: "#6b7280", margin: "0 0 16px 0", fontSize: "14px" }}>
                Add your hotel branches (e.g. Pune, Mumbai, Vadodara, Delhi) to configure their parking infrastructure.
              </p>
              <button
                type="button"
                className="infra-btn-primary"
                style={{ margin: "0 auto" }}
                onClick={() => setShowAddHotelModal(true)}
              >
                <Plus size={16} /> Add Hotel Branch
              </button>
            </div>
          ) : (
            <div className="infra-hotels-pipeline">
              {filteredHotels.map((hotel, index) => (
                <div key={hotel.id} className="infra-hotel-pipeline-row">
                  {/* Left: Step / Sequence & Icon */}
                  <div className="infra-hotel-pipe-left">
                    <span className="infra-pipe-step-num">#{index + 1}</span>
                    <div className="infra-hotel-icon">
                      <Building2 size={20} />
                    </div>
                  </div>

                  {/* Main Branch Info */}
                  <div className="infra-hotel-pipe-info">
                    <div className="infra-hotel-pipe-header">
                      <h3 className="infra-hotel-title">{hotel.building_name}</h3>
                      <span className={`infra-badge-status ${hotel.status === "inactive" ? "inactive" : "active"}`}>
                        {hotel.status || "active"}
                      </span>
                    </div>

                    <div className="infra-hotel-location">
                      <MapPin size={13} />
                      <span>{hotel.location || "City Location"}</span>
                      <span className="infra-pipe-dot">•</span>
                      <span className="infra-hotel-address-inline">
                        {hotel.display_address || hotel.address || "Address not provided"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", fontSize: "12px" }}>
                      <UserCheck size={13} color={hotel.manager ? "#42235e" : "#d97706"} />
                      {hotel.manager ? (
                        <span style={{ color: "#42235e", fontWeight: "600" }}>
                          Branch Manager: <strong style={{ color: "#28103c" }}>{hotel.manager.name}</strong> <span style={{ color: "#6b7280", fontWeight: "400" }}>({hotel.manager.email})</span>
                        </span>
                      ) : (
                        <span style={{ color: "#d97706", fontWeight: "600", background: "#fef3c7", padding: "1px 8px", borderRadius: "10px", fontSize: "11px" }}>
                          ⚠️ No Manager Assigned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrics Badges */}
                  <div className="infra-hotel-pipe-stats">
                    <div className="infra-pipe-stat-badge">
                      <span className="infra-stat-value">{hotel.floors_count ?? 0}</span>
                      <span className="infra-stat-label">Levels</span>
                    </div>
                    <div className="infra-pipe-stat-badge">
                      <span className="infra-stat-value">{hotel.slots_count ?? 0}</span>
                      <span className="infra-stat-label">Slots</span>
                    </div>
                    <div className="infra-pipe-stat-badge">
                      <span className="infra-stat-value" style={{ color: "#42235e" }}>
                        {hotel.staff_count ?? 0}
                      </span>
                      <span className="infra-stat-label">Staff</span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="infra-hotel-pipe-actions">
                    <button
                      type="button"
                      className="infra-btn-config"
                      onClick={() => openConfigModal(hotel)}
                    >
                      <Layers size={13} />
                      Configure
                    </button>
                    <button
                      type="button"
                      className="infra-btn-edit"
                      onClick={() => {
                        setEditingHotel(hotel);
                        setHotelForm({
                          hotel_name: hotel.building_name,
                          location: hotel.location || "",
                          address: hotel.display_address || hotel.address || "",
                          manager_id: hotel.manager?.id || "",
                        });
                        setShowEditHotelModal(true);
                      }}
                    >
                      <Edit2 size={13} />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="infra-btn-del"
                      title="Delete Hotel"
                      onClick={() => handleDeleteHotel(hotel)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB B: STAFF MEMBERS WITH HOTEL ASSIGNMENT
          ======================================================== */}
      {activeTab === "staff" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Controls Bar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "#fff", padding: "16px 20px", borderRadius: "14px", border: "1px solid #f1e4e6" }}>
            {/* Row 1: Branch pills — all visible, wrap if needed */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#42235e", whiteSpace: "nowrap" }}>Hotel Branch:</span>
              {/* All Branches pill */}
              <button
                type="button"
                onClick={() => setSelectedStaffHotel("all")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "6px 14px", borderRadius: "9999px", border: "1.5px solid",
                  borderColor: selectedStaffHotel === "all" ? "#bc9b6a" : "#ebdcf3",
                  background: selectedStaffHotel === "all" ? "linear-gradient(135deg,#42235e,#5b2f82)" : "#fff",
                  color: selectedStaffHotel === "all" ? "#fff" : "#4b5563",
                  fontSize: "12px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap"
                }}
              >
                All Branches
                <span style={{ background: selectedStaffHotel === "all" ? "#bc9b6a" : "#f5edf9", color: selectedStaffHotel === "all" ? "#3b0714" : "#42235e", fontSize: "10px", fontWeight: "700", padding: "1px 6px", borderRadius: "10px" }}>
                  {hotels.length}
                </span>
              </button>
              {/* Individual hotel pills */}
              {hotels.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setSelectedStaffHotel(h.id)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "6px 14px", borderRadius: "9999px", border: "1.5px solid",
                    borderColor: selectedStaffHotel === h.id ? "#bc9b6a" : "#ebdcf3",
                    background: selectedStaffHotel === h.id ? "linear-gradient(135deg,#42235e,#5b2f82)" : "#fff",
                    color: selectedStaffHotel === h.id ? "#fff" : "#4b5563",
                    fontSize: "12px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap"
                  }}
                >
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: selectedStaffHotel === h.id ? "#bc9b6a" : "#cbd5e1", flexShrink: 0 }} />
                  {h.building_name}
                  {h.location && <span style={{ fontSize: "10px", opacity: 0.75 }}>{h.location}</span>}
                </button>
              ))}
            </div>

            {/* Row 2: Role filter + Search + Add button */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              {/* Role Filter */}
              <select
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value)}
                style={{
                  padding: "9px 14px",
                  borderRadius: "10px",
                  border: "1px solid #d1d5db",
                  fontSize: "13px",
                  background: "#fff",
                  outline: "none",
                }}
              >
                <option value="all">All Roles</option>
                <option value="manager">Managers Only</option>
                <option value="valet">Valets Only</option>
              </select>

              {/* Search */}
              <div className="infra-search-box" style={{ minWidth: "220px", flex: 1 }}>
                <Search size={15} color="#9ca3af" />
                <input
                  type="text"
                  placeholder="Search staff name or email..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="infra-btn-primary"
                style={{ marginLeft: "auto", whiteSpace: "nowrap" }}
                onClick={() => {
                  setStaffForm({
                    name: "",
                    email: "",
                    phone: "",
                    password: "",
                    role: "manager",
                    hotel_id: hotels[0]?.id || "",
                    floor_id: "",
                    position_name: "",
                  });
                  setShowAddStaffModal(true);
                }}
              >
                <Plus size={16} />
                Add Staff Member
              </button>
            </div>
          </div>

          {/* Staff Table */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Staff Member</th>
                  <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Role</th>
                  <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Assigned Hotel Branch</th>
                  <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Assigned Level</th>
                  <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Status</th>
                  <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                      <RefreshCw size={20} className="spin" style={{ margin: "0 auto 8px auto" }} />
                      Loading staff...
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                      No staff members match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => (
                    <tr key={staff.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: staff.role === "manager" ? "#fef3c7" : "#e0f2fe",
                            color: staff.role === "manager" ? "#92400e" : "#0369a1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "700",
                            fontSize: "13px"
                          }}>
                            {staff.name ? staff.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <div style={{ fontWeight: "600", fontSize: "13.5px", color: "#111827" }}>{staff.name}</div>
                            <div style={{ fontSize: "12px", color: "#6b7280" }}>{staff.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600",
                          background: staff.role === "manager" ? "#f7f2fb" : "#f0fdf4",
                          color: staff.role === "manager" ? "#42235e" : "#15803d",
                        }}>
                          {staff.role === "manager" ? "Manager" : "Valet"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "600", color: "#374151", fontSize: "13px" }}>
                          <Building2 size={15} color="#42235e" />
                          <span>{staff.hotel_name || "Unassigned"}</span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 18px", fontSize: "13px", color: "#4b5563" }}>
                        {staff.floor_name || "All Levels / Main"}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "11.5px",
                            fontWeight: "700",
                            background: staff.is_active ? "#ecfdf5" : "#fef3c7",
                            color: staff.is_active ? "#065f46" : "#92400e",
                          }}
                          aria-label={staff.is_active ? "Active staff member" : "Inactive staff member"}
                        >
                          {staff.is_active ? "● Active" : "● Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        {!staff.is_active && (
                          <button
                            type="button"
                            className="infra-btn-activate-staff"
                            onClick={() => handleToggleStaffStatus(staff)}
                            disabled={actionLoading}
                            aria-label={`Activate ${staff.name}`}
                          >
                            Activate
                          </button>
                        )}
                        {staff.is_active && (
                          <button
                            type="button"
                            className="infra-btn-deactivate-staff"
                            onClick={() => handleToggleStaffStatus(staff)}
                            disabled={actionLoading}
                            aria-label={`Deactivate ${staff.name}`}
                          >
                            Deactivate
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStaff(staff);
                            setStaffForm({
                              name: staff.name || "",
                              email: staff.email || "",
                              phone: staff.phone || "",
                              password: "",
                              role: staff.role || "manager",
                              hotel_id: staff.hotel_id || "",
                            });
                            setShowEditStaffModal(true);
                          }}
                          style={{
                            padding: "6px 12px",
                            background: "#f9fafb",
                            border: "1px solid #d1d5db",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            color: "#374151"
                          }}
                        >
                          Reassign Hotel
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADD HOTEL
          ======================================================== */}
      {showAddHotelModal && (
        <div className="infra-modal-overlay">
          <div className="infra-modal infra-hotel-modal">
            <div className="infra-modal-head">
              <h3>Add New Hotel Branch</h3>
              <button
                type="button"
                className="infra-close-btn"
                onClick={() => setShowAddHotelModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateHotel} className="infra-form-grid infra-hotel-form">
              <div className="infra-form-group">
                <label>Hotel Branch Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Pune Grand, Mumbai Regency, Vadodara Royal, Delhi Central"
                  value={hotelForm.hotel_name}
                  onChange={(e) => setHotelForm({ ...hotelForm, hotel_name: e.target.value })}
                  required
                />
              </div>

              <div className="infra-form-group">
                <label>City / Location *</label>
                <input
                  type="text"
                  placeholder="e.g. Pune, Mumbai, Vadodara, Delhi"
                  value={hotelForm.location}
                  onChange={(e) => setHotelForm({ ...hotelForm, location: e.target.value })}
                  required
                />
              </div>

              <div className="infra-form-group">
                <label>Full Address</label>
                <textarea
                  rows="3"
                  placeholder="Street address, landmark, PIN code"
                  value={hotelForm.address}
                  onChange={(e) => setHotelForm({ ...hotelForm, address: e.target.value })}
                />
              </div>

              <div className="infra-form-group">
                <label>Assign Branch Manager (Optional)</label>
                <select
                  value={hotelForm.manager_id || ""}
                  onChange={(e) => setHotelForm({ ...hotelForm, manager_id: e.target.value })}
                >
                  <option value="">-- No Manager Assigned --</option>
                  {staffList
                    .filter((s) => s.role === "manager" || s.role === "parking_admin")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.email}) {m.hotel_name ? `- Current: ${m.hotel_name}` : ""}
                      </option>
                    ))}
                </select>
                <small style={{ color: "#6b7280", fontSize: "11.5px" }}>
                  Every hotel branch has its dedicated manager who only oversees their own branch.
                </small>
              </div>

              <div className="infra-modal-foot">
                <button
                  type="button"
                  className="infra-btn-secondary"
                  onClick={() => setShowAddHotelModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="infra-btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Saving..." : "Create Hotel Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EDIT HOTEL
          ======================================================== */}
      {showEditHotelModal && (
        <div className="infra-modal-overlay">
          <div className="infra-modal">
            <div className="infra-modal-head">
              <h3>Edit Hotel Branch</h3>
              <button
                type="button"
                className="infra-close-btn"
                onClick={() => setShowEditHotelModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateHotel} className="infra-form-grid infra-hotel-form">
              <div className="infra-form-group">
                <label>Hotel Branch Name *</label>
                <input
                  type="text"
                  value={hotelForm.hotel_name}
                  onChange={(e) => setHotelForm({ ...hotelForm, hotel_name: e.target.value })}
                  required
                />
              </div>

              <div className="infra-form-group">
                <label>City / Location *</label>
                <input
                  type="text"
                  value={hotelForm.location}
                  onChange={(e) => setHotelForm({ ...hotelForm, location: e.target.value })}
                  required
                />
              </div>

              <div className="infra-form-group">
                <label>Full Address</label>
                <textarea
                  rows="3"
                  value={hotelForm.address}
                  onChange={(e) => setHotelForm({ ...hotelForm, address: e.target.value })}
                />
              </div>

              <div className="infra-form-group">
                <label>Assign Branch Manager</label>
                <select
                  value={hotelForm.manager_id || ""}
                  onChange={(e) => setHotelForm({ ...hotelForm, manager_id: e.target.value })}
                >
                  <option value="">-- No Manager Assigned --</option>
                  {staffList
                    .filter((s) => s.role === "manager" || s.role === "parking_admin")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.email}) {m.hotel_name ? `- Current: ${m.hotel_name}` : ""}
                      </option>
                    ))}
                </select>
                <small style={{ color: "#6b7280", fontSize: "11.5px" }}>
                  Every hotel branch has its dedicated manager who only oversees their own branch.
                </small>
              </div>

              <div className="infra-modal-foot">
                <button
                  type="button"
                  className="infra-btn-secondary"
                  onClick={() => setShowEditHotelModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="infra-btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CONFIGURE PARKING LEVELS & SLOTS
          ======================================================== */}
      {showConfigModal && configHotel && (
        <div className="infra-modal-overlay">
          <div className="infra-modal infra-modal-lg">
            <div className="infra-modal-head">
              <div>
                <h3>Configure Parking Infrastructure</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#6b7280" }}>
                  Hotel: <strong>{configHotel.building_name}</strong> ({configHotel.location || "City"})
                </p>
              </div>
              <button
                type="button"
                className="infra-close-btn"
                onClick={() => setShowConfigModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "#4b5563", lineHeight: 1.5, margin: "0 0 16px 0" }}>
              Configure the parking floors/levels (Basement, Ground, Upper Levels) and define how many slots to allocate on each floor.
            </p>

            <table className="infra-levels-table">
              <thead>
                <tr>
                  <th>Floor / Level Name</th>
                  <th style={{ width: "90px" }}>Floor #</th>
                  <th style={{ width: "110px" }}>Block Code</th>
                  <th style={{ width: "110px" }}>Slot Count</th>
                  <th style={{ width: "120px" }}>Vehicle Type</th>
                  <th style={{ width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {configLevels.map((lvl, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        type="text"
                        value={lvl.floor_name}
                        onChange={(e) => {
                          const updated = [...configLevels];
                          updated[idx].floor_name = e.target.value;
                          setConfigLevels(updated);
                        }}
                        placeholder="e.g. Basement 1, Ground Floor"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={lvl.floor_number}
                        onChange={(e) => {
                          const updated = [...configLevels];
                          updated[idx].floor_number = Number(e.target.value);
                          setConfigLevels(updated);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={lvl.block_code}
                        onChange={(e) => {
                          const updated = [...configLevels];
                          updated[idx].block_code = e.target.value.toUpperCase();
                          setConfigLevels(updated);
                        }}
                        placeholder="B1, G, L1"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={lvl.slot_count}
                        onChange={(e) => {
                          const updated = [...configLevels];
                          updated[idx].slot_count = Number(e.target.value);
                          setConfigLevels(updated);
                        }}
                      />
                    </td>
                    <td>
                      <select
                        value={lvl.parking_type}
                        onChange={(e) => {
                          const updated = [...configLevels];
                          updated[idx].parking_type = e.target.value;
                          setConfigLevels(updated);
                        }}
                      >
                        <option value="car">Car</option>
                        <option value="suv">SUV</option>
                        <option value="bike">Bike</option>
                        <option value="ev">EV</option>
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => removeConfigLevelRow(idx)}
                        style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer" }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: "14px" }}>
              <button
                type="button"
                className="infra-btn-secondary"
                onClick={addConfigLevelRow}
              >
                <Plus size={14} /> Add Another Level
              </button>
            </div>

            <div className="infra-modal-foot">
              <button
                type="button"
                className="infra-btn-secondary"
                onClick={() => setShowConfigModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="infra-btn-primary"
                onClick={handleSaveInfraConfig}
                disabled={actionLoading}
              >
                {actionLoading ? "Configuring..." : "Generate Parking Slots"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CHANGE STAFF ACCESS
          ======================================================== */}
      {statusStaff && (
        <div
          className="infra-modal-overlay"
          onClick={() => !actionLoading && setStatusStaff(null)}
        >
          <div
            className="infra-modal infra-staff-status-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="infra-staff-status-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="infra-modal-head">
              <div>
                <p className="infra-status-eyebrow">STAFF ACCESS</p>
                <h3 id="infra-staff-status-title">
                  {statusStaff.is_active ? "Deactivate Staff?" : "Activate Staff?"}
                </h3>
              </div>
              <button
                type="button"
                className="infra-close-btn"
                onClick={() => setStatusStaff(null)}
                disabled={actionLoading}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <p className="infra-staff-status-message">
              {statusStaff.is_active
                ? `Deactivate ${statusStaff.name}? They will lose access to their account. Their staff record will remain and can be reactivated later.`
                : `Activate ${statusStaff.name}? They will regain access to their account.`}
            </p>

            <div className="infra-modal-foot">
              <button
                type="button"
                className="infra-btn-secondary"
                onClick={() => setStatusStaff(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={
                  statusStaff.is_active
                    ? "infra-btn-deactivate-confirm"
                    : "infra-btn-primary"
                }
                onClick={handleConfirmStaffStatus}
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Updating..."
                  : statusStaff.is_active
                    ? "Deactivate Staff"
                    : "Activate Staff"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADD STAFF MEMBER
          ======================================================== */}
      {showAddStaffModal && (
        <div className="infra-modal-overlay">
          <div className="infra-modal infra-staff-modal">
            {/* Purple brand header */}
            <div className="infra-modal-head infra-modal-head--brand">
              <div>
                <p className="infra-modal-eyebrow">STAFF MANAGEMENT</p>
                <h3>Add New Staff Member</h3>
                <p className="infra-modal-sub">Create an account and assign a hotel branch.</p>
              </div>
              <button
                type="button"
                className="infra-close-btn infra-close-btn--light"
                onClick={() => setShowAddStaffModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="infra-staff-form">
              {/* Row 1: Full Name + Email */}
              <div className="infra-form-row2">
                <div className="infra-form-group">
                  <label>Full Name <span className="infra-req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="infra-form-group">
                  <label>Email Address <span className="infra-req">*</span></label>
                  <input
                    type="email"
                    placeholder="staff@conradpune.com"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Row 2: Phone + Password */}
              <div className="infra-form-row2">
                <div className="infra-form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  />
                </div>
                <div className="infra-form-group">
                  <label>Password <span className="infra-req">*</span></label>
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Row 3: Role + Hotel Branch */}
              <div className="infra-form-row2">
                <div className="infra-form-group">
                  <label>Role <span className="infra-req">*</span></label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value, floor_id: "" })}
                  >
                    <option value="manager">Manager</option>
                    <option value="valet">Valet</option>
                  </select>
                </div>
                <div className="infra-form-group">
                  <label>Assign to Hotel Branch <span className="infra-req">*</span></label>
                  <select
                    value={staffForm.hotel_id}
                    onChange={(e) => setStaffForm({ ...staffForm, hotel_id: e.target.value, floor_id: "" })}
                    required
                  >
                    <option value="">-- Select Hotel Branch --</option>
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.building_name} ({h.location || "City"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Valet position (conditional) */}
              {staffForm.role === "valet" && (
                <>
                  <div className="infra-form-group">
                    <label>Assign to Floor <span className="infra-req">*</span></label>
                    <select
                      value={staffForm.floor_id}
                      onChange={(e) => setStaffForm({ ...staffForm, floor_id: e.target.value })}
                      disabled={staffFloorsLoading || Boolean(staffFloorsError) || !staffForm.hotel_id || staffFloors.length === 0}
                      required={staffFloors.length > 0}
                    >
                      {staffFloorsLoading ? (
                        <option value="">Loading floors...</option>
                      ) : staffFloorsError ? (
                        <option value="">Unable to load floors</option>
                      ) : staffFloors.length > 0 ? (
                        staffFloors.map((floor) => (
                          <option key={floor.id} value={floor.id}>
                            {floor.floor_name || `Floor ${floor.floor_number}`}
                          </option>
                        ))
                      ) : (
                        <option value="">Ground Floor (default)</option>
                      )}
                    </select>
                    <small style={{ color: "#6b7280", fontSize: "11.5px" }}>
                      {staffFloorsLoading
                        ? "Loading available floors..."
                        : staffFloorsError
                        ? staffFloorsError
                        : staffFloors.length > 0
                          ? "The valet will be assigned to this floor."
                          : staffForm.hotel_id
                            ? "No floors are configured yet; a Ground Floor will be created for this branch."
                            : "Select a hotel branch to load its floors."}
                    </small>
                  </div>
                  <div className="infra-form-group">
                    <label>Position / Standing Post</label>
                    <input
                      type="text"
                      placeholder="e.g. Front Entrance, Main Gate, Basement Entry"
                      value={staffForm.position_name}
                      onChange={(e) => setStaffForm({ ...staffForm, position_name: e.target.value })}
                    />
                    <small style={{ color: "#6b7280", fontSize: "11.5px" }}>The valet post/position where this staff member will be stationed.</small>
                  </div>
                </>
              )}

              {/* Info box */}
              {staffForm.role === "manager" && (
                <div className="infra-role-info">
                  <span>ℹ️</span>
                  <p>This staff member will be assigned as the <strong>Dedicated Branch Manager</strong> for the selected hotel branch. They will only see and manage parking operations for that specific branch.</p>
                </div>
              )}

              <div className="infra-modal-foot">
                <button type="button" className="infra-btn-secondary" onClick={() => setShowAddStaffModal(false)}>Cancel</button>
                <button type="submit" className="infra-btn-primary" disabled={actionLoading}>
                  {actionLoading ? "Creating..." : "Create & Assign Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EDIT & REASSIGN STAFF MEMBER
          ======================================================== */}
      {showEditStaffModal && editingStaff && (
        <div className="infra-modal-overlay">
          <div className="infra-modal">
            <div className="infra-modal-head">
              <h3>Edit Staff & Hotel Assignment</h3>
              <button
                type="button"
                className="infra-close-btn"
                onClick={() => setShowEditStaffModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="infra-form-grid">
              <div className="infra-form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="infra-form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="infra-form-group">
                <label>Role</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                >
                  <option value="manager">Manager</option>
                  <option value="valet">Valet</option>
                </select>
              </div>

              <div className="infra-form-group">
                <label>Assign to Hotel Branch</label>
                <select
                  value={staffForm.hotel_id}
                  onChange={(e) => setStaffForm({ ...staffForm, hotel_id: e.target.value })}
                >
                  <option value="">-- Select Hotel Branch --</option>
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.building_name} ({h.location || "City"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="infra-modal-foot">
                <button
                  type="button"
                  className="infra-btn-secondary"
                  onClick={() => setShowEditStaffModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="infra-btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Updating..." : "Save Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

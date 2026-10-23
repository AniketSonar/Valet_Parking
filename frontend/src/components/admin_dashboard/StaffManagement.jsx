import { useEffect, useMemo, useState } from "react";
import {
  createStaff,
  getAllStaff,
  updateStaff,
  updateStaffStatus,
} from "../../api/staffApi";

import "./StaffManagement.css";

const ROLE_LABELS = {
  manager: "Manager",
  parking_admin: "Manager",
  valet: "Valet",
  reception_security: "Valet",
  valet_attendant: "Valet",
  cashier: "Valet",
  super_admin: "Super Admin",
};

const getRoleLabel = (role) => {
  return ROLE_LABELS[role] || role || "Unknown";
};

const getRoleClass = (role) => {
  return `role-${String(role || "")
    .toLowerCase()
    .replaceAll(" ", "-")
    .replaceAll("/", "-")}`;
};

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

const formatDate = (date) => {
  if (!date) return "--";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "--";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function StaffManagement() {
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [openAction, setOpenAction] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [statusStaff, setStatusStaff] = useState(null);

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    phone: "",
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    role: "",
    phone: "",
  });

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAllStaff();

      setStaff(response?.users || []);
    } catch (error) {
      console.error("Failed to load staff:", error);

      setError(
        error?.message || "Failed to load staff members."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 4000);

    return () => clearTimeout(timer);
  }, [successMessage]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;

    setEditFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openAddStaffModal = () => {
    setError("");
    setSuccessMessage("");

    setFormData({
      name: "",
      email: "",
      password: "",
      role: "",
      phone: "",
    });

    setShowPassword(false);
    setShowAddStaff(true);
  };

  const closeAddStaffModal = () => {
    if (submitting) return;

    setShowAddStaff(false);
    setShowPassword(false);

    setFormData({
      name: "",
      email: "",
      password: "",
      role: "",
      phone: "",
    });
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();

    setError("");
    setSuccessMessage("");

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.password ||
      !formData.role
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (
      formData.role === "valet" &&
      !formData.phone.trim()
    ) {
      setError("Phone number is required for Valet staff.");
      return;
    }

    if (
      formData.role === "valet" &&
      !/^\d{10}$/.test(formData.phone.trim())
    ) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
      };

      if (formData.role === "valet") {
        payload.phone = formData.phone.trim();
      }

      const response = await createStaff(payload);

      if (!response?.success) {
        throw new Error(
          response?.message || "Failed to create staff."
        );
      }

      setSuccessMessage(
        response.message || "Staff member created successfully."
      );

      setFormData({
        name: "",
        email: "",
        password: "",
        role: "",
        phone: "",
      });

      setShowAddStaff(false);

      await loadStaff();
    } catch (error) {
      console.error("CREATE STAFF API ERROR:", error);

      setError(
        error?.message || "Failed to create staff member."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStaff = useMemo(() => {
    return staff.filter((staffMember) => {
      const search = searchTerm.toLowerCase().trim();

      const matchesSearch =
        !search ||
        staffMember.name?.toLowerCase().includes(search) ||
        staffMember.email?.toLowerCase().includes(search);

      const matchesRole =
        roleFilter === "all" ||
        staffMember.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          staffMember.is_active === true) ||
        (statusFilter === "inactive" &&
          staffMember.is_active === false);

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );
    });
  }, [
    staff,
    searchTerm,
    roleFilter,
    statusFilter,
  ]);

  const totalStaff = staff.length;

  const activeStaff = staff.filter(
    (member) => member.is_active === true
  ).length;

  const inactiveStaff = staff.filter(
    (member) => member.is_active === false
  ).length;

  const handleViewStaff = (staffMember) => {
    setSelectedStaff(staffMember);
    setOpenAction(null);
    setError("");
  };

  const handleOpenEdit = (staffMember) => {
    setEditingStaff(staffMember);

    setEditFormData({
      name: staffMember.name || "",
      role: staffMember.role || "",
      phone: staffMember.phone || "",
    });

    setSelectedStaff(null);
    setOpenAction(null);
    setError("");
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();

    if (!editingStaff) return;

    setError("");
    setSuccessMessage("");

    if (!editFormData.name.trim()) {
      setError("Staff name is required.");
      return;
    }

    if (!editFormData.role) {
      setError("Please select a staff role.");
      return;
    }

    if (
      editFormData.role === "valet" &&
      !editFormData.phone.trim()
    ) {
      setError("Phone number is required for Valet staff.");
      return;
    }

    if (
      editFormData.role === "valet" &&
      !/^\d{10}$/.test(editFormData.phone.trim())
    ) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    try {
      setEditSubmitting(true);

      const payload = {
        name: editFormData.name.trim(),
        role: editFormData.role,
      };

      if (editFormData.role === "valet") {
        payload.phone = editFormData.phone.trim();
      }

      const response = await updateStaff(
        editingStaff.id,
        payload
      );

      if (!response?.success) {
        throw new Error(
          response?.message || "Failed to update staff."
        );
      }

      setSuccessMessage(
        response.message || "Staff updated successfully."
      );

      setEditingStaff(null);

      await loadStaff();
    } catch (error) {
      console.error("Update staff error:", error);

      setError(
        error?.message || "Failed to update staff."
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleOpenStatusModal = (staffMember) => {
    setStatusStaff(staffMember);
    setOpenAction(null);
    setError("");
  };

  const handleConfirmStatusChange = async () => {
    if (!statusStaff) return;

    try {
      setStatusUpdating(true);
      setError("");

      const newStatus = !statusStaff.is_active;

      const response = await updateStaffStatus(
        statusStaff.id,
        newStatus
      );

      if (!response?.success) {
        throw new Error(
          response?.message ||
          "Failed to update staff status."
        );
      }

      setSuccessMessage(
        response?.message ||
          `Staff ${
            newStatus ? "activated" : "deactivated"
          } successfully.`
      );

      setStatusStaff(null);

      await loadStaff();
    } catch (error) {
      console.error(
        "Update staff status error:",
        error
      );

      setError(
        error?.message ||
          "Failed to update staff status."
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="staff-page">
      {successMessage && (
        <div className="staff-success-message">
          <span>✓</span>

          <span>{successMessage}</span>

          <button
            onClick={() => setSuccessMessage("")}
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="staff-error-message">
          <span>!</span>

          <span>{error}</span>

          <button
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      <div className="staff-page-header">
        <div>
          <p className="staff-eyebrow">
            MANAGEMENT
          </p>

          <h1>Staff Management</h1>

          <p>
            Manage system staff, roles and account access.
          </p>
        </div>

        <button
          className="add-staff-btn"
          onClick={openAddStaffModal}
        >
          <span>+</span>
          Add Staff
        </button>
      </div>

      <div className="staff-summary">
        <div className="staff-summary-item">
          <span>Total Staff</span>

          <strong>
            {loading ? "--" : totalStaff}
          </strong>
        </div>

        <div className="staff-summary-item">
          <span>Active</span>

          <strong className="active-count">
            {loading ? "--" : activeStaff}
          </strong>
        </div>

        <div className="staff-summary-item">
          <span>Inactive</span>

          <strong className="inactive-count">
            {loading ? "--" : inactiveStaff}
          </strong>
        </div>
      </div>

      <section className="staff-table-card">
        <div className="staff-toolbar">
          <div className="staff-search">
            <span className="search-icon">
              ⌕
            </span>

            <input
              type="text"
              placeholder="Search staff by name or email..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
            />
          </div>

          <div className="staff-filters">
            <select
              className="filter-button"
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value)
              }
            >
              <option value="all">
                All Roles
              </option>

              <option value="manager">
                Manager
              </option>

              <option value="valet">
                Valet
              </option>
            </select>

            <select
              className="filter-button"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
            >
              <option value="all">
                All Status
              </option>

              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>
          </div>
        </div>

        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>STAFF MEMBER</th>
                <th>ROLE</th>
                <th>STATUS</th>
                <th>CREATED</th>
                <th className="actions-column">
                  ACTIONS
                </th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan="5"
                    className="table-loading"
                  >
                    <div className="loading-spinner"></div>

                    <span>
                      Loading staff...
                    </span>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredStaff.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="table-empty"
                    >
                      <div className="empty-staff-state">
                        <div className="empty-staff-icon">
                          👥
                        </div>

                        <strong>
                          No staff members found
                        </strong>

                        <span>
                          {searchTerm ||
                          roleFilter !== "all" ||
                          statusFilter !== "all"
                            ? "Try changing your search or filters."
                            : "Add your first staff member to get started."}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}

              {!loading &&
                filteredStaff.map(
                  (staffMember) => (
                    <tr
                      key={staffMember.id}
                    >
                      <td>
                        <div className="staff-member">
                          <div className="staff-avatar">
                            {getInitials(
                              staffMember.name
                            )}
                          </div>

                          <div className="staff-member-info">
                            <strong>
                              {staffMember.name}
                            </strong>

                            <span>
                              {staffMember.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`role-badge ${getRoleClass(
                            staffMember.role
                          )}`}
                        >
                          {getRoleLabel(
                            staffMember.role
                          )}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            staffMember.is_active
                              ? "status-active"
                              : "status-inactive"
                          }`}
                        >
                          <span className="status-dot"></span>

                          {staffMember.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td>
                        <span className="created-date">
                          {formatDate(
                            staffMember.created_at
                          )}
                        </span>
                      </td>

                      <td>
                        <div className="staff-actions">
                          <button
                            className="table-action view"
                            onClick={() =>
                              handleViewStaff(
                                staffMember
                              )
                            }
                          >
                            View
                          </button>

                          <button
                            className="table-action edit"
                            onClick={() =>
                              handleOpenEdit(
                                staffMember
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="more-action"
                            onClick={() =>
                              setOpenAction(
                                openAction ===
                                  staffMember.id
                                  ? null
                                  : staffMember.id
                              )
                            }
                          >
                            ⋮
                          </button>

                          {openAction ===
                            staffMember.id && (
                            <div className="action-menu">
                              <button
                                onClick={() =>
                                  handleViewStaff(
                                    staffMember
                                  )
                                }
                              >
                                View Details
                              </button>

                              <button
                                onClick={() =>
                                  handleOpenEdit(
                                    staffMember
                                  )
                                }
                              >
                                Edit Staff
                              </button>

                              <div className="action-divider"></div>

                              <button
                                className={
                                  staffMember.is_active
                                    ? "danger-action"
                                    : "activate-action"
                                }
                                onClick={() =>
                                  handleOpenStatusModal(
                                    staffMember
                                  )
                                }
                              >
                                {staffMember.is_active
                                  ? "Deactivate"
                                  : "Activate"}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )}
            </tbody>
          </table>
        </div>

        <div className="staff-table-footer">
          <span>
            Showing{" "}
            <strong>
              {filteredStaff.length}
            </strong>{" "}
            of{" "}
            <strong>
              {staff.length}
            </strong>{" "}
            staff members
          </span>

          <div className="pagination">
            <button disabled>‹</button>

            <span className="current-page">
              1
            </span>

            <button disabled>›</button>
          </div>
        </div>
      </section>

      {showAddStaff && (
        <div
          className="modal-overlay"
          onClick={closeAddStaffModal}
        >
          <div
            className="add-staff-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">
                  STAFF MANAGEMENT
                </p>

                <h2>Add New Staff</h2>

                <p>
                  Create an account and assign a system role.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeAddStaffModal}
                disabled={submitting}
              >
                ×
              </button>
            </div>

            <form
              className="staff-form"
              onSubmit={handleCreateStaff}
            >
              <div className="form-group">
                <label>Full Name</label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter staff name"
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="staff@example.com"
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label>Password</label>

                <div className="password-input">
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a secure password"
                    disabled={submitting}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    disabled={submitting}
                  >
                    {showPassword
                      ? "Hide"
                      : "Show"}
                  </button>
                </div>

                <span className="field-hint">
                  Use at least 8 characters.
                </span>
              </div>

              <div className="form-group">
                <label>Staff Role</label>

                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  disabled={submitting}
                >
                  <option
                    value=""
                    disabled
                  >
                    Select a role
                  </option>

                  <option value="manager">
                    Manager
                  </option>

                  <option value="valet">
                    Valet
                  </option>
                </select>
              </div>

              {formData.role === "valet" && (
                <div className="form-group">
                  <label>
                    Phone Number
                  </label>

                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="10-digit phone number"
                    maxLength="10"
                    inputMode="numeric"
                    disabled={submitting}
                  />

                  <span className="field-hint">
                    Required for Valet staff management and assignment.
                  </span>
                </div>
              )}

              <div className="role-info">
                <div className="role-info-icon">
                  i
                </div>

                <p>
                  Manager accounts manage floors, buildings,
                  parking systems, and valet assignments.
                </p>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeAddStaffModal}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="create-staff-btn"
                  disabled={submitting}
                >
                  {submitting
                    ? "Creating..."
                    : "Create Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedStaff && (
        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedStaff(null)
          }
        >
          <div
            className="staff-details-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="details-header">
              <div>
                <p className="modal-eyebrow">
                  STAFF PROFILE
                </p>

                <h2>Staff Details</h2>

                <p>
                  View account and role information.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setSelectedStaff(null)
                }
              >
                ×
              </button>
            </div>

            <div className="staff-profile">
              <div className="large-staff-avatar">
                {getInitials(
                  selectedStaff.name
                )}
              </div>

              <div className="staff-profile-info">
                <h3>
                  {selectedStaff.name}
                </h3>

                <p>
                  {selectedStaff.email}
                </p>

                <span
                  className={`status-badge ${
                    selectedStaff.is_active
                      ? "status-active"
                      : "status-inactive"
                  }`}
                >
                  <span className="status-dot"></span>

                  {selectedStaff.is_active
                    ? "Active"
                    : "Inactive"}
                </span>
              </div>
            </div>

            <div className="details-section">
              <div className="details-section-title">
                Account Information
              </div>

              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">
                    Full Name
                  </span>

                  <strong>
                    {selectedStaff.name}
                  </strong>
                </div>

                <div className="detail-item">
                  <span className="detail-label">
                    Email Address
                  </span>

                  <strong>
                    {selectedStaff.email}
                  </strong>
                </div>

                <div className="detail-item">
                  <span className="detail-label">
                    Assigned Role
                  </span>

                  <span
                    className={`role-badge ${getRoleClass(
                      selectedStaff.role
                    )}`}
                  >
                    {getRoleLabel(
                      selectedStaff.role
                    )}
                  </span>
                </div>

                {selectedStaff.role ===
                  "valet" && (
                  <div className="detail-item">
                    <span className="detail-label">
                      Phone Number
                    </span>

                    <strong>
                      {selectedStaff.phone ||
                        "Not available"}
                    </strong>
                  </div>
                )}

                <div className="detail-item">
                  <span className="detail-label">
                    Account Status
                  </span>

                  <span
                    className={`status-badge ${
                      selectedStaff.is_active
                        ? "status-active"
                        : "status-inactive"
                    }`}
                  >
                    <span className="status-dot"></span>

                    {selectedStaff.is_active
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">
                    Created Date
                  </span>

                  <strong>
                    {formatDate(
                      selectedStaff.created_at
                    )}
                  </strong>
                </div>

                <div className="detail-item">
                  <span className="detail-label">
                    Staff ID
                  </span>

                  <strong className="staff-id">
                    #
                    {String(
                      selectedStaff.id
                    ).padStart(5, "0")}
                  </strong>
                </div>
              </div>
            </div>

            <div className="role-description">
              <div className="role-description-icon">
                ✓
              </div>

              <div>
                <strong>
                  {getRoleLabel(
                    selectedStaff.role
                  )}
                </strong>

                <p>
                  This account is assigned the{" "}
                  <b>
                    {getRoleLabel(
                      selectedStaff.role
                    )}
                  </b>{" "}
                  role within the Valet Parking
                  Management System.
                </p>
              </div>
            </div>

            <div className="details-footer">
              <button
                className="details-secondary-btn"
                onClick={() =>
                  setSelectedStaff(null)
                }
              >
                Close
              </button>

              <button
                className="details-edit-btn"
                onClick={() =>
                  handleOpenEdit(
                    selectedStaff
                  )
                }
              >
                Edit Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {editingStaff && (
        <div
          className="modal-overlay"
          onClick={() =>
            !editSubmitting &&
            setEditingStaff(null)
          }
        >
          <div
            className="edit-staff-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">
                  STAFF MANAGEMENT
                </p>

                <h2>Edit Staff</h2>

                <p>
                  Update staff name, role and contact information.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setEditingStaff(null)
                }
                disabled={editSubmitting}
              >
                ×
              </button>
            </div>

            <form
              className="staff-form"
              onSubmit={handleUpdateStaff}
            >
              <div className="form-group">
                <label>Full Name</label>

                <input
                  type="text"
                  name="name"
                  value={editFormData.name}
                  onChange={
                    handleEditInputChange
                  }
                  placeholder="Enter staff name"
                  disabled={editSubmitting}
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>

                <input
                  type="email"
                  value={
                    editingStaff.email || ""
                  }
                  readOnly
                  disabled
                />

                <span className="field-hint">
                  Email cannot be changed using the current staff update API.
                </span>
              </div>

              <div className="form-group">
                <label>Staff Role</label>

                <select
                  name="role"
                  value={editFormData.role}
                  onChange={
                    handleEditInputChange
                  }
                  disabled={editSubmitting}
                >
                  <option value="manager">
                    Manager
                  </option>

                  <option value="valet">
                    Valet
                  </option>
                </select>
              </div>

              {editFormData.role ===
                "valet" && (
                <div className="form-group">
                  <label>
                    Phone Number
                  </label>

                  <input
                    type="tel"
                    name="phone"
                    value={editFormData.phone}
                    onChange={
                      handleEditInputChange
                    }
                    placeholder="10-digit phone number"
                    maxLength="10"
                    inputMode="numeric"
                    disabled={editSubmitting}
                  />

                  <span className="field-hint">
                    Required for Valet staff management and assignment.
                  </span>
                </div>
              )}

              <div className="form-group">
                <label>Account Status</label>

                <input
                  type="text"
                  value={
                    editingStaff.is_active
                      ? "Active"
                      : "Inactive"
                  }
                  readOnly
                  disabled
                />

                <span className="field-hint">
                  Use the Activate / Deactivate action
                  to change account status.
                </span>
              </div>

              <div className="edit-role-warning">
                <div className="role-info-icon">
                  !
                </div>

                <p>
                  Changing the staff role may change
                  the dashboards and permissions
                  available to this account.
                </p>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() =>
                    setEditingStaff(null)
                  }
                  disabled={editSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="create-staff-btn"
                  disabled={editSubmitting}
                >
                  {editSubmitting
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {statusStaff && (
        <div
          className="modal-overlay"
          onClick={() =>
            !statusUpdating &&
            setStatusStaff(null)
          }
        >
          <div
            className="status-confirm-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div
              className={`status-confirm-icon ${
                statusStaff.is_active
                  ? "deactivate-icon"
                  : "activate-icon"
              }`}
            >
              {statusStaff.is_active
                ? "!"
                : "✓"}
            </div>

            <div className="status-confirm-content">
              <h2>
                {statusStaff.is_active
                  ? "Deactivate Staff?"
                  : "Activate Staff?"}
              </h2>

              <p>
                {statusStaff.is_active
                  ? `Are you sure you want to deactivate ${statusStaff.name}? They will no longer be able to access their account until it is activated again.`
                  : `Are you sure you want to activate ${statusStaff.name}? They will regain access to their account.`}
              </p>
            </div>

            <div className="status-staff-preview">
              <div className="status-preview-avatar">
                {getInitials(
                  statusStaff.name
                )}
              </div>

              <div>
                <strong>
                  {statusStaff.name}
                </strong>

                <span>
                  {statusStaff.email}
                </span>
              </div>
            </div>

            <div className="status-confirm-actions">
              <button
                className="status-cancel-btn"
                onClick={() =>
                  setStatusStaff(null)
                }
                disabled={statusUpdating}
              >
                Cancel
              </button>

              <button
                className={
                  statusStaff.is_active
                    ? "status-deactivate-btn"
                    : "status-activate-btn"
                }
                onClick={
                  handleConfirmStatusChange
                }
                disabled={statusUpdating}
              >
                {statusUpdating
                  ? "Updating..."
                  : statusStaff.is_active
                    ? "Deactivate Staff"
                    : "Activate Staff"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffManagement;
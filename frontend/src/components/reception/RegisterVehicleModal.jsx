import React, { useCallback, useEffect, useState } from "react";
import { X, Car, Search, CheckCircle2 } from "lucide-react";
import { createVehicle, getCustomers } from "../../api/receptionApi";
import "./css/ReceptionVehicleModal.css";

const RegisterVehicleModal = ({ onClose, onSuccess, preselectedCustomer = null }) => {
  const [form, setForm] = useState({
    license_plate: "",
    make: "",
    model: "",
    color: "",
  });
  const [customerId, setCustomerId] = useState(preselectedCustomer?.id || "");
  const [customerSearch, setCustomerSearch] = useState(
    preselectedCustomer?.name || ""
  );
  const [customers, setCustomers] = useState(
    preselectedCustomer ? [preselectedCustomer] : []
  );
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  const searchCustomers = useCallback(async (q) => {
    try {
      setLoadingCustomers(true);
      const res = await getCustomers(q);
      if (res && res.success) {
        setCustomers(res.customers || []);
        setCustomerDropdownOpen(true);
      }
    } catch (err) {
      console.warn("Search customers error:", err);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  useEffect(() => {
    if (!preselectedCustomer) {
      searchCustomers("");
    }
  }, [preselectedCustomer, searchCustomers]);

  const handleCustomerSearch = (e) => {
    const q = e.target.value;
    setCustomerSearch(q);
    setCustomerId("");
    searchCustomers(q);
  };

  const selectCustomer = (c) => {
    setCustomerId(c.id);
    setCustomerSearch(c.name);
    setCustomerDropdownOpen(false);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) { setError("Please select a customer."); return; }
    if (!form.license_plate.trim()) { setError("License plate is required."); return; }
    if (!form.make.trim() || !form.model.trim()) { setError("Vehicle make and model are required."); return; }

    try {
      setLoading(true);
      const res = await createVehicle({
        customer_id: customerId,
        license_plate: form.license_plate.trim().toUpperCase(),
        make: form.make.trim(),
        model: form.model.trim(),
        color: form.color.trim() || undefined,
      });
      if (res && res.success) {
        setCreated(res.vehicle);
        if (onSuccess) onSuccess(res.vehicle);
      } else {
        throw new Error(res?.message || "Failed to register vehicle.");
      }
    } catch (err) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reception-modal-overlay" onClick={onClose}>
      <div className="reception-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="reception-modal-header">
          <div>
            <p className="modal-eyebrow">REGISTRATION</p>
            <h3>Register Vehicle</h3>
            <span>Add a vehicle linked to a customer</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Success State */}
        {created ? (
          <div className="modal-success-body">
            <div className="modal-success-icon">
              <CheckCircle2 size={40} />
            </div>
            <h4>Vehicle Registered!</h4>
            <p>The vehicle has been added to the system.</p>

            <div className="modal-id-badge">
              <span>VEHICLE ID</span>
              <strong>{created.id}</strong>
            </div>

            <div className="modal-success-info">
              <div><span>License Plate</span><strong>{created.license_plate}</strong></div>
              <div><span>Make / Model</span><strong>{created.make} {created.model}</strong></div>
              {created.color && <div><span>Color</span><strong>{created.color}</strong></div>}
            </div>

            <div className="modal-footer">
              <button className="modal-btn-secondary" onClick={onClose}>Done</button>
              <button
                className="modal-btn-primary"
                onClick={() => onSuccess && onSuccess(created, "check-in")}
              >
                Check-In Vehicle →
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form-body">
            {error && <div className="modal-error">{error}</div>}

            {/* Customer select */}
            <div className="modal-field">
              <label>Customer <span className="required">*</span></label>
              <div style={{ position: "relative" }}>
                <div className="modal-input-wrap">
                  <Search size={15} />
                  <input
                    value={customerSearch}
                    onChange={handleCustomerSearch}
                    onFocus={() => setCustomerDropdownOpen(true)}
                    placeholder="Search customer by name or phone..."
                  />
                </div>
                {customerDropdownOpen && customers.length > 0 && (
                  <div className="modal-dropdown">
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="modal-dropdown-item"
                        onClick={() => selectCustomer(c)}
                      >
                        <strong>{c.name}</strong>
                        <span>{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
                {customerDropdownOpen && !loadingCustomers && customers.length === 0 && (
                  <div className="modal-dropdown">
                    <div className="modal-dropdown-empty">No customers found. Register a customer first.</div>
                  </div>
                )}
              </div>
              {customerId && (
                <small style={{ color: "#10b981", marginTop: "4px", display: "block", fontWeight: "600" }}>
                  ✓ Customer selected
                </small>
              )}
            </div>

            {/* License Plate */}
            <div className="modal-field">
              <label>License Plate <span className="required">*</span></label>
              <div className="modal-input-wrap">
                <Car size={15} />
                <input
                  name="license_plate"
                  value={form.license_plate}
                  onChange={handleChange}
                  placeholder="e.g. MH 12 AB 1234"
                  style={{ textTransform: "uppercase" }}
                />
              </div>
            </div>

            {/* Make & Model */}
            <div className="modal-field-row">
              <div className="modal-field">
                <label>Make <span className="required">*</span></label>
                <div className="modal-input-wrap">
                  <Car size={15} />
                  <input
                    name="make"
                    value={form.make}
                    onChange={handleChange}
                    placeholder="e.g. Toyota"
                  />
                </div>
              </div>
              <div className="modal-field">
                <label>Model <span className="required">*</span></label>
                <div className="modal-input-wrap">
                  <Car size={15} />
                  <input
                    name="model"
                    value={form.model}
                    onChange={handleChange}
                    placeholder="e.g. Fortuner"
                  />
                </div>
              </div>
            </div>

            {/* Color */}
            <div className="modal-field">
              <label>Color <span className="optional">(optional)</span></label>
              <div className="modal-input-wrap">
                <Car size={15} />
                <input
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                  placeholder="e.g. White"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="modal-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="modal-btn-primary" disabled={loading}>
                {loading ? "Registering..." : "Register Vehicle"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RegisterVehicleModal;

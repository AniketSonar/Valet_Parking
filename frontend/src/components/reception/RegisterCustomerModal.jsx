import React, { useState } from "react";
import { X, User, Phone, Mail, CheckCircle2 } from "lucide-react";
import { createCustomer } from "../../api/receptionApi";
import "./css/ReceptionCustomerModal.css";

const RegisterCustomerModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Customer name and phone number are required.");
      return;
    }
    try {
      setLoading(true);
      const res = await createCustomer({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
      });
      if (res && res.success) {
        setCreated(res.customer);
        if (onSuccess) onSuccess(res.customer);
      } else {
        throw new Error(res?.message || "Failed to register customer.");
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
            <h3>Register Customer</h3>
            <span>Add a new customer to the system</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Success State */}
        {created ? (
          <div className="modal-success-body">
            <div className="modal-success-icon">
              <CheckCircle2 size={40} />
            </div>
            <h4>Customer Registered!</h4>
            <p>The customer has been added to the system.</p>

            <div className="modal-id-badge">
              <span>CUSTOMER ID</span>
              <strong>{created.id}</strong>
            </div>

            <div className="modal-success-info">
              <div><span>Name</span><strong>{created.name}</strong></div>
              <div><span>Phone</span><strong>{created.phone}</strong></div>
              {created.email && <div><span>Email</span><strong>{created.email}</strong></div>}
            </div>

            <div className="modal-footer">
              <button className="modal-btn-secondary" onClick={onClose}>Done</button>
              <button
                className="modal-btn-primary"
                onClick={() => onSuccess && onSuccess(created, "register-vehicle")}
              >
                Register Vehicle →
              </button>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="modal-form-body">
            {error && <div className="modal-error">{error}</div>}

            <div className="modal-field">
              <label>Full Name <span className="required">*</span></label>
              <div className="modal-input-wrap">
                <User size={15} />
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Priya Sharma"
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-field">
              <label>Phone Number <span className="required">*</span></label>
              <div className="modal-input-wrap">
                <Phone size={15} />
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="e.g. +91 98765 43210"
                  type="tel"
                />
              </div>
            </div>

            <div className="modal-field">
              <label>Email Address <span className="optional">(optional)</span></label>
              <div className="modal-input-wrap">
                <Mail size={15} />
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="e.g. priya@example.com"
                  type="email"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="modal-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="modal-btn-primary" disabled={loading}>
                {loading ? "Registering..." : "Register Customer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RegisterCustomerModal;

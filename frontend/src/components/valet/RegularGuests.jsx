import React, { useState, useEffect, useMemo } from "react";
import {
  Star,
  Car,
  User,
  Phone,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  X,
  Calendar,
  Layers,
  Sparkles,
  Ticket,
} from "lucide-react";
import { getCustomers, createCustomer } from "../../api/receptionApi";
import { createVehicle, getVehicles, createParkingSession, getParkingSessions } from "../../api/parkingApi";
import "./css/ValetPages.css";

const STORAGE_KEY = "valet_regular_guest_packages";

const getSavedPackages = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const savePackages = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save packages to localStorage", err);
  }
};

const RegularGuests = () => {
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [packageMap, setPackageMap] = useState(getSavedPackages());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loggingVisitId, setLoggingVisitId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    license_plate: "",
    make: "",
    model: "",
    color: "",
    packageName: "Hotel Function / Wedding Package",
    packageNotes: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [custRes, vehRes] = await Promise.all([
        getCustomers(""),
        getVehicles(""),
      ]);
      setCustomers(custRes?.customers || []);
      setVehicles(vehRes?.vehicles || []);
    } catch (err) {
      setError(err?.message || "Failed to load regular guests data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegisterRegularGuest = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Customer name and phone number are required.");
      return;
    }
    if (!form.license_plate.trim()) {
      setError("Vehicle license plate is required.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      // 1. Create or link customer
      const custRes = await createCustomer({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        is_regular: true,
      });
      const customer = custRes?.customer || custRes;

      // 2. Create vehicle linked to customer
      const plate = form.license_plate.trim().toUpperCase();
      const vehRes = await createVehicle({
        license_plate: plate,
        make: form.make.trim() || "Regular Guest Car",
        model: form.model.trim() || "",
        color: form.color.trim() || "",
        customer_id: customer?.id,
      });
      const vehicle = vehRes?.vehicle || vehRes;

      // 3. Track package info and start count at 1
      const updatedPackages = {
        ...packageMap,
        [plate]: {
          packageName: form.packageName.trim() || "Event Package",
          packageNotes: form.packageNotes.trim() || "",
          visitCount: 1,
          customerName: form.name.trim(),
          phone: form.phone.trim(),
          lastVisit: new Date().toISOString(),
        },
      };
      setPackageMap(updatedPackages);
      savePackages(updatedPackages);

      // 4. Create initial parking session without money (₹0, package deduction)
      if (vehicle?.id) {
        try {
          await createParkingSession({
            vehicle_id: vehicle.id,
            parking_type: "valet",
            payment_method: "package_deduct",
            amount: 0,
            notes: `Regular Guest (${form.packageName || "Event Package"}) - Visit #1 recorded. No payment taken.`,
          });
        } catch (sessErr) {
          console.warn("Auto-session create skipped:", sessErr);
        }
      }

      setSuccess(`Regular vehicle ${plate} registered successfully! Visit #1 logged to package without charging.`);
      setShowModal(false);
      setForm({
        name: "",
        phone: "",
        email: "",
        license_plate: "",
        make: "",
        model: "",
        color: "",
        packageName: "Hotel Function / Wedding Package",
        packageNotes: "",
      });
      loadData();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err?.message || "Failed to register regular guest.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogVisit = async (vehicle, customer) => {
    const plate = (vehicle?.license_plate || "").toUpperCase();
    if (!plate) return;

    try {
      setLoggingVisitId(vehicle.id);
      setError("");

      const currentPkg = packageMap[plate] || {
        packageName: "Hotel Event Package",
        visitCount: 0,
      };
      const newCount = (currentPkg.visitCount || 0) + 1;

      // Create session with 0 payment
      await createParkingSession({
        vehicle_id: vehicle.id,
        parking_type: "valet",
        payment_method: "package_deduct",
        amount: 0,
        notes: `Regular Event Visit #${newCount} (${currentPkg.packageName}). Billed to package.`,
      });

      const updated = {
        ...packageMap,
        [plate]: {
          ...currentPkg,
          visitCount: newCount,
          lastVisit: new Date().toISOString(),
          customerName: customer?.name || currentPkg.customerName || "Regular Guest",
          phone: customer?.phone || currentPkg.phone || "",
        },
      };
      setPackageMap(updated);
      savePackages(updated);

      setSuccess(`Visit #${newCount} logged for ${plate} (${customer?.name || "Guest"}). No money taken — logged to package.`);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      console.error("Failed to log regular visit:", err);
      // Fallback: still increment counter locally even if active session exists
      const currentPkg = packageMap[plate] || {
        packageName: "Hotel Event Package",
        visitCount: 0,
      };
      const newCount = (currentPkg.visitCount || 0) + 1;
      const updated = {
        ...packageMap,
        [plate]: {
          ...currentPkg,
          visitCount: newCount,
          lastVisit: new Date().toISOString(),
        },
      };
      setPackageMap(updated);
      savePackages(updated);
      setSuccess(`Visit #${newCount} recorded for ${plate}. Billed to package.`);
      setTimeout(() => setSuccess(""), 4000);
    } finally {
      setLoggingVisitId(null);
    }
  };

  // Combine vehicles and customer package data
  const combinedList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    
    // First map all vehicles
    const list = vehicles.map((veh) => {
      const cust = customers.find((c) => c.id === veh.customer_id) || veh.customer || {};
      const plate = (veh.license_plate || "").toUpperCase();
      const pkg = packageMap[plate] || {
        packageName: "Hotel Event Package",
        visitCount: 1,
        packageNotes: "Regular function guest",
      };
      return {
        ...veh,
        customer: cust,
        package: pkg,
      };
    });

    if (!term) return list;

    return list.filter((item) => {
      const plate = item.license_plate || "";
      const custName = item.customer?.name || item.package?.customerName || "";
      const phone = item.customer?.phone || item.package?.phone || "";
      const pkgName = item.package?.packageName || "";
      return [plate, custName, phone, pkgName, item.make, item.model]
        .some((val) => String(val).toLowerCase().includes(term));
    });
  }, [vehicles, customers, packageMap, searchTerm]);

  return (
    <section className="completed-page">
      <div className="completed-header">
        <div>
          <span className="page-eyebrow">HOTEL FUNCTIONS & RECURRING GUESTS</span>
          <h1>Regular & Event Guests</h1>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div
            className="cr-search-bar"
            style={{
              display: "flex",
              alignItems: "center",
              background: "#ffffff",
              border: "1px solid #d9d2e9",
              borderRadius: "10px",
              padding: "6px 12px",
              gap: "8px",
            }}
          >
            <Search size={15} color="#6b5b7b" />
            <input
              type="text"
              placeholder="Search car, name, event..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: "0.82rem", width: "200px" }}
            />
          </div>

          <button className="page-refresh-btn" onClick={loadData} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
          </button>

          <button
            className="page-refresh-btn"
            style={{
              background: "#42235e",
              color: "#ffffff",
              borderColor: "#42235e",
              fontWeight: "600",
            }}
            onClick={() => setShowModal(true)}
          >
            <Plus size={15} /> Register Regular Car
          </button>
        </div>
      </div>

      {error && (
        <div className="page-error" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 18px",
            background: "#ecfdf5",
            border: "1px solid #6ee7b7",
            borderRadius: "10px",
            color: "#047857",
            fontWeight: "600",
            fontSize: "0.88rem",
            marginBottom: "16px",
          }}
        >
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Quick Info Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(66,35,94,0.06), rgba(188,155,106,0.12))",
          border: "1px solid rgba(188,155,106,0.3)",
          borderRadius: "12px",
          padding: "12px 18px",
          marginBottom: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Sparkles size={18} color="#bc9b6a" />
          <span style={{ fontSize: "0.84rem", color: "#42235e", fontWeight: "600" }}>
            <strong>How Package Billing Works:</strong> Registered event guests never pay cash at valet. Just click "Log Visit" whenever their car arrives. Total visits are tracked below to be deducted from their event package invoice.
          </span>
        </div>
      </div>

      {/* Modal to Register Regular Guest */}
      {showModal && (
        <div
          className="regular-guest-modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="regular-guest-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="regular-guest-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="regular-guest-modal-header">
              <div>
                <h2 id="regular-guest-modal-title">Register Regular / Event Guest</h2>
                <p style={{ fontSize: "0.78rem", color: "#888", marginTop: "2px" }}>
                  Vehicle will be linked to an event package. Zero cash collection.
                </p>
              </div>
              <button
                type="button"
                className="regular-guest-modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Close registration form"
              >
                <X size={18} />
              </button>
            </div>

            {error && <div className="regular-guest-modal-error">{error}</div>}

            <form
              onSubmit={handleRegisterRegularGuest}
              className="regular-guest-modal-form"
            >
              <div className="regular-guest-modal-section-title">
                1. Customer / Host Information
              </div>
              <label>
                Full Name *
                <input
                  required
                  placeholder="e.g. Vikram Singhania"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>

              <label>
                Phone Number *
                <input
                  required
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  placeholder="guest@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>

              <div className="regular-guest-modal-section-title">
                2. Vehicle Details
              </div>
              <label>
                License Plate *
                <input
                  required
                  placeholder="MH12AB1234"
                  value={form.license_plate}
                  onChange={(e) => setForm({ ...form, license_plate: e.target.value.toUpperCase() })}
                />
              </label>

              <div className="regular-guest-modal-vehicle-fields">
                <label>
                  Make
                  <input
                    placeholder="Mercedes / BMW"
                    value={form.make}
                    onChange={(e) => setForm({ ...form, make: e.target.value })}
                  />
                </label>
                <label>
                  Model
                  <input
                    placeholder="E-Class"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                  />
                </label>
                <label>
                  Color
                  <input
                    placeholder="Black"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                  />
                </label>
              </div>

              <div className="regular-guest-modal-section-title">
                3. Event / Package Assignment
              </div>
              <label>
                Package / Function Name *
                <input
                  required
                  placeholder="e.g. Sharma-Kapoor Wedding Package"
                  value={form.packageName}
                  onChange={(e) => setForm({ ...form, packageName: e.target.value })}
                />
              </label>

              <label>
                Notes (Room No, VIP Pass, etc.)
                <input
                  placeholder="e.g. Suite 402 - Unlimited valet pass"
                  value={form.packageNotes}
                  onChange={(e) => setForm({ ...form, packageNotes: e.target.value })}
                />
              </label>

              <div className="regular-guest-modal-actions">
                <button
                  type="button"
                  className="regular-guest-modal-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="regular-guest-modal-submit"
                  disabled={submitting}
                >
                  {submitting ? "Registering..." : "Register & Log 1st Visit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guest Cards List */}
      {loading ? (
        <div className="page-loading">
          <RefreshCw size={24} className="spin" />
          <span>Loading guest records...</span>
        </div>
      ) : combinedList.length === 0 ? (
        <div className="page-empty">
          <Star size={36} color="#bc9b6a" />
          <h3>No regular guests found</h3>
          <p>
            {searchTerm
              ? "No guests match your search. Try another keyword."
              : "Register your first recurring or event guest to begin tracking visits."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {combinedList.map((item) => {
            const plate = (item.license_plate || "").toUpperCase();
            const pkg = item.package || {};
            const visitCount = pkg.visitCount || 1;
            const isLogging = loggingVisitId === item.id;

            return (
              <div
                key={item.id || plate}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e8e2f0",
                  borderRadius: "14px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  transition: "box-shadow 0.2s ease",
                }}
              >
                {/* Left: Car & Plate info */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #f3eaf8, #fdf8f1)",
                      color: "#42235e",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Car size={22} />
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <strong style={{ fontSize: "1.05rem", color: "#2d1a4a", letterSpacing: "0.04em" }}>
                        {plate || "NO PLATE"}
                      </strong>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: "700",
                          background: "#fffbeb",
                          color: "#b45309",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          border: "1px solid #fde68a",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <Layers size={11} /> {pkg.packageName || "Event Package"}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.82rem", color: "#665874", marginTop: "2px" }}>
                      {[item.make, item.model].filter(Boolean).join(" ") || "Vehicle"}
                      {item.color ? ` • ${item.color}` : ""}
                    </div>
                  </div>
                </div>

                {/* Middle: Customer & Package info */}
                <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#9586a8", fontWeight: "600", textTransform: "uppercase" }}>Guest / Host</div>
                    <div style={{ fontSize: "0.88rem", fontWeight: "700", color: "#2d1a4a" }}>
                      {item.customer?.name || pkg.customerName || "Event Guest"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#8a7d99" }}>
                      {item.customer?.phone || pkg.phone || "—"}
                    </div>
                  </div>

                  {/* Visit Counter Badge */}
                  <div style={{ textAlign: "center", minWidth: "90px" }}>
                    <div style={{ fontSize: "0.72rem", color: "#9586a8", fontWeight: "600", textTransform: "uppercase" }}>Visits Logged</div>
                    <div
                      style={{
                        fontSize: "1.2rem",
                        fontWeight: "800",
                        color: "#bc9b6a",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Ticket size={16} />
                      {visitCount}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#059669", fontWeight: "600" }}>Package Billed</div>
                  </div>

                  {/* Action: Log Visit Button */}
                  <div>
                    <button
                      className="page-refresh-btn"
                      style={{
                        background: "#42235e",
                        color: "#ffffff",
                        borderColor: "#42235e",
                        padding: "8px 14px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 4px 12px rgba(66,35,94,0.18)",
                        cursor: isLogging ? "not-allowed" : "pointer",
                      }}
                      disabled={isLogging}
                      onClick={() => handleLogVisit(item, item.customer)}
                    >
                      <Car size={14} />
                      {isLogging ? "Logging..." : "+ Log Visit (No Charge)"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default RegularGuests;

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

function Profile() {
  const navigate = useNavigate();

  const [user] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // fallback
    }
    return {
      name: "Super Admin",
      email: "admin@valetparking.com",
      role: "super_admin",
      id: "ADM-001",
    };
  });

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SA";

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  return (
    <div className="profile-page">
      {/* Header */}
      <section className="profile-page-header">
        <div>
          <p className="profile-eyebrow">ACCOUNT</p>
          <h2>My Profile</h2>
          <p>Manage your administrative profile, credentials and access settings.</p>
        </div>
      </section>

      {/* Profile overview */}
      <section className="profile-overview">
        <div className="profile-main">
          <div className="profile-large-avatar">{initials}</div>

          <div className="profile-main-info">
            <h3>{user.name || "Super Admin"}</h3>
            <p>{user.email || "admin@valetparking.com"}</p>

            <div className="profile-status">
              <span></span>
              Active account
            </div>
          </div>
        </div>

        <div className="profile-role">
          <span>APPLICATION ROLE</span>
          <strong>Super Administrator</strong>
        </div>
      </section>

      {/* Main grid */}
      <section className="profile-grid">
        {/* Personal Information */}
        <div className="profile-panel">
          <div className="profile-panel-header">
            <div>
              <h3>Personal Information</h3>
              <p>Your primary account details</p>
            </div>
          </div>

          <div className="profile-fields">
            <div className="profile-field">
              <span>FULL NAME</span>
              <strong>{user.name || "Super Admin"}</strong>
            </div>

            <div className="profile-field">
              <span>EMAIL ADDRESS</span>
              <strong>{user.email || "admin@valetparking.com"}</strong>
            </div>

            <div className="profile-field">
              <span>ROLE</span>
              <strong>Super Admin</strong>
            </div>

            <div className="profile-field">
              <span>ACCOUNT STATUS</span>
              <strong className="active-field">
                <span></span>
                Active
              </strong>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="profile-panel">
          <div className="profile-panel-header">
            <div>
              <h3>Account Information</h3>
              <p>System account permissions</p>
            </div>
          </div>

          <div className="profile-fields">
            <div className="profile-field">
              <span>ACCOUNT ID</span>
              <strong>{user.id ? String(user.id).slice(0, 12) : "ADM-001"}</strong>
            </div>

            <div className="profile-field">
              <span>SYSTEM ROLE</span>
              <strong>System Owner / Super Admin</strong>
            </div>

            <div className="profile-field">
              <span>ACCESS LEVEL</span>
              <strong>Full System Access & Staff Control</strong>
            </div>

            <div className="profile-field">
              <span>SECURITY STATUS</span>
              <strong style={{ color: "#10b981" }}>Active JWT Session</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Actions */}
      <section className="profile-security">
        <div className="profile-panel-header">
          <div>
            <h3>Security & Session</h3>
            <p>Session management and authentication state.</p>
          </div>
        </div>

        <div className="security-options">
          <div className="security-option">
            <div className="security-icon">✓</div>
            <div>
              <strong>Account Protection</strong>
              <span>Protected via Supabase Auth & Role Guards</span>
            </div>
            <span className="security-active">Protected</span>
          </div>

          <div className="security-option">
            <div className="security-icon" style={{ background: "#fef2f2", color: "#b91c1c" }}>!</div>
            <div>
              <strong>Sign Out of Session</strong>
              <span>End your administrative session on this device</span>
            </div>
            <button
              onClick={handleLogout}
              style={{ background: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca", cursor: "pointer", padding: "8px 16px", borderRadius: "8px", border: "1px solid #fecaca", fontWeight: "700", fontSize: "12px" }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Profile;
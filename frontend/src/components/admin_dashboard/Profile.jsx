import React, { useRef, useState } from "react";
import "./Profile.css";
import "../layout/css/profile-theme.css";

const PHOTO_KEY = "profile_photo_super_admin";

function Profile() {
  const fileInputRef = useRef(null);

  const [user] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return { name: "Super Admin", email: "admin@valetparking.com", role: "super_admin", id: "ADM-001" };
  });

  const [photo, setPhoto] = useState(() => localStorage.getItem(PHOTO_KEY) || null);

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "SA";

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setPhoto(dataUrl);
      localStorage.setItem(PHOTO_KEY, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="profile-page superadmin-profile-page">
      {/* Header */}
      <section className="profile-page-header">
        <div>
          <p className="profile-eyebrow">ACCOUNT</p>
          <h2>My Profile</h2>
        </div>
      </section>

      {/* Profile overview */}
      <section className="profile-overview">
        <div className="profile-main">
          {/* Avatar with photo upload */}
          <div style={{ position: "relative", display: "inline-block", cursor: "pointer" }} onClick={() => fileInputRef.current?.click()} title="Change photo">
            {photo
              ? <img src={photo} alt="Profile" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "3px solid #8b1230" }} />
              : <div className="profile-large-avatar">{initials}</div>
            }
            <div style={{ position: "absolute", bottom: 0, right: 0, background: "#8b1230", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />

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

          </div>
        </div>
      </section>

    </div>
  );
}

export default Profile;

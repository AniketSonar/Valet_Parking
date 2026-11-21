import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  UserRound,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";

import { getValetDashboard } from "../../api/parkingApi";

// import "./css/ValetProfile.css";
import "./css/ValetPages.css";
import "../layout/css/profile-theme.css";

const ValetProfile = () => {
  const [valet, setValet] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const fileInputRef = useRef(null);
  const [photo, setPhoto] = useState(() => {
    try { return localStorage.getItem(`profile_photo_${JSON.parse(localStorage.getItem("user") || "{}").email || "valet"}`) || null; }
    catch { return null; }
  });

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setPhoto(dataUrl);
      try {
        const email = JSON.parse(localStorage.getItem("user") || "{}").email || "valet";
        localStorage.setItem(`profile_photo_${email}`, dataUrl);
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response =
          await getValetDashboard();

        setValet(response?.valet || null);
      } catch (err) {
        setError(
          err?.message ||
            "Unable to load profile."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="profile-state">
        Loading profile...
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-error">
        {error}
      </div>
    );
  }

  return (
    <section className="valet-profile-page">
      <div className="profile-header">
        <span className="page-eyebrow">
          ACCOUNT
        </span>

        <h1>Profile</h1>

      </div>

      {!valet ? (
        <div className="page-empty">
          <UserRound size={32} />

          <h3>Profile unavailable</h3>
        </div>
      ) : (
        <div className="profile-card">
          <div className="profile-hero">
            <div style={{ position: "relative", display: "inline-block", cursor: "pointer" }} onClick={() => fileInputRef.current?.click()} title="Change photo">
              {photo
                ? <img src={photo} alt="Profile" style={{ width: 68, height: 68, borderRadius: "50%", objectFit: "cover", border: "3px solid #8b1230" }} />
                : <div className="profile-avatar">
                    {(valet.name || "V").split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                  </div>
              }
              <div style={{ position: "absolute", bottom: 0, right: 0, background: "#8b1230", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />

            <div>
              <h2>{valet.name}</h2>

              <span>
                Valet
              </span>
            </div>
          </div>

          <div className="profile-details">
            <div>
              <UserRound size={18} />

              <section>
                <small>Name</small>
                <strong>
                  {valet.name || "—"}
                </strong>
              </section>
            </div>

            <div>
              <Mail size={18} />

              <section>
                <small>Email</small>
                <strong>
                  {valet.email || "—"}
                </strong>
              </section>
            </div>

            <div>
              <Phone size={18} />

              <section>
                <small>Phone</small>
                <strong>
                  {valet.phone || "—"}
                </strong>
              </section>
            </div>

            <div>
              <ShieldCheck size={18} />

              <section>
                <small>Account Status</small>

                <strong>
                  {valet.is_active
                    ? "Active"
                    : "Inactive"}
                </strong>
              </section>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ValetProfile;
import React, {
  useEffect,
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

const ValetProfile = () => {
  const [valet, setValet] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

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

        <p>
          Your valet account information.
        </p>
      </div>

      {!valet ? (
        <div className="page-empty">
          <UserRound size={32} />

          <h3>Profile unavailable</h3>
        </div>
      ) : (
        <div className="profile-card">
          <div className="profile-hero">
            <div className="profile-avatar">
              {(valet.name || "V")
                .split(" ")
                .slice(0, 2)
                .map(
                  (part) =>
                    part[0]
                )
                .join("")
                .toUpperCase()}
            </div>

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
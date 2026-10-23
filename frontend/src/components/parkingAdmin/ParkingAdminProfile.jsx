import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Mail,
  ShieldCheck,
  Monitor,
  Clock3,
  KeyRound,
  CheckCircle2,
  LogOut,
  UserRound,
  RefreshCw,
} from "lucide-react";

import { getParkingAdminProfile } from "../../api/parkingApi";

import "./css/ParkingAdminProfile.css";

const getStoredUser = () => {
  try {
    const stored = localStorage.getItem("user");

    if (!stored) {
      return null;
    }

    return JSON.parse(stored);
  } catch {
    return null;
  }
};

const ParkingAdminProfile = ({ onLogout }) => {
  const [profile, setProfile] = useState(() => {
    const storedUser = getStoredUser();

    return storedUser
      ? {
          name: storedUser.name || "",
          email: storedUser.email || "",
          role: storedUser.role || "",
          accountStatus:
            storedUser.is_active === false
              ? "Inactive"
              : "Active",
          created_at: storedUser.created_at || null,
        }
      : null;
  });

  const [loading, setLoading] = useState(!profile);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchProfile = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (!profile) {
        setLoading(true);
      }

      setError("");

      const response = await getParkingAdminProfile();

      if (!response?.success || !response?.user) {
        throw new Error(
          response?.message ||
            "Unable to load profile information."
        );
      }

      const user = response.user;

      setProfile({
        name: user.name || "",
        email: user.email || "",
        role: user.role || "",
        accountStatus:
          user.is_active === false
            ? "Inactive"
            : "Active",
        created_at: user.created_at || null,
      });
    } catch (err) {
      console.error(
        "Parking Admin profile error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load profile information."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // Profile should only be loaded when this page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initials = useMemo(() => {
    if (!profile?.name) {
      return "PA";
    }

    const parts = profile.name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [profile]);

  const formattedDate = profile?.created_at
    ? new Date(
        profile.created_at
      ).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Not available";

  const isActive =
    profile?.accountStatus === "Active";

  return (
    <main className="profile-page">

      {/* ======================================================
          PAGE HEADER
          ====================================================== */}

      <header className="profile-page-header">
        <div>
          <span className="profile-eyebrow">
            ACCOUNT & ACCESS
          </span>

          <h2>My Profile</h2>

          <p>
            View your account details, role,
            security status and system access.
          </p>
        </div>

        <button
          type="button"
          className="profile-refresh-btn"
          onClick={() => fetchProfile(true)}
          disabled={loading || refreshing}
        >
          <RefreshCw
            size={14}
            className={
              refreshing
                ? "profile-refresh-spin"
                : ""
            }
          />

          <span>
            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </span>
        </button>
      </header>

      {/* ======================================================
          ERROR
          ====================================================== */}

      {error && (
        <div className="profile-error">
          <span className="profile-error-icon">
            !
          </span>

          <span>{error}</span>

          <button
            type="button"
            onClick={() => fetchProfile(true)}
          >
            Try again
          </button>
        </div>
      )}

      {/* ======================================================
          PROFILE OVERVIEW
          ====================================================== */}

      <section className="profile-overview">

        <div className="profile-main">

          <div className="profile-large-avatar">
            {loading ? "…" : initials}
          </div>

          <div className="profile-main-info">

            <h3>
              {loading
                ? "Loading profile..."
                : profile?.name || "Name unavailable"}
            </h3>

            <p>
              {profile?.email ||
                "Email unavailable"}
            </p>

            <div
              className={`profile-status ${
                !isActive
                  ? "inactive"
                  : ""
              }`}
            >
              <span className="profile-status-dot" />

              {profile?.accountStatus ||
                "Unknown"}{" "}
              Account
            </div>

          </div>
        </div>

        <div className="profile-role">
          <span>APPLICATION ROLE</span>

          <strong>
            {profile?.role || "Not available"}
          </strong>

          <small>
            Managed by system administration
          </small>
        </div>

      </section>

      {/* ======================================================
          MAIN GRID
          ====================================================== */}

      <div className="profile-grid">

        {/* ====================================================
            ACCOUNT INFORMATION
            ==================================================== */}

        <section className="profile-panel">

          <div className="profile-panel-header">

            <div>
              <span className="profile-panel-eyebrow">
                ACCOUNT
              </span>

              <h3>
                Account Information
              </h3>

              <p>
                Information associated with your
                parking administration account.
              </p>
            </div>

            <div className="profile-panel-icon">
              <UserRound size={17} />
            </div>

          </div>

          <div className="profile-fields">

            <div className="profile-field">
              <div className="field-icon">
                <UserRound size={15} />
              </div>

              <div>
                <span>FULL NAME</span>

                <strong>
                  {profile?.name ||
                    "Not available"}
                </strong>
              </div>
            </div>

            <div className="profile-field">
              <div className="field-icon">
                <Mail size={15} />
              </div>

              <div>
                <span>ACCOUNT EMAIL</span>

                <strong>
                  {profile?.email ||
                    "Not available"}
                </strong>
              </div>
            </div>

            <div className="profile-field">
              <div
                className={`field-icon ${
                  isActive
                    ? "success"
                    : "inactive"
                }`}
              >
                <CheckCircle2 size={15} />
              </div>

              <div>
                <span>ACCOUNT STATUS</span>

                <strong
                  className={
                    isActive
                      ? "text-green"
                      : "text-red"
                  }
                >
                  {profile?.accountStatus ||
                    "Not available"}
                </strong>
              </div>
            </div>

            <div className="profile-field">
              <div className="field-icon">
                <ShieldCheck size={15} />
              </div>

              <div>
                <span>APPLICATION ROLE</span>

                <strong>
                  {profile?.role ||
                    "Not available"}
                </strong>
              </div>
            </div>

          </div>
        </section>

        {/* ====================================================
            SECURITY & SESSION
            ==================================================== */}

        <section className="profile-panel profile-security">

          <div className="profile-panel-header">

            <div>
              <span className="profile-panel-eyebrow">
                SECURITY
              </span>

              <h3>
                Security & Session
              </h3>

              <p>
                Current authentication and account
                access information.
              </p>
            </div>

            <div className="profile-panel-icon">
              <ShieldCheck size={17} />
            </div>

          </div>

          <div className="security-options">

            <div className="security-option">

              <div className="security-option-icon">
                <Monitor size={17} />
              </div>

              <div className="security-option-content">
                <strong>
                  Active Web Session
                </strong>

                <span>
                  Your current authenticated
                  application session.
                </span>
              </div>

              <span className="session-active">
                Active
              </span>

            </div>

            <div className="security-option">

              <div className="security-option-icon">
                <Clock3 size={17} />
              </div>

              <div className="security-option-content">
                <strong>
                  Member Since
                </strong>

                <span>
                  {formattedDate}
                </span>
              </div>

            </div>

            {onLogout && (
              <div className="security-option security-logout">

                <div className="security-option-icon danger">
                  <LogOut size={17} />
                </div>

                <div className="security-option-content">
                  <strong>
                    Sign Out
                  </strong>

                  <span>
                    End your current session
                    on this device.
                  </span>
                </div>

                <button
                  type="button"
                  className="security-btn"
                  onClick={onLogout}
                >
                  Logout
                </button>

              </div>
            )}

          </div>
        </section>

      </div>

      {/* ======================================================
          ACCESS INFORMATION
          ====================================================== */}

      <section className="profile-access-card">

        <div className="access-card-icon">
          <KeyRound size={18} />
        </div>

        <div className="access-card-content">

          <span className="access-card-eyebrow">
            SYSTEM ACCESS
          </span>

          <h3>
            Parking Administration Access
          </h3>

          <p>
            Your permissions are determined by your
            assigned application role. Access to
            parking operations, slot management,
            valet coordination, retrieval workflows
            and operational reporting is controlled
            by the system.
          </p>

        </div>

        <div className="access-card-role">

          <span>ROLE</span>

          <strong>
            {profile?.role ||
              "Not available"}
          </strong>

        </div>

      </section>

    </main>
  );
};

export default ParkingAdminProfile;
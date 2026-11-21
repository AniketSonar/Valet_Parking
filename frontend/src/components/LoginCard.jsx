import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Chatbot from "./Chatbot";

function LoginCard() {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";

  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showChatbot, setShowChatbot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Staff registration state
  const [regForm, setRegForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "valet",
    hotel_id: "",
    floor_id: "",
    position_name: "",
  });
  const [branches, setBranches] = useState([]);
  const selectedBranch = branches.find((branch) => branch.id === regForm.hotel_id);

  // Fetch available hotel branches for staff registration
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    fetch(`${apiUrl}/api/auth/branches`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.branches)) {
          setBranches(data.branches);
          if (data.branches.length > 0) {
            setRegForm((prev) => ({ ...prev, hotel_id: prev.hotel_id || data.branches[0].id }));
          }
        }
      })
      .catch((err) => console.warn("Could not load branches for registration:", err));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Login failed.");
        return;
      }

      localStorage.setItem("access_token", data.session.access_token);
      localStorage.setItem("refresh_token", data.session.refresh_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      const role = data.user?.role;

      if (role === "super_admin") {
        navigate("/admin-dashboard", { replace: true });
      } else if (role === "manager" || role === "parking_admin") {
        navigate("/parking-admin-dashboard", { replace: true });
      } else if (role === "valet" || role === "valet_attendant") {
        navigate("/valet-dashboard", { replace: true });
      } else if (role === "customer") {
        navigate("/customer-dashboard", { replace: true });
      } else {
        setError("You do not have permission to access this application.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStaff = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!regForm.name || !regForm.email || !regForm.password || !regForm.hotel_id) {
      setError("Full name, email, password, and hotel branch are required.");
      return;
    }

    if (regForm.role === "valet" && !regForm.floor_id) {
      setError("Please select a parking level.");
      return;
    }

    if (regForm.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

      const res = await fetch(`${apiUrl}/api/auth/staff-register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(regForm),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Failed to submit joining request.");
        return;
      }

      setSuccessMsg(data.message || "Joining request submitted successfully! Once approved by the Admin or Branch Manager, you can sign in.");
      setRegForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "valet",
        hotel_id: branches[0]?.id || "",
        floor_id: "",
        position_name: "",
      });
    } catch (err) {
      console.error("Registration error:", err);
      setError("Unable to submit request. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vp-login-wrapper">
      <div className="vp-auth-card">
        {/* BRAND LOGO */}
        <div style={{ textAlign: "center", marginBottom: mode === "register" ? "8px" : "18px" }}>
          <img
            src="/conrad-logo-gold.png"
            alt="CONRAD PUNE"
            style={{
              height: mode === "register" ? "32px" : "44px",
              maxWidth: "220px",
              objectFit: "contain",
              display: "inline-block",
              filter: "brightness(1.05)"
            }}
          />
        </div>

        {/* CARD HEADER */}
        <div className="vp-card-heading" style={{ marginBottom: mode === "register" ? "12px" : "22px" }}>
          <h2 style={{ fontSize: mode === "register" ? "20px" : "26px", margin: "0 0 2px" }}>
            {mode === "register" ? "Join Staff Team" : "Welcome Back"}
          </h2>
          <p style={{ fontSize: mode === "register" ? "12px" : "13.5px" }}>
            {mode === "register"
              ? "Submit your registration to join a hotel branch"
              : "Sign in to operations portal"}
          </p>
        </div>

        {/* ERROR DISPLAY */}
        {error && (
          <div className="vp-error-banner" role="alert" style={{ marginBottom: "14px" }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* SUCCESS DISPLAY */}
        {successMsg && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "10px",
              background: "#ecfdf5",
              border: "1px solid #10b981",
              color: "#065f46",
              fontSize: "12.5px",
              lineHeight: 1.5,
              fontWeight: "600",
              marginBottom: "16px"
            }}
          >
            🎉 {successMsg}
            <div style={{ marginTop: "10px" }}>
              <button
                type="button"
                onClick={() => { setMode("login"); setSuccessMsg(""); }}
                style={{
                  background: "#42235e",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                Proceed to Staff Sign In →
              </button>
            </div>
          </div>
        )}

        {/* MODE 1: LOGIN FORM */}
        {mode === "login" ? (
          <form onSubmit={handleLogin} autoComplete="off">
            {/* EMAIL INPUT */}
            <div className="vp-input-field">
              <svg className="vp-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              <input
                id="staff-email"
                type="text"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>

            {/* PASSWORD INPUT */}
            <div className="vp-input-field">
              <svg className="vp-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="4" y="10" width="16" height="11" rx="3" />
                <path d="M7 10V7a5 5 0 0 1 10 0v3" />
              </svg>
              <input
                id="staff-password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="vp-pwd-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>

            {/* REMEMBER ME + FORGOT PASSWORD */}
            <div className="vp-form-options">
              <label className="vp-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="vp-checkbox-custom">
                  {rememberMe && (
                    <svg viewBox="0 0 12 10" fill="none">
                      <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="vp-remember-text">Remember me</span>
              </label>

              <a href="#forgot" className="vp-forgot-link">
                Forgot password?
              </a>
            </div>

            {/* SIGN IN BUTTON */}
            <button type="submit" className="vp-signin-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="vp-btn-spinner" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="vp-btn-arrow">→</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* MODE 2: REGISTER FORM */
          <form onSubmit={handleRegisterStaff} autoComplete="off">
            {/* FULL NAME */}
            <div className="vp-input-field vp-input-field-compact">
              <svg className="vp-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                type="text"
                placeholder="Full Name *"
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                required
              />
            </div>

            {/* EMAIL */}
            <div className="vp-input-field vp-input-field-compact">
              <svg className="vp-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              <input
                type="email"
                placeholder="Email Address *"
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                required
              />
            </div>

            {/* PHONE & PASSWORD ROW */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "8px", marginBottom: "8px", width: "100%" }}>
              <div className="vp-input-field vp-input-field-compact" style={{ marginBottom: 0, minWidth: 0, width: "100%", overflow: "hidden" }}>
                <svg className="vp-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <input
                  type="text"
                  placeholder="Phone"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  style={{ minWidth: 0, width: "100%" }}
                />
              </div>

              <div className="vp-input-field vp-input-field-compact" style={{ marginBottom: 0, minWidth: 0, width: "100%", overflow: "hidden" }}>
                <svg className="vp-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
                  <rect x="4" y="10" width="16" height="11" rx="3" />
                  <path d="M7 10V7a5 5 0 0 1 10 0v3" />
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password *"
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  required
                  style={{ minWidth: 0, width: "100%" }}
                />
              </div>
            </div>

            {/* ROLE SELECT & HOTEL BRANCH SELECT ROW */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "8px", marginBottom: "8px", width: "100%" }}>
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase", marginBottom: "2px" }}>
                  Role *
                </label>
                <select
                  value={regForm.role}
                  onChange={(e) => setRegForm({ ...regForm, role: e.target.value, floor_id: "" })}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1.5px solid #e5e7eb",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#374151",
                    background: "#ffffff",
                    outline: "none"
                  }}
                >
                  <option value="valet">Valet Staff</option>
                  <option value="manager">Branch Manager</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase", marginBottom: "2px" }}>
                  Hotel Branch *
                </label>
                <select
                  value={regForm.hotel_id}
                  onChange={(e) => setRegForm({ ...regForm, hotel_id: e.target.value, floor_id: "" })}
                  required
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1.5px solid #bc9b6a",
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#42235e",
                    background: "#fffdfa",
                    outline: "none"
                  }}
                >
                  {branches.length === 0 && (
                    <option value="">Loading...</option>
                  )}
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.building_name} ({b.location})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {regForm.role === "valet" && (
              <div style={{ marginBottom: "8px" }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase", marginBottom: "2px" }}>
                  Parking Level *
                </label>
                <select
                  value={regForm.floor_id}
                  onChange={(e) => setRegForm({ ...regForm, floor_id: e.target.value })}
                  required
                  disabled={!selectedBranch?.floors?.length}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1.5px solid #bc9b6a",
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#42235e",
                    background: "#fffdfa",
                    outline: "none"
                  }}
                >
                  <option value="">
                    {selectedBranch?.floors?.length ? "Select a parking level" : "No parking levels available"}
                  </option>
                  {(selectedBranch?.floors || []).map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.floor_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "12px", lineHeight: 1.3 }}>
              🛡️ <em>Request will be sent to the Admin and Branch Manager. You can log in once approved.</em>
            </div>

            {/* SUBMIT BUTTON */}
            <button type="submit" className="vp-signin-btn vp-signin-btn-compact" disabled={loading}>
              {loading ? (
                <>
                  <span className="vp-btn-spinner" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit Joining Request</span>
                  <span className="vp-btn-arrow">✓</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* TOGGLE BETWEEN LOGIN & REGISTER */}
        <div className="vp-card-footer">
          {mode === "login" ? (
            <>
              <span>New joining staff? </span>
              <button
                type="button"
                className="vp-signup-link"
                onClick={() => { setMode("register"); setError(""); setSuccessMsg(""); }}
                style={{ fontWeight: "800", color: "#bc9b6a" }}
              >
                Staff Sign Up / Join Team
              </button>
            </>
          ) : (
            <>
              <span>Already registered? </span>
              <button
                type="button"
                className="vp-signup-link"
                onClick={() => { setMode("login"); setError(""); setSuccessMsg(""); }}
                style={{ fontWeight: "800", color: "#42235e" }}
              >
                Sign In to Account
              </button>
            </>
          )}
        </div>

        {/* CUSTOMER PORTAL SWITCHER */}
        <div className="vp-portal-switch">
          <span>Are you a guest/customer? </span>
          <button
            type="button"
            className="vp-switch-btn"
            onClick={() => navigate("/customer-login")}
          >
            Customer Portal →
          </button>
        </div>
      </div>

      {showChatbot && <Chatbot onClose={() => setShowChatbot(false)} />}
    </div>
  );
}

export default LoginCard;

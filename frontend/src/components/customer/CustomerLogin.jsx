import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Hero from "../Hero";

function CustomerLogin() {
  const location = useLocation();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState(
    location.state?.registeredEmail || ""
  );

  useEffect(() => {
    if (location.state?.registeredEmail) {
      setEmail(location.state.registeredEmail);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Login failed.");
        return;
      }

      const role = data.user?.role;

      if (role !== "customer") {
        setError(
          "This portal is for customer accounts. Please use the staff login."
        );
        return;
      }

      localStorage.setItem("access_token", data.session.access_token);
      localStorage.setItem("refresh_token", data.session.refresh_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/customer-dashboard", { replace: true });
    } catch (err) {
      console.error("Customer login error:", err);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      {/* LEFT HERO SECTION (IDENTICAL TO STAFF LOGIN) */}
      <section className="hero-section">
        <Hero />
      </section>

      {/* RIGHT AUTH SECTION (EXACT CARD DESIGN) */}
      <section className="login-section">
        <div className="vp-login-wrapper">
          <div className="vp-auth-card">
            {/* CARD HEADER */}
            <div className="vp-card-heading">
              <h2>Welcome Back</h2>
              <p>Sign in to continue</p>
            </div>

            {/* ERROR DISPLAY */}
            {error && (
              <div className="vp-error-banner" role="alert">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            <form onSubmit={handleLogin} autoComplete="off">
              {/* EMAIL INPUT */}
              <div className="vp-input-field">
                <svg className="vp-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
                <input
                  id="customer-email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              {/* PASSWORD INPUT */}
              <div className="vp-input-field">
                <svg className="vp-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="4" y="10" width="16" height="11" rx="3" />
                  <path d="M7 10V7a5 5 0 0 1 10 0v3" />
                </svg>
                <input
                  id="customer-password"
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

            {/* FOOTER: SIGN UP PROMPT & STAFF PORTAL LINK */}
            <div className="vp-card-footer">
              <span>Don't have an account? </span>
              <button
                type="button"
                className="vp-signup-link"
                onClick={() => navigate("/customer-register")}
              >
                Sign Up
              </button>
            </div>

            {/* STAFF PORTAL SWITCHER */}
            <div className="vp-portal-switch">
              <span>Staff Member? </span>
              <button
                type="button"
                className="vp-switch-btn"
                onClick={() => navigate("/login")}
              >
                Staff Login →
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default CustomerLogin;

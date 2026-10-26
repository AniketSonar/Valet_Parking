
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./css/CustomerAuth.css";

function CustomerLogin() {
  const location = useLocation();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
          "This login is only for customer accounts. Please use the staff login."
        );
        return;
      }

      localStorage.setItem("access_token", data.session.access_token);
      localStorage.setItem("refresh_token", data.session.refresh_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/customer-dashboard", { replace: true });
    } catch (error) {
      console.error("Customer login error:", error);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="customer-auth-page">
      {/* Animated background elements */}
      <div className="ca-bg-mesh" />
      <div className="ca-orb ca-orb-1" />
      <div className="ca-orb ca-orb-2" />
      <div className="ca-orb ca-orb-3" />

      <div className="customer-auth-shell">

        {/* Brand header */}
        <div className="customer-auth-brand">
          <div className="customer-brand-logo">
            <img src="/aura-logo.svg" alt="Aura Valet Parking" />
          </div>
          <div>
            <h2>AURA</h2>
            <span>VALET PARKING</span>
          </div>
        </div>

        <div className="customer-auth-card">

          {/* Decorative accent bar */}
          <div className="ca-accent-bar" />

          <div className="customer-auth-heading">
            <span className="customer-auth-kicker">
              ✦ Customer Access
            </span>
            <h1>Welcome back</h1>
            <p>Sign in to manage your vehicles and parking sessions.</p>
          </div>

          <form onSubmit={handleLogin} autoComplete="off">
            <div className="customer-input-group">
              <label htmlFor="customer-email">Email address</label>
              <div className="ca-input-wrapper">
                <svg className="ca-input-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M2.5 6.5 L10 11.25 L17.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <input
                  id="customer-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="customer-input-group">
              <label htmlFor="customer-password">Password</label>
              <div className="customer-password-wrapper ca-input-wrapper">
                <svg className="ca-input-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  id="customer-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="customer-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="ca-forgot-row">
              <a href="#forgot" className="ca-forgot-link">Forgot password?</a>
            </div>

            {error && (
              <div className="customer-auth-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{flexShrink:0}}>
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="customer-primary-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="ca-spinner" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path d="M3.75 9h10.5M9.75 4.5L14.25 9l-4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="customer-auth-divider">
            <span />
            <small>or</small>
            <span />
          </div>

          <div className="customer-register-prompt">
            <span>Don't have a customer account?</span>
            <button
              type="button"
              onClick={() => navigate("/customer-register")}
            >
              Create an account →
            </button>
          </div>

          <button
            type="button"
            className="customer-back-button"
            onClick={() => navigate("/")}
          >
            ← Back to main site
          </button>

        </div>

        {/* Trust strip */}
        <div className="ca-trust-strip">
          <span>🔒 256-bit SSL Encrypted</span>
          <span className="ca-trust-dot">•</span>
          <span>⭐ 4.9/5 Customer Rating</span>
          <span className="ca-trust-dot">•</span>
          <span>🚗 Trusted by 10,000+ guests</span>
        </div>

      </div>
    </main>
  );
}

export default CustomerLogin;

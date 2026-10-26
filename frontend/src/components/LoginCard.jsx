
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Chatbot from "./Chatbot";

function LoginCard() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);

      const apiUrl =
        import.meta.env.VITE_API_URL || "http://localhost:5000";

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

  return (
    <div className="login-wrapper">
      {/* Decorative animated orbs */}
      <div className="lc-orb lc-orb-1" />
      <div className="lc-orb lc-orb-2" />
      <div className="lc-orb lc-orb-3" />

      <div className="login-top">
        <button
          className="help"
          type="button"
          onClick={() => setShowChatbot(true)}
        >
          <span className="help-icon">?</span>
          <span>Need help?</span>
        </button>
      </div>

      <div className="login-card-container">
        <div className="login-card">

          {/* Brand row inside card */}
          <div className="lc-brand-row">
            <div className="lc-brand-icon">
              <img src="/aura-logo.svg" alt="Aura" className="lc-logo-img" />
            </div>
            <div className="lc-brand-text">
              <span className="lc-brand-name">AURA</span>
              <span className="lc-brand-sub">STAFF PORTAL</span>
            </div>
          </div>

          <div className="login-heading">
            <h1>Welcome Back</h1>
            <p>Sign in to access your operations dashboard</p>
          </div>

          <form onSubmit={handleLogin} autoComplete="off">
            <div className="input-group">
              <label htmlFor="email">Email or Phone Number</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M2.5 6.5 L10 11.25 L17.5 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                <input
                  id="email"
                  type="text"
                  placeholder="Enter your email or phone"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M2.5 10s2.5-5 7.5-5 7.5 5 7.5 5-2.5 5-7.5 5-7.5-5-7.5-5Z" stroke="currentColor" strokeWidth="1.6" />
                      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M3 3l14 14M7.5 7.8A4.2 4.2 0 0 0 10 14.5c2.5 0 4.5-2 4.5-4.5a4.2 4.2 0 0 0-.7-2.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M5.2 5.5C3.4 6.8 2.2 8.4 1.5 10c0 0 2.5 5 8.5 5 1.6 0 3-.5 4.1-1.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="password-options">
              <label className="remember">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#forgot">Forgot Password?</a>
            </div>

            {error && (
              <div className="login-error" role="alert">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{flexShrink:0}}>
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="lc-spinner" />
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

          <div className="divider">
            <span></span>
            <p>or</p>
            <span></span>
          </div>

          <div className="signup">Are you a customer?</div>

          <button
            type="button"
            className="customer-button"
            onClick={() => navigate("/customer-login")}
          >
            <svg width="16" height="16" viewBox="0 0 17 17" fill="none" aria-hidden="true">
              <circle cx="8.5" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M2.5 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>Go to Customer Portal</span>
          </button>

        </div>
      </div>

      {showChatbot && (
        <Chatbot onClose={() => setShowChatbot(false)} />
      )}
    </div>
  );
}

export default LoginCard;

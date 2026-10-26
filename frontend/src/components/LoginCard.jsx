import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Chatbot from "./Chatbot";

function LoginCard() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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

  return (
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

        {/* OR DIVIDER */}
        <div className="vp-divider">
          <span></span>
          <p>OR</p>
          <span></span>
        </div>

        {/* GOOGLE SIGN IN */}
        <button
          type="button"
          className="vp-google-btn"
          onClick={() => alert("Google Sign-In is configured via Supabase.")}
        >
          <svg className="vp-google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* FOOTER: SIGN UP PROMPT & CUSTOMER PORTAL LINK */}
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

        {/* CUSTOMER PORTAL SWITCHER */}
        <div className="vp-portal-switch">
          <span>Are you a customer? </span>
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

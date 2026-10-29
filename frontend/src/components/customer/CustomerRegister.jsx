import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Hero from "../Hero";

function CustomerRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      const apiUrl =
        import.meta.env.VITE_API_URL || "http://localhost:5000";

      const response = await fetch(
        `${apiUrl}/api/auth/customer-register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            phone: form.phone.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.message || "Unable to create customer account."
        );
        return;
      }

      setSuccess(
        "Account created successfully. Redirecting to login..."
      );

      setTimeout(() => {
        navigate("/customer-login", {
          replace: true,
          state: {
            registeredEmail: form.email.trim().toLowerCase(),
          },
        });
      }, 1200);
    } catch (error) {
      console.error("Customer registration error:", error);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="hero-section">
        <Hero />
      </section>

      <section className="login-section">
        <div className="vp-login-wrapper">
          <div className="vp-auth-card">
            <div className="vp-card-heading">
              <h2>Create Account</h2>
              <p>Register to manage your vehicles and parking sessions</p>
            </div>

            {error && (
              <div className="vp-error-banner" role="alert">
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="vp-success-banner" role="status">
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleRegister} autoComplete="on">
              <div className="vp-input-field">
                <svg className="vp-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
                </svg>
                <input
                  id="customer-name"
                  name="name"
                  type="text"
                  placeholder="Full name"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="vp-input-field">
                <svg className="vp-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.84.58 2.8.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <input
                  id="customer-phone"
                  name="phone"
                  type="tel"
                  placeholder="Phone number"
                  value={form.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                  required
                />
              </div>

              <div className="vp-input-field">
                <svg className="vp-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
                <input
                  id="customer-register-email"
                  name="email"
                  type="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="vp-input-field">
                <svg className="vp-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="4" y="10" width="16" height="11" rx="3" />
                  <path d="M7 10V7a5 5 0 0 1 10 0v3" />
                </svg>
                <input
                  id="customer-register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="vp-pwd-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="vp-input-field">
                <svg className="vp-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="4" y="10" width="16" height="11" rx="3" />
                  <path d="M7 10V7a5 5 0 0 1 10 0v3" />
                </svg>
                <input
                  id="customer-confirm-password"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />
              </div>

              <button
                type="submit"
                className="vp-signin-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="vp-btn-spinner" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <span className="vp-btn-arrow">→</span>
                  </>
                )}
              </button>
            </form>

            <div className="vp-card-footer">
              <span>Already have an account? </span>
              <button
                type="button"
                className="vp-signup-link"
                onClick={() => navigate("/customer-login")}
              >
                Login
              </button>
            </div>

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

export default CustomerRegister;
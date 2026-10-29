import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/CustomerAuth.css";

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
    <main className="customer-auth-page">

      <div className="customer-auth-shell">
        <div className="customer-auth-brand">
          <div className="customer-brand-logo">
            <img
              src="/valet-logo.svg"
              alt="Valet Parking"
            />
          </div>

          <div>
            <h2>VALET</h2>
            <span>PARKING</span>
          </div>
        </div>

        <div className="customer-auth-card customer-register-card">
          <div className="customer-auth-heading">
            <span className="customer-auth-kicker">
              Customer registration
            </span>

            <h1>Create your account</h1>

            <p>
              Register to manage your vehicles and parking sessions.
            </p>
          </div>

          <form onSubmit={handleRegister}>
            <div className="customer-input-group">
              <label htmlFor="customer-name">
                Full name
              </label>

              <input
                id="customer-name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
              />
            </div>

            <div className="customer-input-group">
              <label htmlFor="customer-phone">
                Phone number
              </label>

              <input
                id="customer-phone"
                name="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            <div className="customer-input-group">
              <label htmlFor="customer-register-email">
                Email address
              </label>

              <input
                id="customer-register-email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div className="customer-input-group">
              <label htmlFor="customer-register-password">
                Password
              </label>

              <div className="customer-password-wrapper">
                <input
                  id="customer-register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={form.password}
                  onChange={handleChange}
                />

                <button
                  type="button"
                  className="customer-password-toggle"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="customer-input-group">
              <label htmlFor="customer-confirm-password">
                Confirm password
              </label>

              <input
                id="customer-confirm-password"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={form.confirmPassword}
                onChange={handleChange}
              />
            </div>

            {error && (
              <div
                className="customer-auth-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="customer-auth-success"
                role="status"
              >
                {success}
              </div>
            )}

            <button
              type="submit"
              className="customer-primary-button"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="customer-register-prompt">
            <span>Already have an account?</span>

            <button
              type="button"
              onClick={() => navigate("/customer-login")}
            >
              Login
            </button>
          </div>

          <button
            type="button"
            className="customer-back-button"
            onClick={() => navigate("/")}
          >
            ← Back to main login
          </button>
        </div>
      </div>
    </main>
  );
}

export default CustomerRegister;

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// import ThemeToggle from "../ThemeToggle";
import "./css/CustomerAuth.css";

function CustomerLogin() {
  const location = useLocation();
  const navigate = useNavigate();

  // const [email, setEmail] = useState("");
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

    navigate(location.pathname, {
      replace: true,
      state: {},
    });
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

      const apiUrl =
        import.meta.env.VITE_API_URL || "http://localhost:5000";

      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
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

      localStorage.setItem(
        "access_token",
        data.session.access_token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      navigate("/customer-dashboard", {
        replace: true,
      });
    } catch (error) {
      console.error("Customer login error:", error);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="customer-auth-page">
      <div className="customer-auth-theme">
        {/* <ThemeToggle /> */}
      </div>

      <div className="customer-auth-shell">
        <div className="customer-auth-brand">
          <div className="customer-brand-logo">
            <img
              src="/aura-logo.svg"
              alt="Aura Valet Parking"
            />
          </div>

          <div>
            <h2>AURA</h2>
            <span>VALET PARKING</span>
          </div>
        </div>

        <div className="customer-auth-card">
          <div className="customer-auth-heading">
            <span className="customer-auth-kicker">
              Customer access
            </span>

            <h1>Welcome back</h1>

            <p>
              Sign in to manage your vehicles and parking sessions.
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="customer-input-group">
              <label htmlFor="customer-email">
                Email address
              </label>

              <input
                id="customer-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="customer-input-group">
              <label htmlFor="customer-password">
                Password
              </label>

              <div className="customer-password-wrapper">
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
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="customer-auth-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="customer-primary-button"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Login"}
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
              Create an account
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

export default CustomerLogin;
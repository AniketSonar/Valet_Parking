import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

/**
 * /customer-mobile/:phone
 *
 * Auto-login page for customers arriving from a WhatsApp link.
 * Uses phone number as the sole credential (no password needed).
 */
function CustomerMobileLogin() {
  const { phone } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!phone) {
      setError("No phone number provided.");
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/auth/customer-phone-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phone.trim() }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.message || "Login failed.");
          return;
        }

        localStorage.setItem("access_token", data.session.access_token);
        localStorage.setItem("refresh_token", data.session.refresh_token);
        localStorage.setItem("user", JSON.stringify(data.user));

        navigate("/customer-dashboard", { replace: true });
      } catch {
        setError("Unable to connect to the server.");
      }
    })();
  }, [phone, navigate]);

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a0a0e",
          color: "#fff",
          fontFamily: "inherit",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <h2 style={{ color: "#c9a94e", marginBottom: 12 }}>Access Error</h2>
          <p style={{ color: "#ccc" }}>{error}</p>
          <button
            onClick={() => navigate("/customer-login")}
            style={{
              marginTop: 20,
              padding: "10px 28px",
              background: "#c9a94e",
              color: "#1a0a0e",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a0a0e",
        color: "#c9a94e",
        fontFamily: "inherit",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          className="spinner"
          style={{
            width: 40,
            height: 40,
            border: "4px solid rgba(201,169,78,0.2)",
            borderTopColor: "#c9a94e",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <p>Signing you in…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default CustomerMobileLogin;

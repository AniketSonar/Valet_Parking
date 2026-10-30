import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Hero from "./components/Hero";
import LoginCard from "./components/LoginCard";

import Dashboard from "./components/admin_dashboard/Dashboard";
import ParkingAdminDashboard from "./components/parkingAdmin/ParkingAdminDashboard";

// import ValetDashboard from "./components/valet/ValetDashboard";
import ValetLayout from "./components/valet/ValetLayout";
import CustomerLayout from "./components/customer/CustomerLayout";
import CustomerLogin from "./components/customer/CustomerLogin";
import CustomerRegister from "./components/customer/CustomerRegister";
import LandingPage from "./components/LandingPage";
import "./App.css";
import "./components/layout/css/card-design-system.css";

function LoginPage() {
  return (
    <main className="app-shell">
      <section className="hero-section">
        <Hero />
      </section>

      <section className="login-section">
        <LoginCard />
      </section>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Marketing Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Staff Login (Direct Valet Site Access) */}
        <Route path="/login" element={<LoginPage />} />

        {/* Customer Authentication */}
        <Route
          path="/customer-login"
          element={<CustomerLogin />}
        />

        <Route
          path="/customer-register"
          element={<CustomerRegister />}
        />

        {/* Operational Dashboards */}
        <Route path="/admin-dashboard" element={<Dashboard />} />
        <Route path="/parking-admin-dashboard" element={<ParkingAdminDashboard />} />
        <Route
          path="/valet-dashboard"
          element={<ValetLayout />}
        />
        <Route
          path="/customer-dashboard"
          element={<CustomerLayout />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
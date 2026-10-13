import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Hero from "./components/Hero";
import LoginCard from "./components/LoginCard";
import ThemeToggle from "./components/ThemeToggle";

import Dashboard from "./components/admin_dashboard/Dashboard";
import ParkingAdminDashboard from "./components/parkingAdmin/ParkingAdminDashboard";
import ReceptionDashboard from "./components/reception/ReceptionDashboard";

// import ValetDashboard from "./components/valet/ValetDashboard";
import ValetLayout from "./components/valet/ValetLayout";
import CustomerLayout from "./components/customer/CustomerLayout";
import CustomerLogin from "./components/customer/CustomerLogin";
import CustomerRegister from "./components/customer/CustomerRegister";
import { ThemeProvider } from "./ThemeContext";
import "./App.css";

function LoginPage() {
  return (
    <main className="app-shell">
      <section className="hero-section">
        {/* <div className="theme-switcher-inline">
          <ThemeToggle />
        </div> */}
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
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin-dashboard" element={<Dashboard />} />
          {/* Public */}
          <Route path="/" element={<LoginPage />} />

          {/* Customer Authentication */}
          <Route
            path="/customer-login"
            element={<CustomerLogin />}
          />

          <Route
            path="/customer-register"
            element={<CustomerRegister />}
          />
          <Route path="/parking-admin-dashboard" element={<ParkingAdminDashboard />} />
          <Route path="/reception-dashboard" element={<ReceptionDashboard />} />
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
    </ThemeProvider>
  );
}

export default App;
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import DashboardLayout from "../layout/DashboardLayout";
import { customerConfig } from "../layout/dashboardConfigs";
import CustomerDashboard from "./CustomerDashboard";
import MyVehicles from "./MyVehicles";
import ParkingHistory from "./ParkingHistory";
import CustomerProfile from "./CustomerProfile";
import CustomerFeedback from "./CustomerFeedback";
import CustomerPayments from "./CustomerPayments";

import "./css/CustomerPortal.css";

function CustomerLayout() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("dashboard");

  const [authUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("user") || "null"
      );
    } catch {
      return null;
    }
  });

  const [customer, setCustomer] = useState(authUser);

  const hasCustomerAccess = Boolean(
    localStorage.getItem("access_token") &&
      authUser?.role === "customer"
  );

  if (!hasCustomerAccess) {
    return <Navigate to="/" replace />;
  }

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    navigate("/", { replace: true });
  };

  const renderPage = () => {
    if (activeTab === "vehicles") {
      return <MyVehicles />;
    }

    if (activeTab === "history") {
      return <ParkingHistory />;
    }

    if (activeTab === "payments") {
      return <CustomerPayments />;
    }

    if (activeTab === "feedback") {
      return <CustomerFeedback />;
    }

    if (activeTab === "profile") {
      return <CustomerProfile />;
    }

    return (
      <CustomerDashboard
        onNavigate={setActiveTab}
        onCustomerLoaded={setCustomer}
      />
    );
  };

  return (
    <DashboardLayout
      config={customerConfig}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={logout}
      user={customer}
    >
      {renderPage()}
    </DashboardLayout>
  );
}

export default CustomerLayout;
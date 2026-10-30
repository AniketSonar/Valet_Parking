import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../layout/DashboardLayout";
import { valetConfig } from "../layout/dashboardConfigs";

import ValetDashboard from "./ValetDashboard";
import MyVehicles from "./MyVehicles";
import RetrievalRequests from "./RetrievalRequests";
import ParkingSlots from "./ParkingSlots";
import CompletedReturns from "./CompletedReturns";
import ValetProfile from "./ValetProfile";
import ReceptionDashboard from "../reception/ReceptionDashboard";

const ValetLayout = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] =
    useState("dashboard");

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    navigate("/", {
      replace: true,
    });
  };

  const renderPage = () => {
    switch (activeTab) {
      case "security-dashboard":
      case "security-payments": {
        const securityTab = activeTab.replace("security-", "");
        return (
          <ReceptionDashboard
            embedded
            embeddedTab={securityTab}
          />
        );
      }

      case "my-vehicles":
        return <MyVehicles />;

      case "retrieval-requests":
        return <RetrievalRequests />;

      case "parking-slots":
        return <ParkingSlots />;

      case "completed-returns":
        return <CompletedReturns />;

      case "profile":
        return <ValetProfile />;

      case "dashboard":
      default:
        return <ValetDashboard />;
    }
  };

  return (
    <DashboardLayout
      config={valetConfig}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={handleLogout}
    >
      {renderPage()}
    </DashboardLayout>
  );
};

export default ValetLayout;
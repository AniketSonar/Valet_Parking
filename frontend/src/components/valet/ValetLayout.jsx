import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import ValetSidebar from "./ValetSidebar";
import ValetTopbar from "./ValetTopbar";

import ValetDashboard from "./ValetDashboard";
import MyVehicles from "./MyVehicles";
import RetrievalRequests from "./RetrievalRequests";
import ParkingSlots from "./ParkingSlots";
import CompletedReturns from "./CompletedReturns";
import ValetProfile from "./ValetProfile";

import "./css/ValetLayout.css";

const ValetLayout = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] =
    useState("dashboard");

  const [collapsed, setCollapsed] =
    useState(false);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    navigate("/", {
      replace: true,
    });
  };

  const handleProfile = () => {
    setActiveTab("profile");
  };

  const renderPage = () => {
    switch (activeTab) {
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
    <div className="valet-layout">
      <ValetSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <main
        className={`valet-main ${
          collapsed ? "sidebar-collapsed" : ""
        }`}
      >
        <ValetTopbar
          onProfile={handleProfile}
          onNotifications={() =>
            setActiveTab("retrieval-requests")
          }
        />

        <div className="valet-page-content">
          {renderPage()}
        </div>
      </main>
    </div>
  );
};

export default ValetLayout;
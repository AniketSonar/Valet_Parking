import React from "react";
import "./css/ReceptionDashboard.css";

const ReceptionStatCard = ({ icon, label, value, sub, accent }) => {
  const accentMap = {
    purple: { bg: "#f4eef8", color: "#5e3573" },
    green:  { bg: "#ecfdf5", color: "#047857" },
    amber:  { bg: "#fffbeb", color: "#b45309" },
    blue:   { bg: "#eff6ff", color: "#1d4ed8" },
  };
  const style = accentMap[accent] || accentMap.purple;

  return (
    <div className="reception-stat-card">
      <div className="reception-stat-icon" style={{ background: style.bg, color: style.color }}>
        {icon}
      </div>
      <div className="reception-stat-body">
        <span className="reception-stat-label">{label}</span>
        <strong className="reception-stat-value">{value ?? "--"}</strong>
        {sub && <small className="reception-stat-sub">{sub}</small>}
      </div>
    </div>
  );
};

export default ReceptionStatCard;

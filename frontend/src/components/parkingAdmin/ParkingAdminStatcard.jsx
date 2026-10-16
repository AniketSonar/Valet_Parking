import React from "react";
import "./css/ParkingAdminStatcard.css";

const ParkingAdminStatcard = ({
  label,
  value,
  subtext,
  icon: Icon,
  theme = "purple",
}) => {
  return (
    <div className={`aura-card theme-${theme}`}>
      <div className="card-top-row">
        <div className="card-icon-box">
          {Icon && <Icon size={20} strokeWidth={2} />}
        </div>

      </div>

      <div className="card-body">
        <span className="card-label">{label}</span>

        <h2 className="card-value">{value}</h2>

        <span className="card-subtext">{subtext}</span>
      </div>

      <div className="card-corner-shape"></div>
    </div>
  );
};

export default ParkingAdminStatcard;
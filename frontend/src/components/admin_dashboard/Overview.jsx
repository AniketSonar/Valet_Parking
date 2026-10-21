import React from "react";
import "./Overview.css";

import { SquareParking,
  
 } from "lucide-react";
function Overview({ stats = {}, loading = false }) {
  const formattedRevenue = Number(stats.todayRevenue || 0).toLocaleString("en-IN");

  return (
    <div className="system-content">
      <div className="system-status">
        <SquareParking className="status-indicator" />
        <div>
          <strong>System Operational</strong>
          <span>All core services and database connections are running normally</span>
        </div>
      </div>

      <div className="system-metrics">
        <div className="system-metric">
          <span>Active Sessions</span>
          <strong>{loading ? "--" : stats.activeParkingSessions ?? 0}</strong>
        </div>

        <div className="system-metric">
          <span>Total Staff</span>
          <strong>{loading ? "--" : stats.totalStaff ?? 0}</strong>
        </div>

        <div className="system-metric">
          <span>Today's Revenue</span>
          <strong>{loading ? "₹ --" : `₹ ${formattedRevenue}`}</strong>
        </div>
      </div>
    </div>
  );
}

export default Overview;


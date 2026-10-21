import React, {
  useEffect,
  useState,
} from "react";

import {
  RefreshCw,
  History,
} from "lucide-react";

import { getValetDashboard } from "../../api/parkingApi";

// import "./css/CompletedReturns.css";
import "./css/ValetPages.css";

const CompletedReturns = () => {
  const [returns, setReturns] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadReturns = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await getValetDashboard();

      setReturns(
        response?.completed_returns || []
      );
    } catch (err) {
      setError(
        err?.message ||
          "Unable to load completed returns."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  return (
    <section className="completed-page">
      <div className="completed-header">
        <div>
          <span className="page-eyebrow">
            HISTORY
          </span>

          <h1>Completed Returns</h1>

          <p>
            Vehicle returns completed by you.
          </p>
        </div>

        <button
          className="page-refresh-btn"
          onClick={loadReturns}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="page-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="page-loading">
          Loading completed returns...
        </div>
      ) : returns.length === 0 ? (
        <div className="page-empty">
          <History size={32} />

          <h3>
            No completed returns
          </h3>

          <p>
            Completed vehicle returns will
            appear here.
          </p>
        </div>
      ) : (
        <div className="completed-table-card">
          <div className="completed-table">
            <div className="completed-table-head">
              <span>Vehicle</span>
              <span>Customer</span>
              <span>Ticket</span>
              <span>Slot</span>
              <span>Completed</span>
            </div>

            {returns.map((session) => {
              const vehicle =
                session.vehicle || {};

              const customer =
                vehicle.customer || {};

              return (
                <div
                  className="completed-table-row"
                  key={session.id}
                >
                  <div>
                    <strong>
                      {vehicle.license_plate ||
                        "—"}
                    </strong>

                    <small>
                      {vehicle.make || ""}{" "}
                      {vehicle.model || ""}
                    </small>
                  </div>

                  <span>
                    {customer.name || "—"}
                  </span>

                  <span>
                    {session.ticket_code || "—"}
                  </span>

                  <span>
                    {session.parking_slot || "—"}
                  </span>

                  <span>
                    {session.completed_at
                      ? new Date(
                          session.completed_at
                        ).toLocaleString()
                      : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default CompletedReturns;
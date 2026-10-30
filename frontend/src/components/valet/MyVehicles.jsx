import React, { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, CarFront, MessageCircle } from "lucide-react";
import { openWhatsAppDraft } from "../../utils/whatsappDraft";

import { getValetDashboard } from "../../api/parkingApi";

// import "./css/MyVehicles.css";
import "./css/ValetPages.css";
const statusLabel = (status) => {
  const labels = {
    checked_in: "Checked In",
    parked: "Parked",
    retrieval_requested: "Retrieval Requested",
    retrieving: "Retrieving",
    ready_for_pickup: "Ready for Pickup",
  };

  return labels[status] || status;
};

const MyVehicles = () => {
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadVehicles = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getValetDashboard();

      setSessions(response?.sessions || []);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to load assigned vehicles."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const filteredSessions = useMemo(() => {
    const term = search
      .trim()
      .toLowerCase();

    if (!term) return sessions;

    return sessions.filter((session) => {
      const vehicle =
        session.vehicle || {};

      const customer =
        vehicle.customer || {};

      return [
        vehicle.license_plate,
        vehicle.make,
        vehicle.model,
        session.ticket_code,
        session.parking_slot,
        customer.name,
        customer.phone,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(term)
        );
    });
  }, [sessions, search]);

  return (
    <section className="my-vehicles-page">
      <div className="my-vehicles-header">
        <div>
          <span className="page-eyebrow">
            VALET WORKSPACE
          </span>

          <h1>My Vehicles</h1>

          <p>
            Vehicles currently assigned to you.
          </p>
        </div>

        <button
          className="page-refresh-btn"
          onClick={loadVehicles}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="vehicle-search">
        <Search size={17} />

        <input
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search vehicle, customer or ticket..."
        />
      </div>

      {error && (
        <div className="page-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="page-loading">
          Loading assigned vehicles...
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="page-empty">
          <CarFront size={32} />

          <h3>
            No vehicles currently assigned
          </h3>

          <p>
            Assigned vehicles will appear here.
          </p>
        </div>
      ) : (
        <div className="vehicle-table-card">
          <div className="vehicle-table">
            <div className="vehicle-table-head">
              <span>Vehicle</span>
              <span>Customer</span>
              <span>Slot</span>
              <span>Status</span>
              <span>Ticket</span>
              <span>Notify</span>
            </div>

            {filteredSessions.map((session) => {
              const vehicle =
                session.vehicle || {};

              const customer =
                vehicle.customer || {};

              return (
                <div
                  className="vehicle-table-row"
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

                  <div>
                    {customer.name || "—"}
                  </div>

                  <div>
                    {session.parking_slot ||
                      "—"}
                  </div>

                  <div>
                    <span
                      className={`status-badge status-${session.status}`}
                    >
                      {statusLabel(
                        session.status
                      )}
                    </span>
                  </div>

                  <div>
                    {session.ticket_code || "—"}
                  </div>

                  <div>
                    <button
                      type="button"
                      className="whatsapp-draft-btn"
                      disabled={session.status !== "parked" && session.status !== "ready_for_pickup"}
                      title="Open a WhatsApp message draft for the customer"
                      onClick={() => openWhatsAppDraft(session)}
                    >
                      <MessageCircle size={14} />
                      WhatsApp
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default MyVehicles;
import { useEffect, useState } from "react";
import {
  RefreshCw,
  BellRing,
  Play,
} from "lucide-react";

import {
  getValetDashboard,
  startRetrieval,
} from "../../api/parkingApi";

// import "./css/RetrievalRequests.css";
import WhatsAppRetrieval from "./WhatsAppRetrieval";
import "./css/ValetPages.css";

const RetrievalRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] =
    useState(null);
  const [error, setError] = useState("");

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await getValetDashboard();

      setRequests(
        response?.retrieval_requests || []
      );
    } catch (err) {
      setError(
        err?.message ||
          "Unable to load retrieval requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleStartRetrieval = async (sessionId) => {
    try {
      setProcessing(sessionId);
      setError("");

      await startRetrieval(sessionId);

      await loadRequests();
    } catch (err) {
      setError(
        err?.message ||
          "Unable to start retrieval."
      );
    } finally {
      setProcessing(null);
    }
  };

  return (
    <section className="retrieval-page">
      <div className="retrieval-header">
        <div>
          <span className="page-eyebrow">
            VEHICLE RETURN
          </span>

          <h1>Retrieval Requests</h1>

          <p>
            Vehicles waiting to be retrieved.
          </p>
        </div>

        <button
          className="page-refresh-btn"
          onClick={loadRequests}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <WhatsAppRetrieval onRequested={loadRequests} />

      {error && (
        <div className="page-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="page-loading">
          Loading retrieval requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="page-empty">
          <BellRing size={32} />

          <h3>
            No pending retrieval requests
          </h3>

          <p>
            New customer retrieval requests will
            appear here.
          </p>
        </div>
      ) : (
        <div className="retrieval-grid">
          {requests.map((session) => {
            const vehicle =
              session.vehicle || {};

            const customer =
              vehicle.customer || {};

            return (
              <article
                className="retrieval-card"
                key={session.id}
              >
                <div className="retrieval-card-top">
                  <span className="request-badge">
                    Pending Retrieval
                  </span>

                  <span>
                    {session.ticket_code || "—"}
                  </span>
                </div>

                <h3>
                  {vehicle.license_plate ||
                    "Unknown Vehicle"}
                </h3>

                <p>
                  {vehicle.make || ""}{" "}
                  {vehicle.model || ""}
                </p>

                <div className="retrieval-details">
                  <div>
                    <span>Customer</span>
                    <strong>
                      {customer.name || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Phone</span>
                    <strong>
                      {customer.phone || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Parking Slot</span>
                    <strong>
                      {session.parking_slot ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Key</span>
                    <strong>
                      {(Array.isArray(session.key)
                        ? session.key[0]?.key_number
                        : session.key?.key_number) ||
                        "Not available"}
                    </strong>
                  </div>
                </div>

                <button
                  className="start-retrieval-btn"
                  disabled={
                    processing === session.id
                  }
                  onClick={() =>
                    handleStartRetrieval(session.id)
                  }
                >
                  <Play size={16} />

                  {processing === session.id
                    ? "Starting..."
                    : "Start Retrieval"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default RetrievalRequests;
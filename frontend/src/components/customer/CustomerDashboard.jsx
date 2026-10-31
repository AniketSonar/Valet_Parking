import { useCallback, useEffect, useState } from "react";
import {
  CarFront,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  RefreshCw,
  UserRound,
  MessageCircle,
  X,
} from "lucide-react";
import {
  cancelVehicleRetrieval,
  getCustomerDashboard,
  requestVehicleRetrieval,
} from "../../api/customerApi";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";
import { openRetrievalRequestOnWhatsApp } from "../../utils/whatsappDraft";
import "./css/CustomerPortal.css";

const labels = {
  checked_in: "Checked In",
  parked: "Vehicle Parked",
  retrieval_requested: "Retrieval Requested",
  retrieving: "Vehicle Being Retrieved",
  ready_for_pickup: "Ready for Pickup",
};

const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "Unavailable";

function CustomerDashboard({ onNavigate, onCustomerLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(
    async (initial = false) => {
      try {
        if (initial) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError("");

        const response = await getCustomerDashboard();

        setData(response);
        onCustomerLoaded?.(response?.customer || null);
      } catch {
        setError("Unable to load your parking information.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [onCustomerLoaded]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  useRealtimeSync({
    tables: ["parking_sessions", "parking_bookings", "retrieval_requests"],
    onUpdate: () => {
      load(false);
    },
    interval: 3500,
  });

  const runRetrievalAction = async (session, type) => {
    try {
      setAction(type);
      setError("");

      const response =
        type === "request"
          ? await requestVehicleRetrieval(session.id)
          : await cancelVehicleRetrieval(session.id);

      setSuccess(response?.message || "Parking status updated.");

      await load();
    } catch {
      setError(
        "We could not update this retrieval request. Please try again."
      );
    } finally {
      setAction("");
    }
  };

  if (loading) {
    return (
      <main className="customer-page customer-state">
        <div className="customer-state-icon">
          <RefreshCw className="customer-spin" size={25} />
        </div>
        <h3>Loading your parking information</h3>
        <p>Please wait while we retrieve your latest session.</p>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="customer-page customer-state">
        <div className="customer-state-icon customer-state-icon-error">
          <X size={25} />
        </div>

        <h3>Unable to load your session</h3>
        <p>{error}</p>

        <button
          type="button"
          className="customer-action-button primary"
          onClick={() => load(true)}
        >
          Try Again
        </button>
      </main>
    );
  }

  const session = data?.current_session;
  const customer = data?.customer;
  const vehicle = session?.vehicle;

  const vehicleDetails =
    [vehicle?.make, vehicle?.model, vehicle?.color]
      .filter(Boolean)
      .join(" · ") || "Vehicle details unavailable";

  const statusLabel =
    labels[session?.status] || session?.status || "Status unavailable";

  return (
    <main className="customer-page">
      {/* PAGE HEADER */}
      <header className="customer-page-header">
        <div className="customer-page-heading">
          <span className="customer-eyebrow">CUSTOMER PORTAL</span>

          <h1>
            Welcome, <span>{customer?.name || "Customer"}</span>
          </h1>

          <p>
            Keep track of your vehicles and parking sessions.
          </p>
        </div>

        <button
          type="button"
          className="customer-action-button secondary customer-refresh-button"
          onClick={() => load()}
          disabled={refreshing}
        >
          <RefreshCw
            size={15}
            className={refreshing ? "customer-spin" : ""}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {/* ALERTS */}
      {error && (
        <div className="customer-alert error">
          <span>{error}</span>

          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="customer-alert success">
          <CheckCircle2 size={17} />

          <span>{success}</span>

          <button
            type="button"
            aria-label="Dismiss success message"
            onClick={() => setSuccess("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* CURRENT SESSION */}
      <section className="customer-session-section">
        <div className="customer-section-heading">
          <div>
            <span className="customer-section-kicker">
              ACTIVE SESSION
            </span>

            <h2>Current Parking Session</h2>

            <p>Your latest active vehicle session.</p>
          </div>
        </div>

        {!session ? (
          <section className="customer-empty-state">
            <div className="customer-empty-icon">
              <CarFront size={28} />
            </div>

            <span className="customer-empty-kicker">
              NO ACTIVE SESSION
            </span>

            <h3>No Active Parking Session</h3>

            <p>
              Your vehicle is not currently parked with us.
            </p>

            <button
              type="button"
              className="customer-action-button primary"
              onClick={() => onNavigate("vehicles")}
            >
              View My Vehicles
            </button>
          </section>
        ) : (
          <section className="customer-session-card">
            {/* SESSION TOP */}
            <div className="customer-session-top">
              <div className="customer-session-vehicle">
                <div className="customer-vehicle-mark">
                  <CarFront size={23} strokeWidth={2} />
                </div>

                <div className="customer-session-vehicle-copy">
                  <span className="customer-ticket">
                    {session.ticket_code || "Ticket unavailable"}
                  </span>

                  <h3>
                    {vehicle?.license_plate ||
                      "Vehicle plate unavailable"}
                  </h3>

                  <p>{vehicleDetails}</p>
                </div>
              </div>

              <span
                className={`customer-status status-${session.status}`}
              >
                <span className="customer-status-dot" />
                {statusLabel}
              </span>
            </div>

            {/* SESSION DETAILS */}
            <div className="customer-detail-grid">
              <div className="customer-detail-item">
                <div className="customer-detail-icon">
                  <MapPin size={16} />
                </div>

                <span>
                  <small>Parking Slot</small>
                  <strong>
                    {session.parking_slot || "Not assigned"}
                  </strong>
                </span>
              </div>

              <div className="customer-detail-item">
                <div className="customer-detail-icon">
                  <Clock3 size={16} />
                </div>

                <span>
                  <small>Check-in Time</small>
                  <strong>
                    {dateTime(session.checked_in_at)}
                  </strong>
                </span>
              </div>

              <div className="customer-detail-item">
                <div className="customer-detail-icon">
                  <CarFront size={16} />
                </div>

                <span>
                  <small>Parking Type</small>
                  <strong>
                    {session.parking_type || "Unavailable"}
                  </strong>
                </span>
              </div>

              <div className="customer-detail-item">
                <div className="customer-detail-icon">
                  <UserRound size={16} />
                </div>

                <span>
                  <small>Assigned Valet</small>
                  <strong>
                    {session.valet?.name || "Not assigned"}
                  </strong>
                </span>
              </div>
            </div>

            {/* VALET CONTACT */}
            {session.valet?.phone && (
              <div className="customer-valet-contact">
                <div className="customer-valet-contact-icon">
                  <Phone size={15} />
                </div>

                <div>
                  <small>Assigned Valet Contact</small>

                  <span>
                    {session.valet?.name || "Assigned Valet"}
                    <span className="customer-contact-separator">
                      ·
                    </span>
                    {session.valet.phone}
                  </span>
                </div>

                <a
                  className="customer-call-button"
                  href={`tel:${session.valet.phone}`}
                >
                  <Phone size={14} />
                  Contact
                </a>
              </div>
            )}

            {/* ACTION AREA */}
            <div
              className={`customer-session-action status-action-${session.status}`}
            >
              {session.status === "checked_in" && (
                <>
                  <div className="customer-action-state">
                    <div className="customer-action-state-icon neutral">
                      <Clock3 size={17} />
                    </div>

                    <div>
                      <strong>Parking assignment in progress</strong>
                      <span>
                        Your vehicle is checked in and awaiting
                        parking assignment.
                      </span>
                    </div>
                  </div>
                </>
              )}

              {session.status === "parked" && (
                <>
                  <div className="customer-action-state">
                    <div className="customer-action-state-icon">
                      <CarFront size={17} />
                    </div>

                    <div>
                      <strong>Your vehicle is securely parked</strong>
                      <span>
                        Request your vehicle whenever you are ready
                        for pickup.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="customer-action-button primary"
                    onClick={() =>
                      runRetrievalAction(session, "request")
                    }
                    disabled={Boolean(action)}
                  >
                    {action === "request"
                      ? "Requesting..."
                      : "Request Vehicle Retrieval"}
                  </button>

                  <button
                    type="button"
                    className="customer-action-button"
                    onClick={() => openRetrievalRequestOnWhatsApp(session)}
                  >
                    <MessageCircle size={16} />
                    Request on WhatsApp
                  </button>
                </>
              )}

              {session.status === "retrieval_requested" && (
                <>
                  <div className="customer-action-state">
                    <div className="customer-action-state-icon warning">
                      <Clock3 size={17} />
                    </div>

                    <div>
                      <strong>Retrieval request received</strong>
                      <span>
                        Your request has been sent to the valet.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="customer-action-button secondary"
                    onClick={() =>
                      runRetrievalAction(session, "cancel")
                    }
                    disabled={Boolean(action)}
                  >
                    {action === "cancel"
                      ? "Cancelling..."
                      : "Cancel Retrieval"}
                  </button>
                </>
              )}

              {session.status === "retrieving" && (
                <div className="customer-action-state">
                  <div className="customer-action-state-icon blue">
                    <RefreshCw
                      size={17}
                      className="customer-spin"
                    />
                  </div>

                  <div>
                    <strong>Your vehicle is being retrieved</strong>
                    <span>
                      Your valet is currently bringing your vehicle
                      to the pickup area.
                    </span>
                  </div>
                </div>
              )}

              {session.status === "ready_for_pickup" && (
                <div className="customer-action-state ready">
                  <div className="customer-action-state-icon success">
                    <CheckCircle2 size={17} />
                  </div>

                  <div>
                    <strong>Your vehicle is ready for pickup</strong>
                    <span>
                      Please proceed to the pickup area.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default CustomerDashboard;


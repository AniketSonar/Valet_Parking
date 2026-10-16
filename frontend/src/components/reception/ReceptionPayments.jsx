import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  IndianRupee,
  Loader2,
  Search,
  WalletCards,
} from "lucide-react";

import {
  createPayment,
  downloadInvoice,
  getReceptionSessions,
} from "../../api/receptionApi";

import "./css/ReceptionPayments.css";

const formatCurrency = (value) => {
  const amount = Number(value) || 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getCustomerName = (session) => {
  return (
    session?.customer?.name ||
    session?.customer_name ||
    session?.customer?.full_name ||
    "Customer"
  );
};

const getVehicleNumber = (session) => {
  return (
    session?.vehicle?.registration_number ||
    session?.vehicle?.vehicle_number ||
    session?.vehicle_number ||
    session?.vehicle?.plate_number ||
    "—"
  );
};

const getCustomerPhone = (session) => {
  return (
    session?.customer?.phone ||
    session?.customer?.phone_number ||
    session?.phone ||
    "—"
  );
};

const PaymentForm = ({ session, onBack, onSuccess }) => {
  const [parkingCharge, setParkingCharge] = useState("");
  const [valetServiceCharge, setValetServiceCharge] = useState("");
  const [extraCharges, setExtraCharges] = useState("");
  const [discount, setDiscount] = useState("");
  const [gst, setGst] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const subtotal = useMemo(() => {
    return (
      (Number(parkingCharge) || 0) +
      (Number(valetServiceCharge) || 0) +
      (Number(extraCharges) || 0)
    );
  }, [parkingCharge, valetServiceCharge, extraCharges]);

  const total = useMemo(() => {
    return Math.max(
      0,
      subtotal -
      (Number(discount) || 0) +
      (Number(gst) || 0)
    );
  }, [subtotal, discount, gst]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!session?.id) {
      setError("Parking session information is missing.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await createPayment({
        parking_session_id: session.id,
        parking_charge: Number(parkingCharge) || 0,
        valet_service_charge: Number(valetServiceCharge) || 0,
        extra_charges: Number(extraCharges) || 0,
        discount: Number(discount) || 0,
        gst: Number(gst) || 0,
        payment_method: paymentMethod,
      });

      if (!response?.data?.payment?.id) {
        throw new Error(
          "Payment was created, but the payment ID was not returned."
        );
      }

      onSuccess({
        ...response,
        session,
      });
    } catch (err) {
      setError(
        err?.message ||
        "Unable to process the payment. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reception-payments-form-page">
      <button
        type="button"
        className="reception-payments-back-button"
        onClick={onBack}
        disabled={submitting}
      >
        <ArrowLeft size={18} />
        Back to payments
      </button>

      <div className="reception-payments-form-header">
        <div>
          <p className="reception-payments-eyebrow">
            Process payment
          </p>

          <h2>Complete customer payment</h2>

          <p>
            Review the parking charges and generate the invoice.
          </p>
        </div>

        <div className="reception-payment-session-badge">
          <FileText size={17} />
          <span>{session.ticket_code || "No ticket"}</span>
        </div>
      </div>

      <div className="reception-payment-form-grid">
        <div className="reception-payment-form-card">
          <div className="reception-payment-card-title">
            <div className="reception-payment-card-icon">
              <WalletCards size={20} />
            </div>

            <div>
              <h3>Payment details</h3>
              <p>Enter the applicable charges.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="reception-payment-fields">
              <div className="reception-payment-field">
                <label htmlFor="parkingCharge">
                  Parking charge
                </label>

                <div className="reception-payment-input-wrapper">
                  <IndianRupee size={16} />
                  <input
                    id="parkingCharge"
                    type="number"
                    min="0"
                    step="0.01"
                    value={parkingCharge}
                    onChange={(event) =>
                      setParkingCharge(event.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="reception-payment-field">
                <label htmlFor="valetServiceCharge">
                  Valet service charge
                </label>

                <div className="reception-payment-input-wrapper">
                  <IndianRupee size={16} />
                  <input
                    id="valetServiceCharge"
                    type="number"
                    min="0"
                    step="0.01"
                    value={valetServiceCharge}
                    onChange={(event) =>
                      setValetServiceCharge(event.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="reception-payment-field">
                <label htmlFor="extraCharges">
                  Extra charges
                </label>

                <div className="reception-payment-input-wrapper">
                  <IndianRupee size={16} />
                  <input
                    id="extraCharges"
                    type="number"
                    min="0"
                    step="0.01"
                    value={extraCharges}
                    onChange={(event) =>
                      setExtraCharges(event.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="reception-payment-field">
                <label htmlFor="discount">
                  Discount
                </label>

                <div className="reception-payment-input-wrapper">
                  <IndianRupee size={16} />
                  <input
                    id="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(event) =>
                      setDiscount(event.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="reception-payment-field">
                <label htmlFor="gst">GST</label>

                <div className="reception-payment-input-wrapper">
                  <IndianRupee size={16} />
                  <input
                    id="gst"
                    type="number"
                    min="0"
                    step="0.01"
                    value={gst}
                    onChange={(event) =>
                      setGst(event.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="reception-payment-method-section">
              <label>Payment method</label>

              <div className="reception-payment-method-options">
                <button
                  type="button"
                  className={`reception-payment-method ${paymentMethod === "cash" ? "active" : ""
                    }`}
                  onClick={() => setPaymentMethod("cash")}
                  disabled={submitting}
                >
                  <WalletCards size={19} />

                  <span>
                    <strong>Cash</strong>
                    <small>Customer pays at reception</small>
                  </span>
                </button>

                <button
                  type="button"
                  className={`reception-payment-method ${paymentMethod === "online" ? "active" : ""
                    }`}
                  onClick={() => setPaymentMethod("online")}
                  disabled={submitting}
                >
                  <CreditCard size={19} />

                  <span>
                    <strong>Online</strong>
                    <small>Digital payment</small>
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div className="reception-payment-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="reception-payment-submit-button"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2
                    size={18}
                    className="reception-payment-spinner"
                  />
                  Processing payment...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Process payment
                </>
              )}
            </button>
          </form>
        </div>

        <div className="reception-payment-summary-column">
          <div className="reception-payment-customer-card">
            <div className="reception-payment-card-title">
              <div className="reception-payment-card-icon">
                <FileText size={20} />
              </div>

              <div>
                <h3>Session details</h3>
                <p>Vehicle ready for customer handover</p>
              </div>
            </div>

            <div className="reception-payment-session-details">
              <div>
                <span>Ticket code</span>
                <strong>
                  {session.ticket_code || "—"}
                </strong>
              </div>

              <div>
                <span>Customer</span>
                <strong>{getCustomerName(session)}</strong>
              </div>

              <div>
                <span>Phone</span>
                <strong>{getCustomerPhone(session)}</strong>
              </div>

              <div>
                <span>Vehicle</span>
                <strong>{getVehicleNumber(session)}</strong>
              </div>

              <div>
                <span>Parking type</span>
                <strong>
                  {session.parking_type || "—"}
                </strong>
              </div>

              <div>
                <span>Completed</span>
                <strong>
                  {formatDateTime(session.completed_at)}
                </strong>
              </div>
            </div>
          </div>

          <div className="reception-payment-summary-card">
            <div className="reception-payment-summary-header">
              <h3>Payment summary</h3>
            </div>

            <div className="reception-payment-summary-row">
              <span>Parking</span>
              <strong>
                {formatCurrency(parkingCharge)}
              </strong>
            </div>

            <div className="reception-payment-summary-row">
              <span>Valet service</span>
              <strong>
                {formatCurrency(valetServiceCharge)}
              </strong>
            </div>

            <div className="reception-payment-summary-row">
              <span>Extra charges</span>
              <strong>
                {formatCurrency(extraCharges)}
              </strong>
            </div>

            <div className="reception-payment-summary-divider" />

            <div className="reception-payment-summary-row">
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>

            <div className="reception-payment-summary-row discount">
              <span>Discount</span>
              <strong>
                - {formatCurrency(discount)}
              </strong>
            </div>

            <div className="reception-payment-summary-row">
              <span>GST</span>
              <strong>{formatCurrency(gst)}</strong>
            </div>

            <div className="reception-payment-total">
              <span>Total amount</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentSuccess = ({
  paymentResult,
  onBack,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const payment = paymentResult?.data?.payment;
  const session = paymentResult?.session;

  const handleDownloadInvoice = async () => {
    if (!payment?.id) {
      setDownloadError("Invoice information is unavailable.");
      return;
    }

    try {
      setDownloading(true);
      setDownloadError("");

      await downloadInvoice(payment.id);
    } catch (err) {
      setDownloadError(
        err?.message || "Unable to download the invoice."
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="reception-payment-success-page">
      <div className="reception-payment-success-card">
        <div className="reception-payment-success-icon">
          <CheckCircle2 size={34} />
        </div>

        <p className="reception-payments-eyebrow">
          Payment completed
        </p>

        <h2>Payment successful</h2>

        <p className="reception-payment-success-description">
          The payment has been recorded successfully and the
          invoice has been generated.
        </p>

        <div className="reception-payment-success-details">
          <div>
            <span>Invoice number</span>
            <strong>
              {payment?.invoice_number || "—"}
            </strong>
          </div>

          <div>
            <span>Ticket code</span>
            <strong>
              {session?.ticket_code ||
                paymentResult?.data?.ticket_code ||
                "—"}
            </strong>
          </div>

          <div>
            <span>Payment method</span>
            <strong>
              {payment?.payment_method === "online"
                ? "Online"
                : "Cash"}
            </strong>
          </div>

          <div>
            <span>Amount paid</span>
            <strong>
              {formatCurrency(payment?.total_amount)}
            </strong>
          </div>

          <div>
            <span>Payment status</span>
            <strong className="paid-status">
              Paid
            </strong>
          </div>

          <div>
            <span>Invoice email</span>
            <strong>
              {paymentResult?.data?.email_sent
                ? "Sent to customer"
                : "Not sent"}
            </strong>
          </div>
        </div>

        {downloadError && (
          <div className="reception-payment-error">
            {downloadError}
          </div>
        )}

        <div className="reception-payment-success-actions">
          <button
            type="button"
            className="reception-payment-download-button"
            onClick={handleDownloadInvoice}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <Loader2
                  size={18}
                  className="reception-payment-spinner"
                />
                Downloading...
              </>
            ) : (
              <>
                <Download size={18} />
                Download invoice
              </>
            )}
          </button>

          <button
            type="button"
            className="reception-payment-secondary-button"
            onClick={onBack}
          >
            Back to payments
          </button>
        </div>
      </div>
    </div>
  );
};

const ReceptionPayments = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedSession, setSelectedSession] = useState(null);

  const [paymentResult, setPaymentResult] = useState(null);

  // Prevent a successfully paid session from appearing again
  // during the current page session.
  const [paidSessionIds, setPaidSessionIds] = useState(
    () => new Set()
  );

  const loadPayableSessions = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getReceptionSessions();

      const receivedSessions = Array.isArray(response)
        ? response
        : response?.sessions ||
        response?.data?.sessions ||
        response?.data ||
        [];

      const payableSessions = receivedSessions.filter(
        (session) => session?.status === "ready_for_pickup"
      );

      setSessions(payableSessions);
    } catch (err) {
      setError(
        err?.message ||
        "Unable to load completed parking sessions."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayableSessions();
  }, []);

  const filteredSessions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return sessions.filter((session) => {
      if (paidSessionIds.has(session.id)) {
        return false;
      }

      if (!query) return true;

      const ticketCode =
        session?.ticket_code?.toLowerCase() || "";

      const vehicleNumber =
        getVehicleNumber(session).toLowerCase();

      const customerName =
        getCustomerName(session).toLowerCase();

      const phone =
        getCustomerPhone(session).toLowerCase();

      return (
        ticketCode.includes(query) ||
        vehicleNumber.includes(query) ||
        customerName.includes(query) ||
        phone.includes(query)
      );
    });
  }, [sessions, searchTerm, paidSessionIds]);

  const handlePaymentSuccess = (result) => {
    const sessionId = result?.session?.id;

    if (sessionId) {
      setPaidSessionIds((previous) => {
        const updated = new Set(previous);
        updated.add(sessionId);
        return updated;
      });
    }

    setPaymentResult(result);
    setSelectedSession(null);
  };

  const handleBackToPayments = () => {
    setPaymentResult(null);
    setSelectedSession(null);
    setSearchTerm("");
  };

  if (paymentResult) {
    return (
      <PaymentSuccess
        paymentResult={paymentResult}
        onBack={handleBackToPayments}
      />
    );
  }

  if (selectedSession) {
    return (
      <PaymentForm
        session={selectedSession}
        onBack={() => setSelectedSession(null)}
        onSuccess={handlePaymentSuccess}
      />
    );
  }

  return (
    <div className="reception-payments-page">
      <div className="reception-payments-header">
        <div>
          <p className="reception-payments-eyebrow">
            Reception
          </p>

          <h1>Payments</h1>

          <p>
            Process payments and generate invoices for completed
            parking sessions.
          </p>
        </div>

        <div className="reception-payments-header-icon">
          <IndianRupee size={24} />
        </div>
      </div>

      <div className="reception-payments-toolbar">
        <div className="reception-payments-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search ticket, vehicle, customer or phone..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />
        </div>

        <div className="reception-payments-count">
          {filteredSessions.length}{" "}
          {filteredSessions.length === 1
            ? "session"
            : "sessions"}{" "}
          pending payment
        </div>
      </div>

      {error && (
        <div className="reception-payment-error reception-payment-page-error">
          <span>{error}</span>

          <button
            type="button"
            onClick={loadPayableSessions}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="reception-payments-loading">
          <Loader2
            size={28}
            className="reception-payment-spinner"
          />

          <span>Loading completed sessions...</span>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="reception-payments-empty">
          <div className="reception-payments-empty-icon">
            <CheckCircle2 size={28} />
          </div>

          <h3>No pending payments</h3>

          <p>
            There are currently no completed parking sessions
            waiting for payment.
          </p>
        </div>
      ) : (
        <div className="reception-payments-table-card">
          <div className="reception-payments-table-wrapper">
            <table className="reception-payments-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Vehicle</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Parking type</th>
                  <th>Completed</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredSessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <span className="reception-payment-ticket">
                        {session.ticket_code || "—"}
                      </span>
                    </td>

                    <td>
                      <span className="reception-payment-vehicle">
                        {getVehicleNumber(session)}
                      </span>
                    </td>

                    <td>
                      <span className="reception-payment-customer">
                        {getCustomerName(session)}
                      </span>
                    </td>

                    <td>
                      {getCustomerPhone(session)}
                    </td>

                    <td>
                      <span className="reception-payment-parking-type">
                        {session.parking_type || "—"}
                      </span>
                    </td>

                    <td>
                      {formatDateTime(
                        session.completed_at
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="reception-payment-process-button"
                        onClick={() =>
                          setSelectedSession(session)
                        }
                      >
                        <CreditCard size={16} />
                        Process payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionPayments;
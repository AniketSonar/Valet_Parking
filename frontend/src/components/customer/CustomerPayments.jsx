import { useEffect, useState } from "react";
import {
  CreditCard,
  Download,
  FileText,
  Loader2,
  Receipt,
  RefreshCw,
} from "lucide-react";

import {
  getCustomerPayments,
  downloadCustomerInvoice,
} from "../../api/customerApi";

import "./css/CustomerPayments.css";

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getVehicleName = (vehicle) => {
  if (!vehicle) return "Vehicle";

  const parts = [
    vehicle.make,
    vehicle.model,
  ].filter(Boolean);

  return parts.length
    ? parts.join(" ")
    : vehicle.license_plate || "Vehicle";
};

function CustomerPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getCustomerPayments();

      if (response?.success) {
        setPayments(response.payments || []);
      } else {
        setPayments([]);
        setError(
          response?.message || "Unable to load payment history."
        );
      }
    } catch (err) {
      console.error("Customer payments fetch error:", err);

      setPayments([]);
      setError(
        err?.message || "Unable to load payment history."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleDownloadInvoice = async (payment) => {
    try {
      setDownloadingId(payment.id);

      const response = await downloadCustomerInvoice(payment.id);

      let blob;

      if (response instanceof Blob) {
        blob = response;
      } else if (response?.data instanceof Blob) {
        blob = response.data;
      } else {
        throw new Error("Invalid invoice response.");
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `Invoice-${
        payment.invoice_number || payment.id
      }.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Invoice download error:", err);

      window.alert(
        err?.message || "Unable to download invoice."
      );
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <section className="customer-payments-page">
        <div className="customer-payments-header">
          <div>
            <h1>Payments</h1>
            <p>View your parking payments and invoices.</p>
          </div>
        </div>

        <div className="customer-payments-state">
          <Loader2
            size={24}
            className="customer-payments-spinner"
          />
          <span>Loading payment history...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="customer-payments-page">
      <div className="customer-payments-header">
        <div>
          <h1>Payments</h1>
          <p>
            View your parking payments and download invoices.
          </p>
        </div>

        <button
          type="button"
          className="customer-payments-refresh"
          onClick={fetchPayments}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="customer-payments-error">
          <div>
            <strong>Unable to load payments</strong>
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={fetchPayments}
          >
            Try again
          </button>
        </div>
      )}

      {!error && payments.length === 0 && (
        <div className="customer-payments-empty">
          <div className="customer-payments-empty-icon">
            <Receipt size={26} />
          </div>

          <h3>No payments yet</h3>

          <p>
            Your completed parking payments will appear here.
          </p>
        </div>
      )}

      {payments.length > 0 && (
        <div className="customer-payments-list">
          {payments.map((payment) => {
            const vehicle = payment.vehicle;
            const session = payment.parking_session;

            const isDownloading =
              downloadingId === payment.id;

            return (
              <article
                className="customer-payment-card"
                key={payment.id}
              >
                <div className="customer-payment-card-top">
                  <div className="customer-payment-icon">
                    <CreditCard size={20} />
                  </div>

                  <div className="customer-payment-main">
                    <div className="customer-payment-title-row">
                      <div>
                        <h3>
                          {getVehicleName(vehicle)}
                        </h3>

                        {vehicle?.license_plate && (
                          <span className="customer-payment-plate">
                            {vehicle.license_plate}
                          </span>
                        )}
                      </div>

                      <span
                        className={`customer-payment-status ${
                          payment.payment_status === "paid"
                            ? "paid"
                            : "pending"
                        }`}
                      >
                        {payment.payment_status || "Unknown"}
                      </span>
                    </div>

                    <div className="customer-payment-details">
                      <div>
                        <span>Invoice</span>
                        <strong>
                          {payment.invoice_number || "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Payment date</span>
                        <strong>
                          {formatDate(
                            payment.paid_at ||
                              payment.created_at
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Payment method</span>
                        <strong>
                          {payment.payment_method
                            ? payment.payment_method
                                .charAt(0)
                                .toUpperCase() +
                              payment.payment_method.slice(1)
                            : "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Parking ticket</span>
                        <strong>
                          {session?.ticket_code || "—"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="customer-payment-amount">
                    <span>Total paid</span>
                    <strong>
                      {formatCurrency(payment.total_amount)}
                    </strong>
                  </div>
                </div>

                <div className="customer-payment-card-bottom">
                  <div className="customer-payment-breakdown">
                    <span>
                      Parking:{" "}
                      {formatCurrency(
                        payment.parking_charge
                      )}
                    </span>

                    <span>
                      Valet:{" "}
                      {formatCurrency(
                        payment.valet_service_charge
                      )}
                    </span>

                    {Number(payment.extra_charges) > 0 && (
                      <span>
                        Extra:{" "}
                        {formatCurrency(
                          payment.extra_charges
                        )}
                      </span>
                    )}

                    {Number(payment.discount) > 0 && (
                      <span>
                        Discount: −
                        {formatCurrency(
                          payment.discount
                        )}
                      </span>
                    )}

                    {Number(payment.gst) > 0 && (
                      <span>
                        GST:{" "}
                        {formatCurrency(payment.gst)}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="customer-payment-invoice-btn"
                    onClick={() =>
                      handleDownloadInvoice(payment)
                    }
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2
                          size={16}
                          className="customer-payments-spinner"
                        />
                        Preparing...
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        Download Invoice
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default CustomerPayments;
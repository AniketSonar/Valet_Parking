// Manual WhatsApp draft (no API, no tokens).
// Builds a prefilled wa.me link; the valet reviews and presses Send in WhatsApp.

const DEFAULT_COUNTRY_CODE = "91";

export const getAppBaseUrl = () => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return import.meta.env?.VITE_APP_URL || "http://localhost:5173";
};

export const normalizePhone = (raw) => {
  let digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10) digits = DEFAULT_COUNTRY_CODE + digits;
  return digits;
};

/** Build a one-click dashboard link for the customer (no login needed). */
export const buildCustomerDashboardLink = (phone) => {
  const raw = String(phone || "").trim();
  const digits = raw.replace(/\D/g, "");
  const base = getAppBaseUrl();
  const queryPhone = digits.length >= 10 ? digits.slice(-10) : digits;
  return queryPhone ? `${base}/customer-mobile/${queryPhone}` : "";
};

export const getCustomerPhone = (session = {}) => {
  return (
    session.vehicle?.customer?.phone ||
    session.customer?.phone ||
    session.customer_phone ||
    session.phone ||
    ""
  );
};

export const buildParkedMessage = (session = {}) => {
  const vehicle = session.vehicle || {};
  const customer = vehicle.customer || session.customer || {};
  const plate = vehicle.license_plate || "your vehicle";
  const slot = session.parking_slot || "-";
  const phone = getCustomerPhone(session);
  const dashboardLink = buildCustomerDashboardLink(phone);

  const lines = [
    `Hello ${customer.name || "Customer"},`,
    "",
    `Your car ${plate} has been parked safely at slot ${slot}.`,
  ];
  if (session.ticket_code) lines.push(`Ticket: ${session.ticket_code}`);
  if (dashboardLink) {
    lines.push(`Dashboard: ${dashboardLink}`);
  }
  lines.push(
    "",
    "When you are ready to leave, just reply to this chat with your ticket number",
    `(e.g. "Please bring my car. Ticket: ${session.ticket_code || "-"}") and we will bring your car to you.`,
    "* Valet Parking"
  );
  return lines.join("\n");
};

export const buildWhatsAppLink = (session) => {
  const phone = normalizePhone(getCustomerPhone(session));
  const text = encodeURIComponent(buildParkedMessage(session));
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
};

export const openWhatsAppDraft = (session) => {
  window.open(buildWhatsAppLink(session), "_blank", "noopener,noreferrer");
};

// ---------- WhatsApp-based retrieval ----------
// The business WhatsApp number customers message to ask for their car.
// Set VITE_WHATSAPP_NUMBER (e.g. 919876543210) in frontend/.env
export const BUSINESS_WHATSAPP = normalizePhone(import.meta.env.VITE_WHATSAPP_NUMBER);

export const buildRetrievalRequestText = (session = {}) => {
  const plate = session?.vehicle?.license_plate || "";
  return `Please bring my car.\nTicket: ${session.ticket_code || "-"}${plate ? `\nCar: ${plate}` : ""}`;
};

/** Link the CUSTOMER taps: opens a chat to the business number with the request filled in. */
export const buildRetrievalRequestLink = (session) => {
  const text = encodeURIComponent(buildRetrievalRequestText(session));
  return BUSINESS_WHATSAPP
    ? `https://wa.me/${BUSINESS_WHATSAPP}?text=${text}`
    : `https://wa.me/?text=${text}`;
};

export const openRetrievalRequestOnWhatsApp = (session) => {
  window.open(buildRetrievalRequestLink(session), "_blank", "noopener,noreferrer");
};

/** Draft the VALET sends when the car is on its way / ready. */
export const buildReadyMessage = (session = {}) => {
  const vehicle = session.vehicle || {};
  const customer = vehicle.customer || session.customer || {};
  const phone = getCustomerPhone(session);
  const dashboardLink = buildCustomerDashboardLink(phone);

  const lines = [
    `Hello ${customer.name || "Customer"},`,
    "",
    `Your car ${vehicle.license_plate || ""} is ready for pickup at the valet point.`,
  ];
  if (session.ticket_code) lines.push(`Ticket: ${session.ticket_code}`);
  if (dashboardLink) lines.push(`Dashboard: ${dashboardLink}`);
  lines.push(
    "",
    "* Valet Parking"
  );
  return lines.join("\n");
};

export const openReadyDraft = (session) => {
  const phone = normalizePhone(getCustomerPhone(session));
  const text = encodeURIComponent(buildReadyMessage(session));
  window.open(phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
};

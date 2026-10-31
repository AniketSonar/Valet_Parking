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

export const extractVehicle = (session = {}) => {
  if (Array.isArray(session?.vehicle)) return session.vehicle[0] || {};
  return session?.vehicle || {};
};

export const extractCustomer = (session = {}) => {
  if (Array.isArray(session?.customer)) return session.customer[0] || {};
  if (session?.customer && typeof session.customer === "object") return session.customer;

  const vehicle = extractVehicle(session);
  if (Array.isArray(vehicle?.customer)) return vehicle.customer[0] || {};
  if (vehicle?.customer && typeof vehicle.customer === "object") return vehicle.customer;

  return {};
};

export const getCustomerPhone = (session = {}) => {
  const customer = extractCustomer(session);
  const raw =
    customer?.phone ||
    session?.customer_phone ||
    session?.phone ||
    session?.customerPhone ||
    "";
  return String(raw || "").trim();
};

export const buildParkedMessage = (session = {}) => {
  const vehicle = extractVehicle(session);
  const customer = extractCustomer(session);
  const plate = vehicle.license_plate || session.license_plate || "your vehicle";
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

// ---------- Check-in / Ticket WhatsApp Draft ----------
export const buildTicketMessage = (session = {}) => {
  const vehicle = extractVehicle(session);
  const customer = extractCustomer(session);
  const plate = vehicle.license_plate || session.license_plate || "your vehicle";
  const phone = getCustomerPhone(session);
  const dashboardLink = buildCustomerDashboardLink(phone);

  const lines = [
    `Hello ${customer.name || "Customer"},`,
    "",
    `Your car ${plate} has been checked in successfully.`,
  ];
  if (session.ticket_code) lines.push(`Ticket: ${session.ticket_code}`);
  if (dashboardLink) {
    lines.push(`Dashboard: ${dashboardLink}`);
  }
  lines.push(
    "",
    "You can track your vehicle and request retrieval directly from your dashboard link above.",
    "* Valet Parking"
  );
  return lines.join("\n");
};

export const openTicketDraft = (session) => {
  const phone = normalizePhone(getCustomerPhone(session));
  const text = encodeURIComponent(buildTicketMessage(session));
  window.open(phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
};

// ---------- WhatsApp-based retrieval ----------
// The business WhatsApp number customers message to ask for their car.
// Set VITE_WHATSAPP_NUMBER (e.g. 919876543210) in frontend/.env
export const BUSINESS_WHATSAPP = normalizePhone(import.meta.env.VITE_WHATSAPP_NUMBER);

export const buildRetrievalRequestText = (session = {}) => {
  const vehicle = extractVehicle(session);
  const plate = vehicle.license_plate || session?.license_plate || "";
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
  const vehicle = extractVehicle(session);
  const customer = extractCustomer(session);
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

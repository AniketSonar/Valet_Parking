// Manual WhatsApp draft (no API, no tokens).
// Builds a prefilled wa.me link; the valet reviews and presses Send in WhatsApp.

const DEFAULT_COUNTRY_CODE = "91";

export const normalizePhone = (raw) => {
  let digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10) digits = DEFAULT_COUNTRY_CODE + digits;
  return digits;
};

export const buildParkedMessage = (session = {}) => {
  const vehicle = session.vehicle || {};
  const customer = vehicle.customer || {};
  const plate = vehicle.license_plate || "your vehicle";
  const slot = session.parking_slot || "-";
  const lines = [
    `Hello ${customer.name || "Customer"},`,
    "",
    `Your car ${plate} has been parked safely at slot ${slot}.`,
  ];
  if (session.ticket_code) lines.push(`Ticket: ${session.ticket_code}`);
  lines.push("", "When you are ready to leave, request your car and we will bring it to you.", "- Valet Parking");
  return lines.join("\n");
};

export const buildWhatsAppLink = (session) => {
  const phone = normalizePhone(session?.vehicle?.customer?.phone);
  const text = encodeURIComponent(buildParkedMessage(session));
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
};

export const openWhatsAppDraft = (session) => {
  window.open(buildWhatsAppLink(session), "_blank", "noopener,noreferrer");
};

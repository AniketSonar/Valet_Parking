const QRCode = require("qrcode");
const supabase = require("../config/supabase");
const {
  templatesEnabled,
  sendWhatsAppMessage,
  uploadWhatsAppMedia,
  sendWhatsAppImage,
  sendWhatsAppDocument,
  sendWhatsAppTemplate
} = require("../config/whatsapp");

const BRAND = "Valet Parking";
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.VITE_APP_URL || "http://localhost:5173";

const buildDashboardLink = (phone) => {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  return digits ? `${FRONTEND_URL}/customer-mobile/${digits}` : "";
};

const money = (amount) => `Rs. ${Number(amount || 0).toFixed(2)}`;
const plateOf = (d) => d.plate || "your vehicle";
const dashLine = (d) => {
  const link = buildDashboardLink(d.phone);
  return link ? `\nView your dashboard: ${link}` : "";
};

/**
 * One entry per customer-facing WhatsApp event.
 *  - text(d)    : plain-text body (used when templates are disabled)
 *  - template   : name of the Meta-approved template (used when
 *                 WHATSAPP_USE_TEMPLATES=true)
 *  - params(d)  : ordered values for {{1}}, {{2}}, ... in that template
 *  - header     : "image" | "document" if the template has a media header
 */
const EVENTS = {
  ticket: {
    template: "aura_valet_ticket",
    header: "image",
    params: (d) => [
      plateOf(d),
      d.parkingType === "valet" ? "Valet Parking" : "Self Parking",
      d.ticketCode,
      d.location || "Will be assigned shortly",
      d.paymentSummary || "At exit"
    ],
    text: (d) =>
      `*${BRAND} - Ticket*\n` +
      `Vehicle: ${plateOf(d)}\n` +
      `Type: ${d.parkingType === "valet" ? "Valet Parking" : "Self Parking"}\n` +
      `Ticket: ${d.ticketCode}\n` +
      `Parking: ${d.location || "Will be assigned shortly"}\n` +
      `Payment: ${d.paymentSummary || "At exit"}\n\n` +
      `Show the QR code on this ticket when collecting your vehicle.` +
      dashLine(d)
  },

  parked: {
    template: "aura_valet_parked",
    params: (d) => [plateOf(d), d.location || "-", d.ticketCode],
    text: (d) =>
      `*${BRAND}*\n` +
      `Your vehicle ${plateOf(d)} is parked.\n` +
      `Parking location: ${d.location || "-"}\n` +
      `Ticket: ${d.ticketCode}` +
      dashLine(d)
  },

  retrieval_requested: {
    template: "aura_valet_retrieval_requested",
    params: (d) => [plateOf(d), d.ticketCode],
    text: (d) =>
      `*${BRAND}*\n` +
      `We received your request for ${plateOf(d)}. A valet is bringing it to you.\n` +
      `Ticket: ${d.ticketCode}` +
      dashLine(d)
  },

  ready_for_pickup: {
    template: "aura_valet_ready_pickup",
    params: (d) => [plateOf(d), d.ticketCode, d.pickupPoint || "the valet desk"],
    text: (d) =>
      `*${BRAND}*\n` +
      `Your vehicle ${plateOf(d)} is ready for pickup at ${
        d.pickupPoint || "the valet desk"
      }.\n` +
      `Ticket: ${d.ticketCode}` +
      dashLine(d)
  },

  returned: {
    template: "aura_valet_returned",
    params: (d) => [plateOf(d), d.ticketCode],
    text: (d) =>
      `*${BRAND}*\n` +
      `Your vehicle ${plateOf(d)} has been returned. Thank you for choosing us!\n` +
      `Ticket: ${d.ticketCode}\n` +
      `You can rate your experience from your customer dashboard.` +
      dashLine(d)
  },

  invoice: {
    template: "aura_valet_invoice",
    header: "document",
    params: (d) => [d.invoiceNumber, d.ticketCode, plateOf(d), money(d.total)],
    text: (d) =>
      `*${BRAND} - Invoice*\n` +
      `Invoice: ${d.invoiceNumber}\n` +
      `Ticket: ${d.ticketCode}\n` +
      `Vehicle: ${plateOf(d)}\n` +
      `Total: ${money(d.total)}\n\n` +
      `Your invoice PDF is attached.`
  }
};

const logNotification = async ({ sessionId, customer, message, status }) => {
  if (!sessionId || !customer?.id) return;

  const { error } = await supabase.from("notifications").insert({
    parking_session_id: sessionId,
    recipient_type: "customer",
    recipient_id: customer.id,
    message,
    channel: "whatsapp",
    status,
    sent_at: status === "sent" ? new Date().toISOString() : null
  });

  if (error) {
    console.error("Save WhatsApp notification error:", error);
  }
};

const buildMedia = async (event, data) => {
  if (event === "ticket" && data.ticketCode) {
    return {
      type: "image",
      mimeType: "image/png",
      filename: `ticket-${data.ticketCode}.png`,
      buffer: await QRCode.toBuffer(String(data.ticketCode), {
        width: 480,
        margin: 2
      })
    };
  }

  if (event === "invoice" && data.pdfBuffer) {
    return {
      type: "document",
      mimeType: "application/pdf",
      filename: `Invoice-${data.invoiceNumber}.pdf`,
      buffer: data.pdfBuffer
    };
  }

  return null;
};

const deliver = async ({ phone, event, data, media }) => {
  const def = EVENTS[event];

  if (templatesEnabled()) {
    const header =
      def.header && media
        ? {
            type: media.type,
            filename: media.filename,
            mediaId: await uploadWhatsAppMedia(media)
          }
        : undefined;

    await sendWhatsAppTemplate({
      phone,
      name: def.template,
      params: def.params(data),
      header
    });
    return;
  }

  await sendWhatsAppMessage({ phone, message: def.text(data) });

  if (!media) return;

  // The text already went out; a media failure should not report the whole
  // notification as failed, but it is logged so it can be investigated.
  try {
    const mediaId = await uploadWhatsAppMedia(media);

    if (media.type === "document") {
      await sendWhatsAppDocument({
        phone,
        mediaId,
        filename: media.filename
      });
    } else {
      await sendWhatsAppImage({ phone, mediaId, caption: "Your ticket QR code" });
    }
  } catch (mediaError) {
    console.error(`WhatsApp ${event} media error:`, mediaError.message);
  }
};

/**
 * Sends one WhatsApp notification and records it in `notifications`.
 * Never throws - a WhatsApp failure must not break check-in, payment, etc.
 */
const notifyCustomer = async ({ event, sessionId, customer, data = {} }) => {
  // WhatsApp is manual now: valets send a prefilled wa.me draft from the
  // dashboard. Automatic Cloud-API sending only runs if explicitly enabled.
  if (String(process.env.WHATSAPP_AUTO_SEND || "").toLowerCase() !== "true") {
    return { sent: false, manual: true, error: null };
  }

  if (!EVENTS[event]) {
    throw new Error(`Unknown WhatsApp event: ${event}`);
  }

  if (!customer?.phone) {
    console.warn(`WhatsApp ${event} skipped: customer phone not available.`);
    return { sent: false, error: "Customer WhatsApp number not available." };
  }

  // Ensure phone is in data so dashboard link helpers can use it
  if (!data.phone) data.phone = customer.phone;

  const message = EVENTS[event].text(data);

  try {
    const media = await buildMedia(event, data);
    await deliver({ phone: customer.phone, event, data, media });
    await logNotification({ sessionId, customer, message, status: "sent" });
    console.log(`WhatsApp ${event} sent to ${customer.phone}`);
    return { sent: true, error: null };
  } catch (error) {
    console.error(`WhatsApp ${event} error:`, error.message);
    await logNotification({ sessionId, customer, message, status: "failed" });
    return { sent: false, error: error.message };
  }
};

/** Fire-and-forget version for request handlers. */
const notifyCustomerInBackground = (args) => {
  void notifyCustomer(args).catch((error) =>
    console.error("WhatsApp background notification error:", error)
  );
};

/** Loads the customer/vehicle for a session, then notifies. Never throws. */
const notifySessionEvent = async ({ event, sessionId, data = {} }) => {
  try {
    const { data: session, error } = await supabase
      .from("parking_sessions")
      .select(
        `
        id,
        ticket_code,
        parking_slot,
        parking_type,
        vehicle:vehicles (
          id,
          license_plate,
          customer:customers ( id, name, phone )
        )
      `
      )
      .eq("id", sessionId)
      .single();

    if (error || !session) {
      throw new Error(error?.message || "Parking session not found.");
    }

    return await notifyCustomer({
      event,
      sessionId: session.id,
      customer: session.vehicle?.customer,
      data: {
        plate: session.vehicle?.license_plate,
        ticketCode: session.ticket_code,
        parkingType: session.parking_type,
        location: session.parking_slot,
        phone: session.vehicle?.customer?.phone,
        ...data
      }
    });
  } catch (error) {
    console.error(`WhatsApp ${event} lookup error:`, error.message);
    return { sent: false, error: error.message };
  }
};

const notifySessionEventInBackground = (args) => {
  void notifySessionEvent(args);
};

module.exports = {
  EVENTS,
  notifyCustomer,
  notifyCustomerInBackground,
  notifySessionEvent,
  notifySessionEventInBackground
};

require("dotenv").config();

const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || "v23.0";
const defaultCountryCode = (
  process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ?? "91"
).replace(/\D/g, "");
const templateLanguage =
  process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "en";

const GRAPH_URL = `https://graph.facebook.com/${apiVersion}`;

// Business-initiated messages outside the 24-hour customer-service window
// are only delivered by WhatsApp when they use a Meta-approved template.
const templatesEnabled = () =>
  String(process.env.WHATSAPP_USE_TEMPLATES || "").toLowerCase() === "true";

const assertWhatsAppConfigured = () => {
  if (!accessToken || !phoneNumberId) {
    throw new Error(
      "WhatsApp service is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in backend/.env and restart the backend."
    );
  }
};

/**
 * Converts whatever is stored in the database into the international,
 * digits-only format the Cloud API expects (e.g. 919876543210).
 *  - "+91 98765 43210"  -> 919876543210
 *  - "98765 43210"      -> 919876543210  (default country code applied)
 *  - "098765 43210"     -> 919876543210
 *  - "0044 7700 900123" -> 447700900123
 */
const normalizePhoneNumber = (phone) => {
  const raw = String(phone || "").trim();
  const hasPlus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");

  if (!digits) {
    throw new Error("Recipient WhatsApp phone number is not available.");
  }

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (!hasPlus) {
    digits = digits.replace(/^0+/, "");

    if (defaultCountryCode && digits.length === 10) {
      digits = `${defaultCountryCode}${digits}`;
    }
  }

  if (digits.length < 8 || digits.length > 15) {
    throw new Error(`Invalid WhatsApp phone number: ${raw}`);
  }

  return digits;
};

const callGraph = async (path, init) => {
  assertWhatsAppConfigured();

  const response = await fetch(`${GRAPH_URL}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {})
    }
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const code = result?.error?.code;
    let message =
      result?.error?.message ||
      `WhatsApp API request failed with status ${response.status}.`;

    if (code === 131047) {
      message +=
        " (Customer has not messaged in the last 24 hours - use an approved template: set WHATSAPP_USE_TEMPLATES=true.)";
    }

    const error = new Error(message);
    error.code = code;
    throw error;
  }

  return result;
};

const postMessage = (payload) =>
  callGraph(`${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload })
  });

const sendWhatsAppMessage = async ({ phone, message }) => {
  if (!message?.trim()) {
    throw new Error("WhatsApp message is required.");
  }

  return postMessage({
    to: normalizePhoneNumber(phone),
    type: "text",
    text: { preview_url: false, body: message.trim() }
  });
};

/** Uploads a file to WhatsApp and returns the media id. */
const uploadWhatsAppMedia = async ({ buffer, mimeType, filename }) => {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", mimeType);
  form.append("file", new Blob([buffer], { type: mimeType }), filename);

  const result = await callGraph(`${phoneNumberId}/media`, {
    method: "POST",
    body: form
  });

  if (!result?.id) {
    throw new Error("WhatsApp media upload did not return a media id.");
  }

  return result.id;
};

const sendWhatsAppImage = async ({ phone, mediaId, caption }) =>
  postMessage({
    to: normalizePhoneNumber(phone),
    type: "image",
    image: { id: mediaId, ...(caption ? { caption } : {}) }
  });

const sendWhatsAppDocument = async ({ phone, mediaId, filename, caption }) =>
  postMessage({
    to: normalizePhoneNumber(phone),
    type: "document",
    document: {
      id: mediaId,
      filename,
      ...(caption ? { caption } : {})
    }
  });

/**
 * header: optional { type: "image" | "document", mediaId, filename }
 * params: ordered array of strings for {{1}}, {{2}}, ...
 */
const sendWhatsAppTemplate = async ({ phone, name, params = [], header }) => {
  const components = [];

  if (header?.mediaId) {
    components.push({
      type: "header",
      parameters: [
        header.type === "document"
          ? {
              type: "document",
              document: { id: header.mediaId, filename: header.filename }
            }
          : { type: "image", image: { id: header.mediaId } }
      ]
    });
  }

  if (params.length) {
    components.push({
      type: "body",
      parameters: params.map((text) => ({
        type: "text",
        // Template parameters may not contain newlines or tabs.
        text: String(text ?? "-").replace(/[\r\n\t]+/g, " ").trim() || "-"
      }))
    });
  }

  return postMessage({
    to: normalizePhoneNumber(phone),
    type: "template",
    template: {
      name,
      language: { code: templateLanguage },
      ...(components.length ? { components } : {})
    }
  });
};

module.exports = {
  assertWhatsAppConfigured,
  normalizePhoneNumber,
  templatesEnabled,
  sendWhatsAppMessage,
  uploadWhatsAppMedia,
  sendWhatsAppImage,
  sendWhatsAppDocument,
  sendWhatsAppTemplate
};

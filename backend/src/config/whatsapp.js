require("dotenv").config();

const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || "v23.0";

const assertWhatsAppConfigured = () => {
  if (!accessToken || !phoneNumberId) {
    throw new Error(
      "WhatsApp service is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in backend/.env and restart the backend."
    );
  }
};

const normalizePhoneNumber = (phone) => {
  const normalized = String(phone || "").replace(/\D/g, "");

  if (!normalized) {
    throw new Error("Recipient WhatsApp phone number is not available.");
  }

  return normalized;
};

const sendWhatsAppMessage = async ({ phone, message }) => {
  assertWhatsAppConfigured();

  if (!message?.trim()) {
    throw new Error("WhatsApp message is required.");
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizePhoneNumber(phone),
        type: "text",
        text: {
          preview_url: false,
          body: message.trim()
        }
      })
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result?.error?.message ||
      `WhatsApp API request failed with status ${response.status}.`
    );
  }

  return result;
};

module.exports = {
  assertWhatsAppConfigured,
  normalizePhoneNumber,
  sendWhatsAppMessage
};

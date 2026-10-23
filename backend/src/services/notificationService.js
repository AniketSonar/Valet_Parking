const supabase = require("../config/supabase");
const { sendWhatsAppMessage } = require("../config/whatsapp");

const getRecipientPhone = async (recipientType, recipientId) => {
  const table = recipientType === "customer" ? "customers" : "users";
  const { data, error } = await supabase
    .from(table)
    .select("phone")
    .eq("id", recipientId)
    .single();

  if (error || !data) {
    throw new Error("Recipient not found.");
  }

  if (!data.phone) {
    throw new Error("Recipient WhatsApp phone number not found.");
  }

  return data.phone;
};

const createAndSendNotification = async ({
  parking_session_id,
  recipient_type = "customer",
  recipient_id,
  message,
  channel = "whatsapp"
}) => {
  if (
    !parking_session_id ||
    !recipient_type ||
    !recipient_id ||
    !message ||
    !channel
  ) {
    throw new Error(
      "parking_session_id, recipient_type, recipient_id, message and channel are required."
    );
  }

  if (!["whatsapp", "in_app"].includes(channel)) {
    throw new Error("Only WhatsApp and in-app notifications are supported.");
  }

  const { data: notification, error: notificationError } = await supabase
    .from("notifications")
    .insert({
      parking_session_id,
      recipient_type,
      recipient_id,
      message,
      channel,
      status: "pending"
    })
    .select()
    .single();

  if (notificationError) {
    throw new Error(notificationError.message);
  }

  if (channel === "in_app") {
    return {
      notification,
      whatsappSent: false,
      statusUpdateFailed: false
    };
  }

  try {
    const phone = await getRecipientPhone(recipient_type, recipient_id);
    const providerResponse = await sendWhatsAppMessage({ phone, message });
    const { data: sentNotification, error: updateError } = await supabase
      .from("notifications")
      .update({
        status: "sent",
        sent_at: new Date().toISOString()
      })
      .eq("id", notification.id)
      .select()
      .single();

    if (updateError) {
      console.error("WhatsApp notification status update error:", updateError);
      return {
        notification,
        whatsappSent: true,
        statusUpdateFailed: true,
        providerResponse
      };
    }

    return {
      notification: sentNotification,
      whatsappSent: true,
      statusUpdateFailed: false,
      providerResponse
    };
  } catch (whatsappError) {
    console.error("WhatsApp notification error:", whatsappError);
    await supabase
      .from("notifications")
      .update({ status: "failed" })
      .eq("id", notification.id);

    return {
      notification,
      whatsappSent: false,
      statusUpdateFailed: false,
      whatsappError: whatsappError.message
    };
  }
};

module.exports = {
  getRecipientPhone,
  createAndSendNotification
};

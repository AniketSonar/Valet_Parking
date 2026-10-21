
const supabase = require("../config/supabase");
const { transporter } = require("../config/email");;
const QRCode = require("qrcode");
const createAuraEmail = require("../templates/auraEmailTemplate");

/*
|--------------------------------------------------------------------------
| Get Recipient Email
|--------------------------------------------------------------------------
*/

const getRecipientEmail = async (recipient_type, recipient_id) => {
  if (recipient_type === "customer") {
    const { data, error } = await supabase
      .from("customers")
      .select("email")
      .eq("id", recipient_id)
      .single();

    if (error || !data) {
      throw new Error("Customer not found.");
    }

    if (!data.email) {
      throw new Error("Customer email not found.");
    }

    return data.email;
  }

  const { data, error } = await supabase
    .from("users")
    .select("email")
    .eq("id", recipient_id)
    .single();

  if (error || !data) {
    throw new Error("Recipient not found.");
  }

  if (!data.email) {
    throw new Error("Recipient email not found.");
  }

  return data.email;
};


/*
|--------------------------------------------------------------------------
| Send Parking Session Email
|--------------------------------------------------------------------------
|
| This is the reusable email function.
|
| It is used by:
| 1. Reception check-in
| 2. Notification controller
|
|--------------------------------------------------------------------------
*/

const sendParkingSessionEmail = async ({
  parking_session_id,
  recipient_type = "customer",
  recipient_id,
  message = "Your vehicle has been successfully checked in."
}) => {
  if (!parking_session_id) {
    throw new Error("Parking session ID is required.");
  }

  if (!recipient_id) {
    throw new Error("Recipient ID is required.");
  }

  /*
   * Fetch complete parking session information.
   */
  const { data: session, error: sessionError } = await supabase
    .from("parking_sessions")
    .select(`
      id,
      vehicle_id,
      parking_type,
      status,
      ticket_code,
      parking_slot,
      checked_in_at,
      vehicle:vehicles(
        license_plate,
        make,
        model,
        color,
        customer_id,
        customer:customers(
          name
        )
      )
    `)
    .eq("id", parking_session_id)
    .single();

  if (sessionError || !session) {
    throw new Error("Parking session not found.");
  }

  /*
   * Get recipient email.
   */
  const recipientEmail = await getRecipientEmail(
    recipient_type,
    recipient_id
  );

  /*
   * Generate QR code from ticket code.
   */
  const qrBuffer = await QRCode.toBuffer(session.ticket_code);

  const customerName =
    session.vehicle?.customer?.name || "Customer";

  /*
   * Build AURA email.
   */
  const html = createAuraEmail({
    customerName,
    vehicleNumber:
      session.vehicle?.license_plate || "N/A",
    vehicleModel:
      session.vehicle?.model || "N/A",
    parkingType:
      session.parking_type === "valet"
        ? "Valet Parking"
        : "Self Parking",
    ticketCode:
      session.ticket_code || "N/A",
    parkingSlot:
      session.parking_slot || null,
    checkedInAt: session.checked_in_at
      ? new Date(session.checked_in_at).toLocaleString("en-IN")
      : new Date().toLocaleString("en-IN"),
    qrCode: "cid:aura-parking-qr"
  });

  /*
   * Send email.
   */
  const mailResult = await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject:
      "Aura Valet Parking - Vehicle Check-In Confirmation",
    text: message,
    html,
    attachments: [
      {
        filename: "aura-parking-qr.png",
        content: qrBuffer,
        cid: "aura-parking-qr"
      }
    ]
  });

  return {
    recipientEmail,
    messageId: mailResult.messageId,
    ticketCode: session.ticket_code
  };
};


/*
|--------------------------------------------------------------------------
| Create + Send Notification
|--------------------------------------------------------------------------
|
| Creates the notification record first, then sends the email.
|
| This is reusable from controllers without making an HTTP
| request to another backend endpoint.
|
|--------------------------------------------------------------------------
*/

const createAndSendNotification = async ({
  parking_session_id,
  recipient_type = "customer",
  recipient_id,
  message,
  channel = "email"
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

  /*
   * Create notification as pending.
   */
  const { data: notification, error: notificationError } =
    await supabase
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

  /*
   * Currently email is the supported external channel.
   */
  if (channel === "email") {
    try {
      await sendParkingSessionEmail({
        parking_session_id,
        recipient_type,
        recipient_id,
        message
      });

      /*
       * Mark notification as successfully sent.
       */
      const {
        data: updatedNotification,
        error: updateError
      } = await supabase
        .from("notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString()
        })
        .eq("id", notification.id)
        .select()
        .single();

      if (updateError) {
        console.error(
          "Notification status update error:",
          updateError
        );

        /*
         * Email was actually sent, so don't throw an error
         * that makes the caller think the email failed.
         */
        return {
          notification,
          emailSent: true,
          statusUpdateFailed: true
        };
      }

      return {
        notification: updatedNotification,
        emailSent: true,
        statusUpdateFailed: false
      };
    } catch (emailError) {
      console.error(
        "Parking session email error:",
        emailError
      );

      /*
       * Keep the notification record for tracking/debugging.
       */
      return {
        notification,
        emailSent: false,
        statusUpdateFailed: false,
        emailError: emailError.message
      };
    }
  }

  /*
   * Non-email channels currently just create the notification.
   */
  return {
    notification,
    emailSent: false,
    statusUpdateFailed: false
  };
};


module.exports = {
  getRecipientEmail,
  sendParkingSessionEmail,
  createAndSendNotification
};


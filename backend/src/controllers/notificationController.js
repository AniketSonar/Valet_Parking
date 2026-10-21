
const supabase = require("../config/supabase");
const {
  createAndSendNotification
} = require("../services/notificationService");


const createNotification = async (req, res) => {
  try {
    const {
      parking_session_id,
      recipient_type,
      recipient_id,
      message,
      channel
    } = req.body;

    if (
      !parking_session_id ||
      !recipient_type ||
      !recipient_id ||
      !message ||
      !channel
    ) {
      return res.status(400).json({
        success: false,
        message:
          "parking_session_id, recipient_type, recipient_id, message and channel are required."
      });
    }

    /*
     * Verify parking session exists before creating
     * the notification.
     */
    const {
      data: session,
      error: sessionError
    } = await supabase
      .from("parking_sessions")
      .select("id")
      .eq("id", parking_session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        message: "Parking session not found."
      });
    }

    /*
     * Use the reusable notification service.
     */
    const result = await createAndSendNotification({
      parking_session_id,
      recipient_type,
      recipient_id,
      message,
      channel
    });

    /*
     * Email failed, but notification record was created.
     */
    if (channel === "email" && !result.emailSent) {
      return res.status(500).json({
        success: false,
        message:
          "Notification created but email could not be sent.",
        notification: result.notification,
        email_error: result.emailError || null
      });
    }

    /*
     * Email was sent successfully.
     */
    if (channel === "email" && result.emailSent) {
      return res.status(201).json({
        success: true,
        message:
          "Notification created and email sent successfully.",
        notification: result.notification
      });
    }

    /*
     * Non-email notification.
     */
    return res.status(201).json({
      success: true,
      message: "Notification created successfully.",
      notification: result.notification
    });

  } catch (error) {
    console.error("Create notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};



const getNotifications = async (req, res) => {
  try {
    const { recipient_id, recipient_type, status } = req.query;

    let query = supabase
      .from("notifications")
      .select(`
        *,
        parking_session:parking_sessions(
          id,
          vehicle_id,
          parking_type,
          status,
          ticket_code,
          parking_slot
        )
      `)
      .order("created_at", { ascending: false });

    if (recipient_id) {
      query = query.eq("recipient_id", recipient_id);
    }

    if (recipient_type) {
      query = query.eq("recipient_type", recipient_type);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data: notifications, error } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      count: notifications?.length || 0,
      notifications: notifications || []
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const updateNotificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status is required."
      });
    }

    const { data: notification, error } = await supabase
      .from("notifications")
      .update({
        status,
        sent_at: status === "sent" ? new Date().toISOString() : null
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification status updated successfully.",
      notification
    });
  } catch (error) {
    console.error("Update notification status error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("id, parking_session_id, recipient_type, recipient_id, message, channel, status, sent_at, created_at")
      .eq("recipient_id", req.user.id)
      .eq("recipient_type", req.user.role)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, count: notifications?.length || 0, notifications: notifications || [] });
  } catch (error) {
    console.error("Get my notifications error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch notifications." });
  }
};

module.exports = {
  createNotification,
  getNotifications,
  updateNotificationStatus,
  getMyNotifications
};
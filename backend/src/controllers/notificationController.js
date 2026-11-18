
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
      channel = "whatsapp"
    } = req.body;

    if (
      !parking_session_id ||
      !recipient_type ||
      !recipient_id ||
      !message
    ) {
      return res.status(400).json({
        success: false,
        message:
          "parking_session_id, recipient_type, recipient_id and message are required."
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
     * WhatsApp failed, but notification record was created.
     */
    if (channel === "whatsapp" && !result.whatsappSent) {
      return res.status(500).json({
        success: false,
        message:
          "Notification created but WhatsApp message could not be sent.",
        notification: result.notification,
        whatsapp_error: result.whatsappError || null
      });
    }

    if (channel === "whatsapp" && result.whatsappSent) {
      return res.status(201).json({
        success: true,
        message:
          "Notification created and WhatsApp message sent successfully.",
        notification: result.notification
      });
    }

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
    const hotelId = req.query.hotelId || req.query.building_id;
    const isSuperAdmin = req.user.role === "super_admin";

    let query = supabase
      .from("notifications")
      .select(`
        id, parking_session_id, recipient_type, recipient_id, message, channel, status, sent_at, created_at,
        session:parking_sessions (
          id, ticket_code, parking_slot,
          vehicle:vehicles ( license_plate )
        )
      `)
      .order("created_at", { ascending: false });

    if (!isSuperAdmin) {
      query = query
        .eq("recipient_id", req.user.id)
        .eq("recipient_type", req.user.role);
    }

    const { data: notifications, error } = await query;
    if (error) return res.status(400).json({ success: false, message: error.message });

    // Map slots to hotels
    const { data: slotData } = await supabase
      .from("parking_slots")
      .select(`
        slot_number,
        floor:parking_floors (
          id,
          building:parking_buildings ( id, building_name )
        )
      `);

    const slotMap = new Map();
    (slotData || []).forEach((s) => {
      if (s.slot_number) {
        slotMap.set(s.slot_number, {
          hotel_id: s.floor?.building?.id || null,
          hotel_name: s.floor?.building?.building_name || "All Branches"
        });
      }
    });

    let result = (notifications || []).map((n) => {
      const slot = n.session?.parking_slot;
      const hInfo = slot ? slotMap.get(slot) : null;
      return {
        ...n,
        hotel_id: hInfo?.hotel_id || null,
        hotel_name: hInfo?.hotel_name || "All Branches",
        ticket_code: n.session?.ticket_code || null,
        vehicle_plate: n.session?.vehicle?.license_plate || null
      };
    });

    if (hotelId && hotelId !== "all") {
      result = result.filter((n) => n.hotel_id === hotelId);
    }

    return res.status(200).json({
      success: true,
      count: result.length,
      notifications: result
    });
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
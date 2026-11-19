const supabase = require("../config/supabase");
const { getAreaScope } = require("../utils/areaScope");

const createIncident = async (req, res) => {
  try {
    const {
      parking_session_id,
      incident_type,
      description
    } = req.body;

    if (!incident_type || !description) {
      return res.status(400).json({
        success: false,
        message: "Incident type and description are required."
      });
    }

    const validTypes = [
      "vehicle_damage",
      "lost_ticket",
      "dispute",
      "theft",
      "other"
    ];

    if (!validTypes.includes(incident_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid incident type."
      });
    }

    if (parking_session_id) {
      const { data: session, error: sessionError } = await supabase
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
    }

    const { data: employee } = await supabase
      .from("employees")
      .select("id, name, role, email")
      .eq("email", req.user.email)
      .maybeSingle();

    const { data: incident, error } = await supabase
      .from("incidents")
      .insert([
        {
          parking_session_id: parking_session_id || null,
          reported_by: employee?.id || null,
          incident_type,
          description: description.trim()
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    const { data: admins, error: adminError } = await supabase
      .from("users")
      .select("id, role")
      .in("role", ["parking_admin", "super_admin"]);

    if (adminError) {
      console.error("Get admin users error:", adminError);
    } else if (admins?.length) {
      const notifications = admins.map(admin => ({
        parking_session_id: parking_session_id || null,
        recipient_type: admin.role,
        recipient_id: admin.id,
        message: `New ${incident_type.replace("_", " ")} incident reported: ${description.trim()}`,
        channel: "in_app",
        status: "sent",
        sent_at: new Date().toISOString()
      }));

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notificationError) {
        console.error("Incident notification error:", notificationError);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Incident reported successfully.",
      incident
    });
  } catch (error) {
    console.error("Create incident error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};
const getIncidents = async (req, res) => {
  try {
    const { status, incident_type, hotelId: rawHotelId } = req.query;
    const hotelId = rawHotelId || req.query.building_id;

    let query = supabase
      .from("incidents")
      .select(`
        id,
        parking_session_id,
        reported_by,
        incident_type,
        description,
        status,
        resolved_at,
        created_at,
        employee:employees (
          id,
          name,
          role,
          email,
          phone
        ),
        session:parking_sessions (
          id,
          ticket_code,
          parking_slot,
          checked_in_at,
          vehicle:vehicles (
            id,
            license_plate,
            make,
            model,
            color
          ),
          valet:employees (
            id,
            name,
            phone,
            role
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (incident_type) {
      query = query.eq("incident_type", incident_type);
    }

    const { data: rawIncidents, error } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Map slot numbers to floors and hotels
    const { data: slotData } = await supabase
      .from("parking_slots")
      .select(`
        slot_number,
        floor:parking_floors (
          id,
          floor_name,
          building:parking_buildings ( id, building_name, address )
        )
      `);

    const slotMap = new Map();
    (slotData || []).forEach((s) => {
      if (s.slot_number) {
        slotMap.set(s.slot_number, {
          hotel_id: s.floor?.building?.id || null,
          hotel_name: s.floor?.building?.building_name || "Unassigned",
          floor_name: s.floor?.floor_name || "Unassigned"
        });
      }
    });

    // Check inspection photos if available
    const sessionIds = (rawIncidents || [])
      .map((inc) => inc.parking_session_id)
      .filter(Boolean);

    let photoMap = new Map();
    if (sessionIds.length > 0) {
      const { data: inspections } = await supabase
        .from("vehicle_inspections")
        .select(`
          session_id,
          photos:vehicle_inspection_photos ( photo_path )
        `)
        .in("session_id", sessionIds);

      (inspections || []).forEach((ins) => {
        const paths = (ins.photos || []).map((p) => p.photo_path).filter(Boolean);
        if (paths.length > 0) {
          photoMap.set(ins.session_id, paths);
        }
      });
    }

    let incidents = (rawIncidents || []).map((inc) => {
      const slot = inc.session?.parking_slot;
      const slotInfo = slot ? slotMap.get(slot) : null;
      const photos = inc.parking_session_id ? (photoMap.get(inc.parking_session_id) || []) : [];

      return {
        ...inc,
        hotel_id: slotInfo?.hotel_id || null,
        hotel_name: slotInfo?.hotel_name || "Unassigned",
        floor_name: slotInfo?.floor_name || "Unassigned",
        vehicle_plate: inc.session?.vehicle?.license_plate || null,
        vehicle_model: inc.session?.vehicle ? `${inc.session.vehicle.make || ""} ${inc.session.vehicle.model || ""}`.trim() : null,
        photos
      };
    });

    if (req.user?.role === "manager" || req.user?.role === "parking_admin") {
      const scope = await getAreaScope(req.user);
      incidents = incidents.filter((inc) => scope.buildingIds && scope.buildingIds.includes(inc.hotel_id));
    } else if (hotelId && hotelId !== "all") {
      incidents = incidents.filter((inc) => inc.hotel_id === hotelId);
    }

    return res.status(200).json({
      success: true,
      count: incidents?.length || 0,
      incidents: incidents || []
    });
  } catch (error) {
    console.error("Get incidents error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: incident, error } = await supabase
      .from("incidents")
      .select(`
        id,
        parking_session_id,
        reported_by,
        incident_type,
        description,
        status,
        resolved_at,
        created_at,
        employee:employees(
          id,
          name,
          role,
          email
        )
      `)
      .eq("id", id)
      .single();

    if (error || !incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found."
      });
    }

    return res.status(200).json({
      success: true,
      incident
    });
  } catch (error) {
    console.error("Get incident error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};
const updateIncidentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "open",
      "in_review",
      "resolved",
      "closed"
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid incident status."
      });
    }

    const { data: existingIncident, error: fetchError } = await supabase
      .from("incidents")
      .select("id, status")
      .eq("id", id)
      .single();

    if (fetchError || !existingIncident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found."
      });
    }

    const allowedTransitions = {
      open: ["in_review"],
      in_review: ["resolved"],
      resolved: ["closed"],
      closed: []
    };

    if (existingIncident.status === status) {
      return res.status(400).json({
        success: false,
        message: `Incident is already ${status}.`
      });
    }

    if (!allowedTransitions[existingIncident.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          `Incident cannot be moved from ${existingIncident.status} to ${status}.`
      });
    }

    const updates = {
      status
    };

    if (status === "resolved" || status === "closed") {
      updates.resolved_at = new Date().toISOString();
    }

    const { data: incident, error } = await supabase
      .from("incidents")
      .update(updates)
      .eq("id", id)
      .eq("status", existingIncident.status)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (!incident) {
      return res.status(409).json({
        success: false,
        message: "Incident status changed before this update could be completed."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Incident status updated successfully.",
      incident
    });
  } catch (error) {
    console.error("Update incident status error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const getIncidentsByParkingSession = async (req, res) => {
  try {
    const { parking_session_id } = req.params;

    const { data: incidents, error } = await supabase
      .from("incidents")
      .select(`
        id,
        parking_session_id,
        incident_type,
        description,
        status,
        resolved_at,
        created_at,
        employee:employees(
          id,
          name,
          role,
          email
        )
      `)
      .eq("parking_session_id", parking_session_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get incidents by parking session error:", error);

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      count: incidents?.length || 0,
      incidents: incidents || []
    });
  } catch (error) {
    console.error("Get incidents by parking session error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

module.exports = {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  getIncidentsByParkingSession
};
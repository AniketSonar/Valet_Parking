const supabase = require("../config/supabase");
const {
  getAreaScope,
  floorInScope,
  applyFloorScope,
  getValetPost
} = require("../utils/areaScope");

/** Managers may only touch slots on their assigned floors. */
const assertSlotAccess = async (req, res, slotId) => {
  const { data: slot } = await supabase
    .from("parking_slots")
    .select("id, floor_id")
    .eq("id", slotId)
    .maybeSingle();

  if (!slot) {
    res.status(404).json({ success: false, message: "Parking slot not found." });
    return false;
  }

  const scope = await getAreaScope(req.user);

  if (!floorInScope(scope, slot.floor_id)) {
    res.status(403).json({
      success: false,
      message: "This slot is outside the area assigned to you."
    });
    return false;
  }

  return true;
};

const createParkingSlot = async (req, res) => {
  try {
    const { slot_number, parking_type } = req.body;

    const allowedParkingTypes = ["car", "bike", "truck"];

    if (!slot_number || !parking_type) {
      return res.status(400).json({
        success: false,
        message: "slot_number and parking_type are required."
      });
    }

    if (!allowedParkingTypes.includes(parking_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid parking type. Use car, bike, or truck."
      });
    }

    // Place the slot inside the creator's area.
    const scope = await getAreaScope(req.user);
    let floor_id = null;
    let zone_id = req.body.zone_id || null;

    if (zone_id) {
      const { data: zone } = await supabase
        .from("parking_zones")
        .select("id, floor_id")
        .eq("id", zone_id)
        .maybeSingle();

      if (!zone || !floorInScope(scope, zone.floor_id)) {
        return res.status(403).json({
          success: false,
          message: "That zone is outside the area assigned to you."
        });
      }

      floor_id = zone.floor_id;
    } else if (!scope.unrestricted) {
      if (scope.floorIds.length !== 1) {
        return res.status(400).json({
          success: false,
          message:
            scope.floorIds.length === 0
              ? "No parking area has been assigned to you yet."
              : "You manage several floors. Add slots from Area Map so they land in the right zone."
        });
      }

      floor_id = scope.floorIds[0];
    }

    const { data, error } = await supabase
      .from("parking_slots")
      .insert([
        {
          slot_number,
          parking_type,
          floor_id,
          zone_id,
          created_by: req.user.id
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Create parking slot error:", error);

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(201).json({
      success: true,
      message: "Parking slot created successfully.",
      slot: data
    });
  } catch (error) {
    console.error("Create parking slot error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create parking slot."
    });
  }
};


const getParkingSlots = async (req, res) => {
  try {
    const { search, status, parking_type } = req.query;

    const scope = await getAreaScope(req.user);

    let slotQuery = applyFloorScope(
      supabase
        .from("parking_slots")
        .select("*, zone:parking_zones ( id, zone_name, zone_code )")
        .order("created_at", { ascending: false }),
      scope
    );

    if (status) {
      slotQuery = slotQuery.eq("status", status);
    }

    if (parking_type) {
      slotQuery = slotQuery.eq("parking_type", parking_type);
    }

    const { data: slots, error: slotError } = await slotQuery;

    if (slotError) {
      console.error("Get parking slots error:", slotError);

      return res.status(500).json({
        success: false,
        message: slotError.message
      });
    }

    const { data: sessions, error: sessionError } = await supabase
      .from("parking_sessions")
      .select(`
        id,
        ticket_code,
        parking_slot,
        parking_type,
        status,
        checked_in_at,
        parked_at,
        vehicle:vehicles (
          id,
          license_plate,
          make,
          model,
          color,
          customer:customers (
            id,
            name,
            phone,
            email
          )
        ),
        valet:employees (
          id,
          name,
          phone,
          role
        )
      `)
      .in("status", [
        "checked_in",
        "parked",
        "retrieval_requested",
        "retrieving",
        "ready_for_pickup"
      ]);

    if (sessionError) {
      console.error("Get active parking sessions error:", sessionError);

      return res.status(500).json({
        success: false,
        message: sessionError.message
      });
    }

    let result = slots.map((slot) => {
      const session = sessions.find(
        (item) => item.parking_slot === slot.slot_number
      );

      return {
        ...slot,
        assigned_vehicle: session?.vehicle?.license_plate || null,
        vehicle_make: session?.vehicle?.make || null,
        vehicle_model: session?.vehicle?.model || null,
        vehicle_color: session?.vehicle?.color || null,
        customer_name: session?.vehicle?.customer?.name || null,
        customer_phone: session?.vehicle?.customer?.phone || null,
        customer_email: session?.vehicle?.customer?.email || null,
        session_id: session?.id || null,
        session_ticket: session?.ticket_code || null,
        session_status: session?.status || null,
        checked_in_at: session?.checked_in_at || null,
        parked_at: session?.parked_at || null,
        // In-charge valet information
        incharge_valet_name: session?.valet?.name || "Unassigned",
        incharge_valet_phone: session?.valet?.phone || null,
        incharge_valet_role: session?.valet?.role || null,
        valet: session?.valet?.name || null
      };
    });

    if (search) {
      const searchTerm = search.toLowerCase();

      result = result.filter((slot) =>
        slot.slot_number?.toLowerCase().includes(searchTerm) ||
        slot.assigned_vehicle?.toLowerCase().includes(searchTerm) ||
        slot.customer_name?.toLowerCase().includes(searchTerm)
      );
    }

    return res.status(200).json({
      success: true,
      count: result.length,
      slots: result
    });

  } catch (error) {
    console.error("Get parking slots error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch parking slots."
    });
  }
};

const getParkingSlotById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!(await assertSlotAccess(req, res, id))) return;

    const { data, error } = await supabase
      .from("parking_slots")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Get parking slot by ID error:", error);

      return res.status(404).json({
        success: false,
        message: "Parking slot not found."
      });
    }

    return res.status(200).json({
      success: true,
      slot: data
    });
  } catch (error) {
    console.error("Get parking slot by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch parking slot."
    });
  }
};


const getValetParkingSlots = async (req, res) => {
  try {
    // A valet only sees the slots of the floor they are posted on.
    const post = await getValetPost(req.user);
    const floorId = post?.floor_id || null;

    if (!floorId) {
      return res.status(200).json({
        success: true,
        count: 0,
        slots: [],
        assignment: null
      });
    }

    const { data: slots, error } = await supabase
      .from("parking_slots")
      .select("*")
      .eq("floor_id", floorId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get valet parking slots error:", error);

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      count: slots?.length || 0,
      slots: slots || [],
      assignment: { floor: post.floor, post: post.post }
    });
  } catch (error) {
    console.error("Get valet parking slots error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch valet parking slots."
    });
  }
};

const updateParkingSlot = async (req, res) => {
  try {
    const { id } = req.params;

    if (!(await assertSlotAccess(req, res, id))) return;
    const { slot_number, parking_type } = req.body;

    if (!slot_number || !parking_type) {
      return res.status(400).json({
        success: false,
        message: "slot_number and parking_type are required."
      });
    }

    const { data, error } = await supabase
      .from("parking_slots")
      .update({
        slot_number,
        parking_type
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update parking slot error:", error);

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: "Parking slot updated successfully.",
      slot: data
    });
  } catch (error) {
    console.error("Update parking slot error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update parking slot."
    });
  }
};

const updateParkingSlotStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!(await assertSlotAccess(req, res, id))) return;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status is required."
      });
    }

    const allowedStatuses = ["available", "occupied", "maintenance"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Use available, occupied, or maintenance."
      });
    }

    const { data, error } = await supabase
      .from("parking_slots")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update parking slot status error:", error);

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: "Parking slot status updated successfully.",
      slot: data
    });
  } catch (error) {
    console.error("Update parking slot status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update parking slot status."
    });
  }
};

module.exports = {
  createParkingSlot,
  getParkingSlots,
  getValetParkingSlots,
  getParkingSlotById,
  updateParkingSlot,
  updateParkingSlotStatus
};
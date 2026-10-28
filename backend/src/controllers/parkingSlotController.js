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

const getParkingSlots = async (req, res) => {
  try {
    const { search, status, parking_type } = req.query;

    const scope = await getAreaScope(req.user);

    let slotQuery = applyFloorScope(
      supabase
        .from("parking_slots")
        .select("*")
        .order("slot_number", { ascending: true }),
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

    // Entry / exit gates of the floors in scope, shown beside the slot grid.
    const { data: gates, error: gatesError } = await applyFloorScope(
      supabase.from("parking_gates").select("*").order("gate_name"),
      scope
    );

    if (gatesError) {
      console.error("Get parking gates error:", gatesError);
    }

    return res.status(200).json({
      success: true,
      count: result.length,
      slots: result,
      gates: gates || []
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
    const post = await getValetPost(req.user);
    const floorId = post?.floor_id || null;

    if (!floorId) {
      return res.status(200).json({
        success: true,
        count: 0,
        slots: [],
        assignment: null,
        areaMap: null
      });
    }

    const [slotsResult, gatesResult] = await Promise.all([
      supabase
        .from("parking_slots")
        .select("*")
        .eq("floor_id", floorId)
        .order("slot_number", { ascending: true }),
      supabase
        .from("parking_gates")
        .select("*")
        .eq("floor_id", floorId)
        .order("gate_name")
    ]);

    for (const result of [slotsResult, gatesResult]) {
      if (result.error) {
        console.error("Get valet parking slots error:", result.error);

        return res.status(500).json({
          success: false,
          message: result.error.message
        });
      }
    }

    const slots = slotsResult.data || [];
    let sessions = [];

    if (slots.length > 0) {
      const { data, error } = await supabase
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
        .in("parking_slot", slots.map((slot) => slot.slot_number))
        .in("status", [
          "checked_in",
          "parked",
          "retrieval_requested",
          "retrieving",
          "ready_for_pickup"
        ]);

      if (error) {
        console.error("Get valet parking sessions error:", error);

        return res.status(500).json({
          success: false,
          message: error.message
        });
      }

      sessions = data || [];
    }

    const detailedSlots = slots.map((slot) => {
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
        incharge_valet_name: session?.valet?.name || "Unassigned",
        incharge_valet_phone: session?.valet?.phone || null,
        incharge_valet_role: session?.valet?.role || null,
        valet: session?.valet?.name || null
      };
    });

    return res.status(200).json({
      success: true,
      count: detailedSlots.length,
      slots: detailedSlots,
      assignment: { floor: post.floor, post: post.post },
      gates: gatesResult.data || []
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
  getParkingSlots,
  getValetParkingSlots,
  getParkingSlotById,
  updateParkingSlot,
  updateParkingSlotStatus
};
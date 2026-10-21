const supabase = require("../config/supabase");

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

    const { data, error } = await supabase
      .from("parking_slots")
      .insert([
        {
          slot_number,
          parking_type
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

    let slotQuery = supabase
      .from("parking_slots")
      .select("*")
      .order("created_at", { ascending: false });

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
        parking_slot,
        status,
        vehicle:vehicles (
          license_plate,
          customer:customers (
            name,
            phone
          )
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
        customer_name: session?.vehicle?.customer?.name || null,
        customer_phone: session?.vehicle?.customer?.phone || null,
        session_status: session?.status || null
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
    const { data: slots, error } = await supabase
      .from("parking_slots")
      .select("*")
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
      slots: slots || []
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
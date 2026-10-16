const supabase = require("../config/supabase");

const createParkingPosition = async (req, res) => {
  try {
    const {
      system_id,
      position_code,
      position_name,
      position_type
    } = req.body;

    if (!system_id || !position_code) {
      return res.status(400).json({
        success: false,
        message: "system_id and position_code are required."
      });
    }

    // Verify that the parking system exists
    const { data: system, error: systemError } = await supabase
      .from("parking_systems")
      .select("id, system_name, system_type, floor_id")
      .eq("id", system_id)
      .single();

    if (systemError || !system) {
      return res.status(404).json({
        success: false,
        message: "Parking system not found."
      });
    }

    const { data, error } = await supabase
      .from("parking_positions")
      .insert([
        {
          system_id,
          position_code,
          position_name: position_name || null,
          position_type: position_type || "standard"
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Create parking position error:", error);

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(201).json({
      success: true,
      message: "Parking position created successfully.",
      position: data
    });

  } catch (error) {
    console.error("Create parking position error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create parking position."
    });
  }
};


const getParkingPositions = async (req, res) => {
  try {
    const {
      system_id,
      status
    } = req.query;

    let query = supabase
      .from("parking_positions")
      .select(`
        id,
        system_id,
        position_code,
        position_name,
        position_type,
        status,
        created_at,
        parking_systems (
          id,
          system_name,
          system_type,
          floor_id
        )
      `)
      .order("created_at", { ascending: true });

    if (system_id) {
      query = query.eq("system_id", system_id);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Get parking positions error:", error);

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      count: data?.length || 0,
      positions: data || []
    });

  } catch (error) {
    console.error("Get parking positions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch parking positions."
    });
  }
};


module.exports = {
  createParkingPosition,
  getParkingPositions
};
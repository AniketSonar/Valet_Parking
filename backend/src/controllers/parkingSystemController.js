const supabase = require("../config/supabase");

const createParkingSystem = async (req, res) => {
  try {
    const {
      floor_id,
      system_name,
      system_type
    } = req.body;

    if (!floor_id || !system_name || !system_type) {
      return res.status(400).json({
        success: false,
        message: "floor_id, system_name and system_type are required."
      });
    }

    // Verify that the floor exists
    const { data: floor, error: floorError } = await supabase
      .from("parking_floors")
      .select("id, floor_name, floor_number")
      .eq("id", floor_id)
      .single();

    if (floorError || !floor) {
      return res.status(404).json({
        success: false,
        message: "Parking floor not found."
      });
    }

    const { data, error } = await supabase
      .from("parking_systems")
      .insert([
        {
          floor_id,
          system_name,
          system_type
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Create parking system error:", error);

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(201).json({
      success: true,
      message: "Parking system created successfully.",
      system: data
    });

  } catch (error) {
    console.error("Create parking system error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create parking system."
    });
  }
};


const getParkingSystems = async (req, res) => {
  try {
    const { floor_id } = req.query;

    let query = supabase
      .from("parking_systems")
      .select(`
        id,
        floor_id,
        system_name,
        system_type,
        status,
        created_at,
        parking_floors (
          floor_name,
          floor_number
        )
      `)
      .order("created_at", { ascending: true });

    if (floor_id) {
      query = query.eq("floor_id", floor_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Get parking systems error:", error);

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      count: data?.length || 0,
      systems: data || []
    });

  } catch (error) {
    console.error("Get parking systems error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch parking systems."
    });
  }
};


module.exports = {
  createParkingSystem,
  getParkingSystems
};
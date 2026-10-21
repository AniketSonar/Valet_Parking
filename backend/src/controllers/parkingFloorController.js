const supabase = require("../config/supabase");

const createParkingFloor = async (req, res) => {
  try {
    const { floor_name, floor_number } = req.body;

    if (!floor_name || floor_number === undefined) {
      return res.status(400).json({
        success: false,
        message: "floor_name and floor_number are required."
      });
    }

    const { data, error } = await supabase
      .from("parking_floors")
      .insert([
        {
          floor_name,
          floor_number
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Create parking floor error:", error);

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(201).json({
      success: true,
      message: "Parking floor created successfully.",
      floor: data
    });
  } catch (error) {
    console.error("Create parking floor error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create parking floor."
    });
  }
};


const getParkingFloors = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("parking_floors")
      .select("*")
      .order("floor_number", { ascending: true });

    if (error) {
      console.error("Get parking floors error:", error);

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      count: data?.length || 0,
      floors: data || []
    });
  } catch (error) {
    console.error("Get parking floors error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch parking floors."
    });
  }
};


module.exports = {
  createParkingFloor,
  getParkingFloors
};
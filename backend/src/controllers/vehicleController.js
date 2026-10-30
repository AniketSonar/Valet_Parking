const supabase = require("../config/supabase");

const createVehicle = async (req, res) => {
  try {
    const {
      customer_id,
      license_plate,
      make,
      model,
      color
    } = req.body;

    if (!customer_id || !license_plate) {
      return res.status(400).json({
        success: false,
        message: "Customer ID and license plate are required."
      });
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("id", customer_id)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found."
      });
    }

    const normalizedPlate = license_plate.trim().toUpperCase();

    const { data: existingVehicle, error: existingVehicleError } =
      await supabase
        .from("vehicles")
        .select("id, license_plate")
        .eq("license_plate", normalizedPlate)
        .maybeSingle();

    if (existingVehicleError) {
      return res.status(500).json({
        success: false,
        message: existingVehicleError.message
      });
    }

    if (existingVehicle) {
      return res.status(409).json({
        success: false,
        message: "A vehicle with this license plate already exists.",
        vehicle_id: existingVehicle.id
      });
    }

    const { data: vehicle, error } = await supabase
      .from("vehicles")
      .insert([
        {
          customer_id,
          license_plate: normalizedPlate,
          make: make?.trim() || null,
          model: model?.trim() || null,
          color: color?.trim() || null
        }
      ])
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    return res.status(201).json({
      success: true,
      message: "Vehicle registered successfully.",
      vehicle
    });
  } catch (error) {
    console.error("CREATE VEHICLE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = ["license_plate", "make", "model", "color"];
    const body = req.body || {};
    const updates = {};

    for (const field of allowedFields) {
      if (!Object.prototype.hasOwnProperty.call(body, field)) continue;

      const value = body[field];
      if (value !== null && typeof value !== "string") {
        return res.status(400).json({
          success: false,
          message: `${field} must be a string.`
        });
      }

      updates[field] = value?.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one vehicle field to update."
      });
    }

    if (Object.prototype.hasOwnProperty.call(updates, "license_plate")) {
      if (!updates.license_plate) {
        return res.status(400).json({
          success: false,
          message: "License plate is required."
        });
      }

      updates.license_plate = updates.license_plate.toUpperCase();

      const { data: existingVehicle, error: existingVehicleError } =
        await supabase
          .from("vehicles")
          .select("id")
          .eq("license_plate", updates.license_plate)
          .neq("id", id)
          .maybeSingle();

      if (existingVehicleError) {
        return res.status(500).json({
          success: false,
          message: existingVehicleError.message
        });
      }

      if (existingVehicle) {
        return res.status(409).json({
          success: false,
          message: "A vehicle with this license plate already exists."
        });
      }
    }

    const { data: vehicle, error } = await supabase
      .from("vehicles")
      .update(updates)
      .eq("id", id)
      .select(`
        id,
        customer_id,
        license_plate,
        make,
        model,
        color,
        created_at,
        customer:customers (
          id,
          name,
          phone,
          email
        )
      `)
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "A vehicle with this license plate already exists."
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle details updated successfully.",
      vehicle
    });
  } catch (error) {
    console.error("UPDATE VEHICLE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const getVehicles = async (req, res) => {
  try {
    const { search } = req.query;

    let query = supabase
      .from("vehicles")
      .select(`
        id,
        customer_id,
        license_plate,
        make,
        model,
        color,
        created_at,
        customer:customers (
          id,
          name,
          phone,
          email
        ),
        parking_sessions (
          id,
          ticket_code,
          status,
          parking_slot,
          checked_in_at
        )
      `)
      .order("license_plate", { ascending: true });

    const { data: vehicles, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    let result = (vehicles || []).map((vehicle) => {
      const activeSessions = (vehicle.parking_sessions || [])
        .filter((session) =>
          [
            "checked_in",
            "parked",
            "retrieval_requested",
            "retrieving",
            "ready_for_pickup"
          ].includes(session.status)
        )
        .sort(
          (first, second) =>
            new Date(second.checked_in_at || 0) -
            new Date(first.checked_in_at || 0)
        );

      const { parking_sessions, ...vehicleData } = vehicle;

      return {
        ...vehicleData,
        active_session: activeSessions[0] || null
      };
    });

    if (search) {
      const searchTerm = search.toLowerCase();

      result = result.filter((vehicle) => {
        const plate = vehicle.license_plate?.toLowerCase() || "";
        const make = vehicle.make?.toLowerCase() || "";
        const model = vehicle.model?.toLowerCase() || "";
        const customer = vehicle.customer?.name?.toLowerCase() || "";
        const phone = vehicle.customer?.phone?.toLowerCase() || "";

        return (
          plate.includes(searchTerm) ||
          make.includes(searchTerm) ||
          model.includes(searchTerm) ||
          customer.includes(searchTerm) ||
          phone.includes(searchTerm)
        );
      });
    }

    return res.status(200).json({
      success: true,
      count: result.length,
      vehicles: result
    });
  } catch (error) {
    console.error("GET VEHICLES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const getAllVehicles = getVehicles;

const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: vehicle, error } = await supabase
      .from("vehicles")
      .select(`
        id,
        customer_id,
        license_plate,
        make,
        model,
        color,
        created_at,
        customer:customers (
          id,
          name,
          phone,
          email
        )
      `)
      .eq("id", id)
      .single();

    if (error || !vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found."
      });
    }

    return res.status(200).json({
      success: true,
      vehicle
    });
  } catch (error) {
    console.error("GET VEHICLE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};


module.exports = {
  createVehicle,
  updateVehicle,
  getVehicles,
  getAllVehicles,
  getVehicleById
};
const supabase = require("../config/supabase");

const createStaffAssignment = async (req, res) => {
  try {
    const { user_id, floor_id, system_id } = req.body;

    if (!user_id || !floor_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and floor_id are required."
      });
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, name, email, role, is_active")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: "Staff user not found."
      });
    }

    if (!["valet", "valet_attendant", "reception_security", "cashier"].includes(user.role)) {
      return res.status(400).json({
        success: false,
        message: "This user cannot be assigned to parking operations."
      });
    }

    if (!user.is_active) {
      return res.status(400).json({
        success: false,
        message: "Staff user is inactive."
      });
    }

    const { data: floor, error: floorError } = await supabase
      .from("parking_floors")
      .select("id, floor_name, floor_number, status")
      .eq("id", floor_id)
      .single();

    if (floorError || !floor) {
      return res.status(404).json({
        success: false,
        message: "Parking floor not found."
      });
    }

    if (floor.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Parking floor is inactive."
      });
    }

    if (system_id) {
      const { data: system, error: systemError } = await supabase
        .from("parking_systems")
        .select("id, floor_id, system_name, system_type, status")
        .eq("id", system_id)
        .single();

      if (systemError || !system) {
        return res.status(404).json({
          success: false,
          message: "Parking system not found."
        });
      }

      if (system.floor_id !== floor_id) {
        return res.status(400).json({
          success: false,
          message: "Parking system does not belong to the selected floor."
        });
      }

      if (system.status !== "active") {
        return res.status(400).json({
          success: false,
          message: "Parking system is not active."
        });
      }
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from("staff_assignments")
      .insert([
        {
          user_id,
          floor_id,
          system_id: system_id || null
        }
      ])
      .select(`
        id,
        user_id,
        floor_id,
        system_id,
        assigned_at,
        is_active,
        users (
          id,
          name,
          email,
          role
        ),
        parking_floors (
          id,
          floor_name,
          floor_number
        ),
        parking_systems (
          id,
          system_name,
          system_type
        )
      `)
      .single();

    if (assignmentError) {
      return res.status(400).json({
        success: false,
        message: assignmentError.message
      });
    }

    return res.status(201).json({
      success: true,
      message: "Staff assigned successfully.",
      assignment
    });
  } catch (error) {
    console.error("Create staff assignment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create staff assignment."
    });
  }
};

const getStaffAssignments = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("staff_assignments")
      .select(`
        id,
        user_id,
        floor_id,
        system_id,
        assigned_at,
        is_active,
        users (
          id,
          name,
          email,
          role
        ),
        parking_floors (
          id,
          floor_name,
          floor_number
        ),
        parking_systems (
          id,
          system_name,
          system_type
        )
      `)
      .eq("is_active", true)
      .order("assigned_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      count: data?.length || 0,
      assignments: data || []
    });
  } catch (error) {
    console.error("Get staff assignments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch staff assignments."
    });
  }
};

const deactivateStaffAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("staff_assignments")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: "Staff assignment not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Staff assignment removed successfully.",
      assignment: data
    });
  } catch (error) {
    console.error("Deactivate staff assignment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove staff assignment."
    });
  }
};

module.exports = {
  createStaffAssignment,
  getStaffAssignments,
  deactivateStaffAssignment
};
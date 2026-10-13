const supabase = require("../config/supabase");

const getAllKeys = async (req, res) => {
  try {
    const { data: keys, error } = await supabase
      .from("keys")
      .select(`
        *,
        assigned_user:users!assigned_to(id, name, email, role),
        parking_session:parking_sessions(
          id,
          ticket_code,
          vehicle_id,
          status
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      count: keys.length,
      keys
    });
  } catch (error) {
    console.error("Get keys error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const getKeyById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: key, error } = await supabase
      .from("keys")
      .select(`
        *,
        assigned_user:users!assigned_to(id, name, email, role),
        parking_session:parking_sessions(
          id,
          ticket_code,
          vehicle_id,
          status
        )
      `)
      .eq("id", id)
      .single();

    if (error || !key) {
      return res.status(404).json({
        success: false,
        message: "Key not found."
      });
    }

    return res.status(200).json({
      success: true,
      key
    });
  } catch (error) {
    console.error("Get key error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const createKey = async (req, res) => {
  try {
    const { key_number, key_location, status, notes } = req.body;

    const validStatuses = ["available", "stored", "assigned", "in_use", "returned", "lost"];

    if (!key_number) {
      return res.status(400).json({
        success: false,
        message: "Key number is required."
      });
    }

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid key status."
      });
    }

    const { data: existingKey, error: existingError } = await supabase
      .from("keys")
      .select("id")
      .eq("key_number", key_number)
      .maybeSingle();

    if (existingError) {
      return res.status(400).json({
        success: false,
        message: existingError.message
      });
    }

    if (existingKey) {
      return res.status(400).json({
        success: false,
        message: "Key number already exists."
      });
    }

    const { data: key, error } = await supabase
      .from("keys")
      .insert([
        {
          key_number,
          key_location: key_location || null,
          status: status || "available",
          notes: notes || null
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

    return res.status(201).json({
      success: true,
      message: "Key registered successfully.",
      key
    });
  } catch (error) {
    console.error("Create key error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const updateKey = async (req, res) => {
  try {
    const { id } = req.params;
    const { key_location, status, notes } = req.body;

    const validStatuses = ["available", "stored", "assigned", "in_use", "returned", "lost"];

    if (status !== undefined && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid key status."
      });
    }

    const { data: existingKey, error: fetchError } = await supabase
      .from("keys")
      .select("id, status, assigned_to, parking_session_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingKey) {
      return res.status(404).json({
        success: false,
        message: "Key not found."
      });
    }

    const updates = {};

    if (key_location !== undefined) {
      updates.key_location = key_location;
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    if (status !== undefined) {
      if (status === "assigned" && !existingKey.assigned_to) {
        return res.status(400).json({
          success: false,
          message: "A key cannot be marked as assigned without a valet."
        });
      }

      if (status === "lost") {
        updates.assigned_to = null;
      }

      if (status === "available" || status === "stored" || status === "returned") {
        updates.assigned_to = null;
      }

      updates.status = status;
    }

    updates.updated_at = new Date().toISOString();

    const { data: key, error } = await supabase
      .from("keys")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error || !key) {
      return res.status(400).json({
        success: false,
        message: error?.message || "Failed to update key."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Key updated successfully.",
      key
    });
  } catch (error) {
    console.error("Update key error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const assignKey = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to, parking_session_id } = req.body;

    if (!assigned_to) {
      return res.status(400).json({
        success: false,
        message: "Valet user ID is required."
      });
    }

    const { data: valet, error: valetError } = await supabase
      .from("users")
      .select("id, name, role, is_active")
      .eq("id", assigned_to)
      .eq("role", "valet")
      .single();

    if (valetError || !valet) {
      return res.status(404).json({
        success: false,
        message: "Valet not found."
      });
    }

    if (!valet.is_active) {
      return res.status(400).json({
        success: false,
        message: "Valet is inactive."
      });
    }

    const { data: key, error } = await supabase
      .from("keys")
      .update({
        assigned_to,
        parking_session_id: parking_session_id || null,
        status: "assigned",
        assigned_at: new Date().toISOString(),
        returned_at: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !key) {
      return res.status(404).json({
        success: false,
        message: "Key not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Key assigned successfully.",
      key
    });
  } catch (error) {
    console.error("Assign key error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const returnKey = async (req, res) => {
  try {
    const { id } = req.params;
    const { key_location, notes } = req.body;

    const { data: key, error } = await supabase
      .from("keys")
      .update({
        assigned_to: null,
        status: "returned",
        key_location: key_location || null,
        returned_at: new Date().toISOString(),
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !key) {
      return res.status(404).json({
        success: false,
        message: "Key not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Key returned successfully.",
      key
    });
  } catch (error) {
    console.error("Return key error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const markKeyLost = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const { data: key, error: keyError } = await supabase
      .from("keys")
      .select("id, key_number, status, assigned_to, parking_session_id")
      .eq("id", id)
      .single();

    if (keyError || !key) {
      return res.status(404).json({
        success: false,
        message: "Key not found."
      });
    }

    if (key.status === "lost") {
      return res.status(400).json({
        success: false,
        message: "Key is already marked as lost."
      });
    }

    if (key.status === "returned") {
      return res.status(400).json({
        success: false,
        message: "A returned key cannot be marked as lost."
      });
    }

    const updatedAt = new Date().toISOString();

    const { data: updatedKey, error: updateError } = await supabase
      .from("keys")
      .update({
        status: "lost",
        assigned_to: null,
        notes: notes || null,
        updated_at: updatedAt
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError || !updatedKey) {
      return res.status(400).json({
        success: false,
        message: updateError?.message || "Failed to mark key as lost."
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
        parking_session_id: key.parking_session_id || null,
        recipient_type: admin.role,
        recipient_id: admin.id,
        message: `Key ${key.key_number} has been marked as lost.${notes ? ` Notes: ${notes}` : ""}`,
        channel: "in_app",
        status: "sent",
        sent_at: updatedAt
      }));

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notificationError) {
        console.error("Lost key notification error:", notificationError);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Key marked as lost successfully.",
      key: updatedKey
    });
  } catch (error) {
    console.error("Mark key lost error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};
const getKeyHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: key, error } = await supabase
      .from("keys")
      .select(`
        *,
        assigned_user:users!assigned_to(id, name, email, role),
        parking_session:parking_sessions(
          id,
          ticket_code,
          vehicle_id,
          status
        )
      `)
      .eq("id", id)
      .single();

    if (error || !key) {
      return res.status(404).json({
        success: false,
        message: "Key not found."
      });
    }

    return res.status(200).json({
      success: true,
      history: {
        key_id: key.id,
        key_number: key.key_number,
        status: key.status,
        key_location: key.key_location,
        assigned_to: key.assigned_user,
        parking_session: key.parking_session,
        assigned_at: key.assigned_at,
        returned_at: key.returned_at,
        notes: key.notes,
        created_at: key.created_at,
        updated_at: key.updated_at
      }
    });
  } catch (error) {
    console.error("Get key history error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const getKeyBySession = async (req, res) => {
  try {
    const { session_id } = req.params;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: "Parking session ID is required."
      });
    }

    const { data: key, error } = await supabase
      .from("keys")
      .select(`
        *,
        assigned_user:users!assigned_to(id, name, email, role),
        parking_session:parking_sessions(
          id,
          ticket_code,
          vehicle_id,
          status
        )
      `)
      .eq("parking_session_id", session_id)
      .maybeSingle();

    if (error) {
      console.error("Get key by session error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch key."
      });
    }

    if (!key) {
      return res.status(404).json({
        success: false,
        message: "Key not found for this parking session."
      });
    }

    return res.status(200).json({
      success: true,
      data: key
    });
  } catch (error) {
    console.error("Get key by session error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};
module.exports = {
  getAllKeys,
  getKeyById,
  getKeyBySession,
  createKey,
  updateKey,
  assignKey,
  returnKey,
  markKeyLost,
  getKeyHistory
};
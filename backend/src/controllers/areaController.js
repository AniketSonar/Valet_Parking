const supabase = require("../config/supabase");
const {
  getAreaScope,
  floorInScope,
  applyFloorScope,
  getValetPost
} = require("../utils/areaScope");

/* ------------------------------------------------------------------------
   helpers
   ------------------------------------------------------------------------ */

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const handle = (name, fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    console.error(`${name} error:`, error);
    return fail(res, 500, error.message || `Failed to ${name}.`);
  }
};

const SLOT_TYPES = ["car", "bike", "truck"];
const GATE_TYPES = ["entry", "exit", "entry_exit"];
const SIDES = ["front", "back", "left", "right"];

const FLOOR_SELECT = `
  id, floor_name, floor_number, status, building_id,
  building:parking_buildings ( id, building_name, address )
`;

/** Loads a row and checks the caller may manage its floor. */
const loadScoped = async (req, res, table, id, select = "*") => {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    fail(res, 404, "Record not found.");
    return null;
  }

  const scope = await getAreaScope(req.user);

  if (!floorInScope(scope, data.floor_id)) {
    fail(res, 403, "This record is outside the area assigned to you.");
    return null;
  }

  return { row: data, scope };
};

/* ========================================================================
   SUPER ADMIN — buildings, floors, manager assignment
   ======================================================================== */

const getBuildings = handle("fetch buildings", async (req, res) => {
  const { data, error } = await supabase
    .from("parking_buildings")
    .select("*")
    .order("building_name", { ascending: true });

  if (error) throw error;

  return res.json({ success: true, buildings: data || [] });
});

const createBuilding = handle("create building", async (req, res) => {
  const building_name = String(req.body.building_name || "").trim();
  const address = String(req.body.address || "").trim() || null;

  if (!building_name) return fail(res, 400, "building_name is required.");

  const { data, error } = await supabase
    .from("parking_buildings")
    .insert([{ building_name, address }])
    .select()
    .single();

  if (error) return fail(res, 400, error.message);

  return res.status(201).json({ success: true, building: data });
});

const getFloors = handle("fetch floors", async (req, res) => {
  const scope = await getAreaScope(req.user);

  let query = supabase
    .from("parking_floors")
    .select(FLOOR_SELECT)
    .order("floor_number", { ascending: true });

  query = applyFloorScope(query, scope, "id");

  const { data: floors, error } = await query;
  if (error) throw error;

  const { data: assignments, error: assignmentError } = await supabase
    .from("manager_assignments")
    .select("id, floor_id, manager:users!manager_assignments_manager_id_fkey ( id, name, email )")
    .eq("is_active", true);

  if (assignmentError) throw assignmentError;

  const byFloor = new Map((assignments || []).map((a) => [a.floor_id, a]));

  return res.json({
    success: true,
    floors: (floors || []).map((floor) => ({
      ...floor,
      assignment_id: byFloor.get(floor.id)?.id || null,
      manager: byFloor.get(floor.id)?.manager || null
    }))
  });
});

const createFloor = handle("create floor", async (req, res) => {
  const floor_name = String(req.body.floor_name || "").trim();
  const floor_number = Number(req.body.floor_number);
  const building_id = req.body.building_id || null;

  if (!floor_name || !Number.isInteger(floor_number)) {
    return fail(res, 400, "floor_name and an integer floor_number are required.");
  }

  const { data, error } = await supabase
    .from("parking_floors")
    .insert([{ floor_name, floor_number, building_id }])
    .select(FLOOR_SELECT)
    .single();

  if (error) return fail(res, 400, error.message);

  return res.status(201).json({ success: true, floor: data });
});

const getManagers = handle("fetch managers", async (req, res) => {
  const { data: managers, error } = await supabase
    .from("users")
    .select("id, name, email, phone, is_active")
    .in("role", ["manager", "parking_admin"])
    .order("name", { ascending: true });

  if (error) throw error;

  const { data: assignments, error: assignmentError } = await supabase
    .from("manager_assignments")
    .select(`
      id, manager_id, floor_id, assigned_at,
      floor:parking_floors ( id, floor_name, floor_number, building:parking_buildings ( building_name ) )
    `)
    .eq("is_active", true);

  if (assignmentError) throw assignmentError;

  return res.json({
    success: true,
    managers: (managers || []).map((manager) => ({
      ...manager,
      assignments: (assignments || []).filter((a) => a.manager_id === manager.id)
    }))
  });
});

const assignManagerToFloor = handle("assign manager", async (req, res) => {
  const { manager_id, floor_id } = req.body;

  if (!manager_id || !floor_id) {
    return fail(res, 400, "manager_id and floor_id are required.");
  }

  const { data: manager } = await supabase
    .from("users")
    .select("id, role, is_active")
    .eq("id", manager_id)
    .maybeSingle();

  if (!manager || !["manager", "parking_admin"].includes(manager.role)) {
    return fail(res, 404, "Manager not found.");
  }

  if (!manager.is_active) return fail(res, 400, "Manager is inactive.");

  const { data: floor } = await supabase
    .from("parking_floors")
    .select("id, status")
    .eq("id", floor_id)
    .maybeSingle();

  if (!floor) return fail(res, 404, "Floor not found.");
  if (floor.status !== "active") return fail(res, 400, "Floor is inactive.");

  const { data: existing } = await supabase
    .from("manager_assignments")
    .select("id, manager_id")
    .eq("floor_id", floor_id)
    .eq("is_active", true)
    .maybeSingle();

  if (existing && existing.manager_id === manager_id) {
    return fail(res, 409, "This manager already has that floor.");
  }

  const { data: previousSlots, error: previousSlotsError } = await supabase
    .from("parking_slots")
    .select("id, status")
    .eq("floor_id", floor_id);

  if (previousSlotsError) throw previousSlotsError;

  const blockedSlots = (previousSlots || []).filter((slot) => slot.status !== "available");
  if (blockedSlots.length) {
    return fail(
      res,
      409,
      "This floor has occupied or maintenance slots. Clear those slots before assigning the floor to another manager."
    );
  }

  if (previousSlots?.length) {
    const { error: deleteSlotsError } = await supabase
      .from("parking_slots")
      .delete()
      .in("id", previousSlots.map((slot) => slot.id));

    if (deleteSlotsError) throw deleteSlotsError;
  }

  // A floor has one manager at a time: re-assigning moves it.
  if (existing) {
    await supabase
      .from("manager_assignments")
      .update({ is_active: false })
      .eq("id", existing.id);
  }

  const { data, error } = await supabase
    .from("manager_assignments")
    .insert([{ manager_id, floor_id, assigned_by: req.user.id }])
    .select()
    .single();

  if (error) return fail(res, 400, error.message);

  return res.status(201).json({
    success: true,
    message: existing
      ? "Floor moved to the new manager. Previous slots were removed."
      : previousSlots?.length
        ? "Floor assigned to manager. Previous slots were removed."
        : "Floor assigned to manager.",
    assignment: data
  });
});

const removeManagerAssignment = handle("remove manager assignment", async (req, res) => {
  const { data, error } = await supabase
    .from("manager_assignments")
    .update({ is_active: false })
    .eq("id", req.params.id)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) return fail(res, 404, "Assignment not found.");

  // valets standing on that floor lose their posts with the manager
  await supabase
    .from("valet_assignments")
    .update({ is_active: false })
    .eq("floor_id", data.floor_id)
    .eq("is_active", true);

  return res.json({ success: true, message: "Manager removed from floor." });
});

const getUnassignedSlots = handle("fetch unassigned slots", async (req, res) => {
  const { data, error } = await supabase
    .from("parking_slots")
    .select("id, slot_number, parking_type, status")
    .is("floor_id", null)
    .order("slot_number", { ascending: true });

  if (error) throw error;

  return res.json({ success: true, slots: data || [] });
});

const assignSlotsToFloor = handle("assign slots to floor", async (req, res) => {
  const { slot_ids, floor_id } = req.body;

  if (!Array.isArray(slot_ids) || slot_ids.length === 0 || !floor_id) {
    return fail(res, 400, "slot_ids and floor_id are required.");
  }

  const { data, error } = await supabase
    .from("parking_slots")
    .update({ floor_id, zone_id: null, map_row: null, map_col: null })
    .in("id", slot_ids)
    .select("id");

  if (error) return fail(res, 400, error.message);

  return res.json({ success: true, updated: data?.length || 0 });
});

/* ========================================================================
   MANAGER — area overview + map
   ======================================================================== */

const getMyAreas = handle("fetch assigned areas", async (req, res) => {
  const scope = await getAreaScope(req.user);

  let query = supabase
    .from("parking_floors")
    .select(FLOOR_SELECT)
    .order("floor_number", { ascending: true });

  query = applyFloorScope(query, scope, "id");

  const { data, error } = await query;
  if (error) throw error;

  return res.json({ success: true, floors: data || [], unrestricted: scope.unrestricted });
});

const getFloorMap = handle("fetch floor map", async (req, res) => {
  const { floorId } = req.params;
  const scope = await getAreaScope(req.user);

  if (!floorInScope(scope, floorId)) {
    return fail(res, 403, "This floor is not assigned to you.");
  }

  const [floorRes, zonesRes, slotsRes, gatesRes, postsRes, assignRes, sessionsRes] =
    await Promise.all([
      supabase.from("parking_floors").select(FLOOR_SELECT).eq("id", floorId).maybeSingle(),
      supabase.from("parking_zones").select("*").eq("floor_id", floorId).order("zone_code"),
      supabase
        .from("parking_slots")
        .select("id, slot_number, parking_type, status, zone_id, map_row, map_col")
        .eq("floor_id", floorId),
      supabase.from("parking_gates").select("*").eq("floor_id", floorId).order("gate_name"),
      supabase.from("valet_posts").select("*").eq("floor_id", floorId).order("post_name"),
      supabase
        .from("valet_assignments")
        .select("id, post_id, valet:employees ( id, name, phone, email )")
        .eq("floor_id", floorId)
        .eq("is_active", true),
      supabase
        .from("parking_sessions")
        .select("parking_slot, status, vehicle:vehicles ( license_plate )")
        .in("status", ["checked_in", "parked", "retrieval_requested", "retrieving", "ready_for_pickup"])
        .not("parking_slot", "is", null)
    ]);

  for (const result of [floorRes, zonesRes, slotsRes, gatesRes, postsRes, assignRes, sessionsRes]) {
    if (result.error) throw result.error;
  }

  if (!floorRes.data) return fail(res, 404, "Floor not found.");

  const plateBySlot = new Map(
    (sessionsRes.data || []).map((s) => [s.parking_slot, s.vehicle?.license_plate || null])
  );

  const slots = (slotsRes.data || []).map((slot) => ({
    ...slot,
    vehicle: plateBySlot.get(slot.slot_number) || null
  }));

  const posts = (postsRes.data || []).map((post) => ({
    ...post,
    valets: (assignRes.data || [])
      .filter((a) => a.post_id === post.id)
      .map((a) => ({ assignment_id: a.id, ...a.valet }))
  }));

  return res.json({
    success: true,
    floor: floorRes.data,
    zones: zonesRes.data || [],
    slots,
    gates: gatesRes.data || [],
    posts
  });
});

const removePreviousSlots = handle("remove all slots", async (req, res) => {
  const { floorId } = req.params;
  const scope = await getAreaScope(req.user);

  if (!floorInScope(scope, floorId)) {
    return fail(res, 403, "This floor is not assigned to you.");
  }

  const { data: slots, error: slotsError } = await supabase
    .from("parking_slots")
    .select("id")
    .eq("floor_id", floorId);

  if (slotsError) throw slotsError;

  if (slots?.length) {
    const { error: deleteError } = await supabase
      .from("parking_slots")
      .delete()
      .in("id", slots.map((slot) => slot.id));

    if (deleteError) throw deleteError;
  }

  return res.json({
    success: true,
    deleted: slots?.length || 0,
    message: slots?.length
      ? `${slots.length} slot${slots.length === 1 ? "" : "s"} removed.`
      : "No slots found."
  });
});

/* ------------------------------ zones ----------------------------------- */

const createZone = handle("create zone", async (req, res) => {
  const { floor_id } = req.body;
  const zone_name = String(req.body.zone_name || "").trim();
  const zone_code = String(req.body.zone_code || "").trim().toUpperCase();
  const map_rows = Number(req.body.map_rows || 4);
  const map_cols = Number(req.body.map_cols || 6);

  if (!floor_id || !zone_name || !zone_code) {
    return fail(res, 400, "floor_id, zone_name and zone_code are required.");
  }

  if (![map_rows, map_cols].every((n) => Number.isInteger(n) && n >= 1 && n <= 40)) {
    return fail(res, 400, "map_rows and map_cols must be whole numbers from 1 to 40.");
  }

  const scope = await getAreaScope(req.user);
  if (!floorInScope(scope, floor_id)) {
    return fail(res, 403, "This floor is not assigned to you.");
  }

  const { data, error } = await supabase
    .from("parking_zones")
    .insert([{ floor_id, zone_name, zone_code, map_rows, map_cols, created_by: req.user.id }])
    .select()
    .single();

  if (error) return fail(res, 400, error.message);

  return res.status(201).json({ success: true, zone: data });
});

const updateZone = handle("update zone", async (req, res) => {
  const loaded = await loadScoped(req, res, "parking_zones", req.params.id);
  if (!loaded) return;

  const patch = {};
  if (req.body.zone_name) patch.zone_name = String(req.body.zone_name).trim();
  if (req.body.status && ["active", "inactive"].includes(req.body.status)) {
    patch.status = req.body.status;
  }

  for (const key of ["map_rows", "map_cols"]) {
    if (req.body[key] === undefined) continue;
    const value = Number(req.body[key]);
    if (!Number.isInteger(value) || value < 1 || value > 40) {
      return fail(res, 400, `${key} must be a whole number from 1 to 40.`);
    }
    patch[key] = value;
  }

  if (patch.map_rows || patch.map_cols) {
    const rows = patch.map_rows || loaded.row.map_rows;
    const cols = patch.map_cols || loaded.row.map_cols;

    const { count } = await supabase
      .from("parking_slots")
      .select("id", { count: "exact", head: true })
      .eq("zone_id", loaded.row.id)
      .or(`map_row.gte.${rows},map_col.gte.${cols}`);

    if (count) {
      return fail(res, 400, "Some slots sit outside the smaller map. Remove them first.");
    }
  }

  const { data, error } = await supabase
    .from("parking_zones")
    .update(patch)
    .eq("id", loaded.row.id)
    .select()
    .single();

  if (error) return fail(res, 400, error.message);

  return res.json({ success: true, zone: data });
});

const deleteZone = handle("delete zone", async (req, res) => {
  const loaded = await loadScoped(req, res, "parking_zones", req.params.id);
  if (!loaded) return;

  const { data: slots } = await supabase
    .from("parking_slots")
    .select("id, status")
    .eq("zone_id", loaded.row.id);

  if ((slots || []).some((slot) => slot.status !== "available")) {
    return fail(res, 400, "This zone still has occupied or maintenance slots.");
  }

  if (slots?.length) {
    await supabase.from("parking_slots").delete().in("id", slots.map((s) => s.id));
  }

  const { error } = await supabase.from("parking_zones").delete().eq("id", loaded.row.id);
  if (error) throw error;

  return res.json({ success: true, message: "Zone removed." });
});

/* ------------------------------ slots ----------------------------------- */

const createSlotOnMap = handle("create slot", async (req, res) => {
  const loaded = await loadScoped(req, res, "parking_zones", req.params.id);
  if (!loaded) return;

  const zone = loaded.row;
  const slot_number = String(req.body.slot_number || "").trim().toUpperCase();
  const parking_type = req.body.parking_type || "car";
  const map_row = Number(req.body.map_row);
  const map_col = Number(req.body.map_col);

  if (!slot_number) return fail(res, 400, "slot_number is required.");
  if (!SLOT_TYPES.includes(parking_type)) return fail(res, 400, "Use car, bike or truck.");

  if (
    !Number.isInteger(map_row) || !Number.isInteger(map_col) ||
    map_row < 0 || map_col < 0 || map_row >= zone.map_rows || map_col >= zone.map_cols
  ) {
    return fail(res, 400, "That cell is outside the zone map.");
  }

  const { data, error } = await supabase
    .from("parking_slots")
    .insert([{
      slot_number,
      parking_type,
      floor_id: zone.floor_id,
      zone_id: zone.id,
      map_row,
      map_col,
      created_by: req.user.id
    }])
    .select()
    .single();

  if (error) {
    return fail(
      res,
      400,
      error.code === "23505" ? "That slot number or map cell is already used." : error.message
    );
  }

  return res.status(201).json({ success: true, slot: data });
});

const generateSlots = handle("generate slots", async (req, res) => {
  const loaded = await loadScoped(req, res, "parking_zones", req.params.id);
  if (!loaded) return;

  const zone = loaded.row;
  const prefix = String(req.body.prefix || zone.zone_code).trim().toUpperCase();
  const parking_type = req.body.parking_type || "car";

  if (!prefix) return fail(res, 400, "prefix is required.");
  if (!SLOT_TYPES.includes(parking_type)) return fail(res, 400, "Use car, bike or truck.");

  const { data: existing, error } = await supabase
    .from("parking_slots")
    .select("map_row, map_col")
    .eq("zone_id", zone.id);

  if (error) throw error;

  const taken = new Set((existing || []).map((s) => `${s.map_row}:${s.map_col}`));
  const rows = [];
  let counter = (existing || []).length;

  for (let r = 0; r < zone.map_rows; r += 1) {
    for (let c = 0; c < zone.map_cols; c += 1) {
      if (taken.has(`${r}:${c}`)) continue;
      counter += 1;
      rows.push({
        slot_number: `${prefix}-${String(counter).padStart(2, "0")}`,
        parking_type,
        floor_id: zone.floor_id,
        zone_id: zone.id,
        map_row: r,
        map_col: c,
        created_by: req.user.id
      });
    }
  }

  if (rows.length === 0) return fail(res, 400, "Every cell of this zone already has a slot.");

  const { data: clash } = await supabase
    .from("parking_slots")
    .select("slot_number")
    .in("slot_number", rows.map((r) => r.slot_number));

  if (clash?.length) {
    return fail(
      res,
      409,
      `Slot numbers already exist (${clash.slice(0, 3).map((c) => c.slot_number).join(", ")}). Use a different prefix.`
    );
  }

  const { error: insertError } = await supabase.from("parking_slots").insert(rows);
  if (insertError) return fail(res, 400, insertError.message);

  return res.status(201).json({ success: true, created: rows.length });
});

const deleteSlot = handle("delete slot", async (req, res) => {
  const loaded = await loadScoped(req, res, "parking_slots", req.params.id);
  if (!loaded) return;

  if (loaded.row.status !== "available") {
    return fail(res, 400, "Only available slots can be removed.");
  }

  const { error } = await supabase.from("parking_slots").delete().eq("id", loaded.row.id);
  if (error) throw error;

  return res.json({ success: true, message: "Slot removed." });
});

/* ------------------------------ gates ----------------------------------- */

const createGate = handle("create gate", async (req, res) => {
  const { floor_id, zone_id } = req.body;
  const gate_name = String(req.body.gate_name || "").trim();
  const gate_type = req.body.gate_type || "entry_exit";
  const side = req.body.side || "front";

  if (!floor_id || !gate_name) return fail(res, 400, "floor_id and gate_name are required.");
  if (!GATE_TYPES.includes(gate_type)) return fail(res, 400, "Invalid gate_type.");
  if (!SIDES.includes(side)) return fail(res, 400, "Invalid side.");

  const scope = await getAreaScope(req.user);
  if (!floorInScope(scope, floor_id)) {
    return fail(res, 403, "This floor is not assigned to you.");
  }

  const { data, error } = await supabase
    .from("parking_gates")
    .insert([{ floor_id, zone_id: zone_id || null, gate_name, gate_type, side, created_by: req.user.id }])
    .select()
    .single();

  if (error) {
    return fail(res, 400, error.code === "23505" ? "A gate with that name already exists." : error.message);
  }

  return res.status(201).json({ success: true, gate: data });
});

const updateGate = handle("update gate", async (req, res) => {
  const loaded = await loadScoped(req, res, "parking_gates", req.params.id);
  if (!loaded) return;

  const patch = {};
  if (req.body.gate_name) patch.gate_name = String(req.body.gate_name).trim();
  if (req.body.gate_type) {
    if (!GATE_TYPES.includes(req.body.gate_type)) return fail(res, 400, "Invalid gate_type.");
    patch.gate_type = req.body.gate_type;
  }
  if (req.body.side) {
    if (!SIDES.includes(req.body.side)) return fail(res, 400, "Invalid side.");
    patch.side = req.body.side;
  }
  if (req.body.status && ["active", "inactive"].includes(req.body.status)) {
    patch.status = req.body.status;
  }

  const { data, error } = await supabase
    .from("parking_gates")
    .update(patch)
    .eq("id", loaded.row.id)
    .select()
    .single();

  if (error) return fail(res, 400, error.message);

  return res.json({ success: true, gate: data });
});

const deleteGate = handle("delete gate", async (req, res) => {
  const loaded = await loadScoped(req, res, "parking_gates", req.params.id);
  if (!loaded) return;

  const { error } = await supabase.from("parking_gates").delete().eq("id", loaded.row.id);
  if (error) throw error;

  return res.json({ success: true, message: "Gate removed." });
});

/* ------------------------------ valet posts ------------------------------ */

const createPost = handle("create valet post", async (req, res) => {
  const { floor_id, gate_id } = req.body;
  const post_name = String(req.body.post_name || "").trim();
  const capacity = Number(req.body.capacity || 1);

  if (!floor_id || !post_name) return fail(res, 400, "floor_id and post_name are required.");
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) {
    return fail(res, 400, "capacity must be a whole number from 1 to 50.");
  }

  const scope = await getAreaScope(req.user);
  if (!floorInScope(scope, floor_id)) {
    return fail(res, 403, "This floor is not assigned to you.");
  }

  if (gate_id) {
    const { data: gate } = await supabase
      .from("parking_gates")
      .select("id, floor_id")
      .eq("id", gate_id)
      .maybeSingle();

    if (!gate || gate.floor_id !== floor_id) {
      return fail(res, 400, "That gate does not belong to this floor.");
    }
  }

  const { data, error } = await supabase
    .from("valet_posts")
    .insert([{ floor_id, gate_id: gate_id || null, post_name, capacity, created_by: req.user.id }])
    .select()
    .single();

  if (error) {
    return fail(res, 400, error.code === "23505" ? "A post with that name already exists." : error.message);
  }

  return res.status(201).json({ success: true, post: data });
});

const updatePost = handle("update valet post", async (req, res) => {
  const loaded = await loadScoped(req, res, "valet_posts", req.params.id);
  if (!loaded) return;

  const patch = {};
  if (req.body.post_name) patch.post_name = String(req.body.post_name).trim();
  if (req.body.gate_id !== undefined) patch.gate_id = req.body.gate_id || null;

  if (req.body.capacity !== undefined) {
    const capacity = Number(req.body.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) {
      return fail(res, 400, "capacity must be a whole number from 1 to 50.");
    }

    const { count } = await supabase
      .from("valet_assignments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", loaded.row.id)
      .eq("is_active", true);

    if (count > capacity) {
      return fail(res, 400, `${count} valets already stand here. Move some before lowering capacity.`);
    }

    patch.capacity = capacity;
  }

  const { data, error } = await supabase
    .from("valet_posts")
    .update(patch)
    .eq("id", loaded.row.id)
    .select()
    .single();

  if (error) return fail(res, 400, error.message);

  return res.json({ success: true, post: data });
});

const deletePost = handle("delete valet post", async (req, res) => {
  const loaded = await loadScoped(req, res, "valet_posts", req.params.id);
  if (!loaded) return;

  const { error } = await supabase.from("valet_posts").delete().eq("id", loaded.row.id);
  if (error) throw error;

  return res.json({ success: true, message: "Post removed." });
});

/* ------------------------------ valet assignment ------------------------- */

const getAssignableValets = handle("fetch valets", async (req, res) => {
  const scope = await getAreaScope(req.user);

  const [{ data: valets, error }, { data: assignments, error: assignError }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, name, phone, email")
      .eq("role", "valet")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("valet_assignments")
      .select(`
        id, valet_id, post_id, floor_id,
        post:valet_posts ( post_name ),
        floor:parking_floors ( floor_name )
      `)
      .eq("is_active", true)
  ]);

  if (error) throw error;
  if (assignError) throw assignError;

  const byValet = new Map((assignments || []).map((a) => [a.valet_id, a]));

  return res.json({
    success: true,
    valets: (valets || []).map((valet) => {
      const current = byValet.get(valet.id) || null;
      const elsewhere = current && !floorInScope(scope, current.floor_id);

      return {
        ...valet,
        assignment: current
          ? {
              id: current.id,
              post_id: current.post_id,
              post_name: current.post?.post_name || null,
              floor_name: current.floor?.floor_name || null,
              in_my_area: !elsewhere
            }
          : null,
        // valets already working another manager's floor cannot be taken
        assignable: !elsewhere
      };
    })
  });
});

const assignValetToPost = handle("assign valet to post", async (req, res) => {
  const { valet_id, post_id } = req.body;

  if (!valet_id || !post_id) return fail(res, 400, "valet_id and post_id are required.");

  const loaded = await loadScoped(req, res, "valet_posts", post_id);
  if (!loaded) return;

  const { row: post, scope } = loaded;

  if (post.status !== "active") return fail(res, 400, "This post is inactive.");

  const { data: valet } = await supabase
    .from("employees")
    .select("id, is_active")
    .eq("id", valet_id)
    .eq("role", "valet")
    .maybeSingle();

  if (!valet) return fail(res, 404, "Valet not found.");
  if (!valet.is_active) return fail(res, 400, "Valet is inactive.");

  const { data: current } = await supabase
    .from("valet_assignments")
    .select("id, post_id, floor_id")
    .eq("valet_id", valet_id)
    .eq("is_active", true)
    .maybeSingle();

  if (current && current.post_id === post_id) {
    return fail(res, 409, "This valet already stands at that post.");
  }

  if (current && !floorInScope(scope, current.floor_id)) {
    return fail(res, 409, "This valet is assigned to another manager's area.");
  }

  const { count } = await supabase
    .from("valet_assignments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", post_id)
    .eq("is_active", true);

  if (count >= post.capacity) {
    return fail(res, 400, `${post.post_name} is full (${post.capacity}/${post.capacity}).`);
  }

  if (current) {
    await supabase.from("valet_assignments").update({ is_active: false }).eq("id", current.id);
  }

  const { data, error } = await supabase
    .from("valet_assignments")
    .insert([{ valet_id, post_id, floor_id: post.floor_id, assigned_by: req.user.id }])
    .select()
    .single();

  if (error) return fail(res, 400, error.message);

  return res.status(201).json({
    success: true,
    message: current ? "Valet moved to the new post." : "Valet assigned.",
    assignment: data
  });
});

const removeValetAssignment = handle("remove valet assignment", async (req, res) => {
  const loaded = await loadScoped(req, res, "valet_assignments", req.params.id);
  if (!loaded) return;

  const { error } = await supabase
    .from("valet_assignments")
    .update({ is_active: false })
    .eq("id", loaded.row.id);

  if (error) throw error;

  return res.json({ success: true, message: "Valet removed from post." });
});

/** Valet: where am I standing today? */
const getMyPost = handle("fetch my post", async (req, res) => {
  const post = await getValetPost(req.user);

  return res.json({
    success: true,
    assignment: post && post.id
      ? {
          floor: post.floor,
          post: post.post,
          assigned_at: post.assigned_at
        }
      : null
  });
});

module.exports = {
  getBuildings,
  createBuilding,
  getFloors,
  createFloor,
  getManagers,
  assignManagerToFloor,
  removeManagerAssignment,
  getUnassignedSlots,
  assignSlotsToFloor,
  getMyAreas,
  getFloorMap,
  removePreviousSlots,
  createZone,
  updateZone,
  deleteZone,
  createSlotOnMap,
  generateSlots,
  deleteSlot,
  createGate,
  updateGate,
  deleteGate,
  createPost,
  updatePost,
  deletePost,
  getAssignableValets,
  assignValetToPost,
  removeValetAssignment,
  getMyPost
};

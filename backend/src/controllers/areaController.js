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

const parseAddressAndLocation = (addressStr) => {
  if (!addressStr) return { address: "", location: "" };
  if (addressStr.includes(" | ")) {
    const parts = addressStr.split(" | ");
    return { address: parts[0]?.trim() || "", location: parts[1]?.trim() || "" };
  }
  return { address: addressStr, location: addressStr };
};

const getBuildings = handle("fetch buildings", async (req, res) => {
  const { data: buildings, error } = await supabase
    .from("parking_buildings")
    .select("*")
    .order("building_name", { ascending: true });

  if (error) throw error;

  // Enrich each building with floor count, slot counts, and staff counts
  const { data: allFloors } = await supabase
    .from("parking_floors")
    .select("id, building_id");

  const { data: allSlots } = await supabase
    .from("parking_slots")
    .select("id, floor_id, status");

  const { data: allManagerAssignments } = await supabase
    .from("manager_assignments")
    .select("floor_id, manager_id")
    .eq("is_active", true);

  const { data: allValetAssignments } = await supabase
    .from("valet_assignments")
    .select("floor_id, valet_id")
    .eq("is_active", true);

  // Fetch manager user details to show which manager is assigned to every branch
  const managerIds = [
    ...new Set(
      (allManagerAssignments || [])
        .map((ma) => ma.manager_id)
        .filter(Boolean)
    )
  ];
  let managerUsers = [];
  if (managerIds.length > 0) {
    const { data: mUsers } = await supabase
      .from("users")
      .select("id, name, email, role")
      .in("id", managerIds);
    managerUsers = mUsers || [];
  }

  const enriched = (buildings || []).map((b) => {
    const bFloors = (allFloors || []).filter((f) => f.building_id === b.id);
    const bFloorIds = new Set(bFloors.map((f) => f.id));

    const bSlots = (allSlots || []).filter((s) => bFloorIds.has(s.floor_id));
    const occupiedCount = bSlots.filter((s) => s.status === "occupied").length;
    const availableCount = bSlots.filter((s) => s.status === "available").length;

    const bManagers = new Set(
      (allManagerAssignments || [])
        .filter((ma) => bFloorIds.has(ma.floor_id))
        .map((ma) => ma.manager_id)
    );

    const bValets = new Set(
      (allValetAssignments || [])
        .filter((va) => bFloorIds.has(va.floor_id))
        .map((va) => va.valet_id)
    );

    const bManagerObjs = managerUsers.filter((u) => bManagers.has(u.id));
    const primaryManager = bManagerObjs[0] || null;

    const { address: cleanAddress, location: parsedLocation } = parseAddressAndLocation(b.address);

    return {
      ...b,
      location: parsedLocation || cleanAddress,
      display_address: cleanAddress,
      floors_count: bFloors.length,
      slots_count: bSlots.length,
      occupied_slots: occupiedCount,
      available_slots: availableCount,
      managers_count: bManagers.size,
      valets_count: bValets.size,
      total_staff: bManagers.size + bValets.size,
      staff_count: bManagers.size + bValets.size,
      manager: primaryManager
        ? {
            id: primaryManager.id,
            name: primaryManager.name,
            email: primaryManager.email
          }
        : null,
      managers: bManagerObjs.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email
      }))
    };
  });

  // If caller is a manager or parking_admin, they should ONLY see their own branch!
  if (req.user?.role === "manager" || req.user?.role === "parking_admin") {
    const scope = await getAreaScope(req.user);
    if (scope.buildingIds && scope.buildingIds.length > 0) {
      const managerBuildings = enriched.filter((b) =>
        scope.buildingIds.includes(b.id)
      );
      return res.json({ success: true, buildings: managerBuildings });
    }
    return res.json({ success: true, buildings: [] });
  }

  return res.json({ success: true, buildings: enriched });
});

const createBuilding = handle("create building", async (req, res) => {
  const building_name = String(req.body.building_name || req.body.hotel_name || "").trim();
  const rawAddress = String(req.body.address || "").trim();
  const rawLocation = String(req.body.location || "").trim();

  if (!building_name) return fail(res, 400, "Hotel / Building name is required.");

  let address = rawAddress;
  if (rawLocation && rawLocation !== rawAddress) {
    address = rawAddress ? `${rawAddress} | ${rawLocation}` : rawLocation;
  } else if (!address && rawLocation) {
    address = rawLocation;
  }

  const { data, error } = await supabase
    .from("parking_buildings")
    .insert([{ building_name, address: address || null }])
    .select()
    .single();

  if (error) return fail(res, 400, error.message);

  const { address: cleanAddress, location: parsedLocation } = parseAddressAndLocation(data.address);

  // Always create default Ground Floor and initial parking slots for new hotel branch
  const manager_id = req.body.manager_id;
  const initialSlots = Number(req.body.slot_count || req.body.total_slots || 30);
  const hotelPrefix = building_name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() || "BAY";

  try {
    const { data: defaultFloor } = await supabase
      .from("parking_floors")
      .insert([{ building_id: data.id, floor_name: "Ground Floor", floor_number: 0 }])
      .select()
      .single();

    if (defaultFloor) {
      // 1. Generate initial parking slots if initialSlots > 0
      if (initialSlots > 0) {
        const { data: area } = await supabase
          .from("parking_areas")
          .insert([{
            floor_id: defaultFloor.id,
            block_code: hotelPrefix,
            start_number: 1,
            end_number: initialSlots,
            parking_type: "car",
            created_by: req.user?.id || null
          }])
          .select()
          .single();

        const padLen = Math.max(2, String(initialSlots).length);
        const slotRows = [];
        for (let i = 1; i <= initialSlots; i++) {
          const numStr = String(i).padStart(padLen, "0");
          slotRows.push({
            slot_number: `${hotelPrefix}-${numStr}`,
            parking_type: "car",
            status: "available",
            floor_id: defaultFloor.id,
            area_id: area?.id || null,
            created_by: req.user?.id || null
          });
        }
        await supabase.from("parking_slots").insert(slotRows);
      }

      // 2. Assign manager if selected
      if (manager_id) {
        await supabase.from("manager_assignments").insert([{
          manager_id,
          floor_id: defaultFloor.id,
          assigned_by: req.user?.id || null,
          is_active: true
        }]);
      }
    }
  } catch (initErr) {
    console.warn("Auto infra initialization on createBuilding warning:", initErr.message);
  }

  return res.status(201).json({
    success: true,
    building: {
      ...data,
      location: parsedLocation || cleanAddress,
      display_address: cleanAddress,
    },
    message: "Hotel branch created successfully."
  });
});

const updateBuilding = handle("update building", async (req, res) => {
  const { id } = req.params;
  const building_name = req.body.building_name ? String(req.body.building_name).trim() : undefined;
  const rawAddress = req.body.address !== undefined ? String(req.body.address).trim() : undefined;
  const rawLocation = req.body.location !== undefined ? String(req.body.location).trim() : undefined;
  const status = req.body.status;

  const updateData = {};
  if (building_name) updateData.building_name = building_name;
  if (status) updateData.status = status;

  if (rawAddress !== undefined || rawLocation !== undefined) {
    const addr = rawAddress || "";
    const loc = rawLocation || "";
    if (loc && loc !== addr) {
      updateData.address = addr ? `${addr} | ${loc}` : loc;
    } else {
      updateData.address = addr || loc || null;
    }
  }

  const { data, error } = await supabase
    .from("parking_buildings")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return fail(res, 400, error.message);

  const { address: cleanAddress, location: parsedLocation } = parseAddressAndLocation(data.address);

  // If manager_id is specified in update, update the branch manager assignment
  const manager_id = req.body.manager_id;
  if (manager_id !== undefined) {
    try {
      let { data: bFloors } = await supabase
        .from("parking_floors")
        .select("id")
        .eq("building_id", id);

      if (!bFloors || bFloors.length === 0) {
        const { data: defaultFloor } = await supabase
          .from("parking_floors")
          .insert([{ building_id: id, floor_name: "Ground Floor", floor_number: 0 }])
          .select()
          .single();
        if (defaultFloor) bFloors = [defaultFloor];
      }

      if (bFloors && bFloors.length > 0) {
        const floorIds = bFloors.map((f) => f.id);
        // Deactivate existing manager assignments for these floors
        await supabase
          .from("manager_assignments")
          .update({ is_active: false })
          .in("floor_id", floorIds);

        // Assign new manager if one was selected
        if (manager_id) {
          const records = floorIds.map((fId) => ({
            manager_id,
            floor_id: fId,
            assigned_by: req.user?.id || null,
            is_active: true
          }));
          await supabase.from("manager_assignments").insert(records);
        }
      }
    } catch (assignErr) {
      console.warn("Manager re-assignment on updateBuilding warning:", assignErr.message);
    }
  }

  return res.json({
    success: true,
    building: {
      ...data,
      location: parsedLocation || cleanAddress,
      display_address: cleanAddress,
    },
    message: "Hotel updated successfully."
  });
});

const deleteBuilding = handle("delete building", async (req, res) => {
  const { id } = req.params;

  // Check if any active sessions in this hotel's slots
  const { data: floors } = await supabase
    .from("parking_floors")
    .select("id")
    .eq("building_id", id);

  const floorIds = (floors || []).map((f) => f.id);

  if (floorIds.length > 0) {
    const { data: slots } = await supabase
      .from("parking_slots")
      .select("slot_number, status")
      .in("floor_id", floorIds);

    const slotNumbers = (slots || []).map((s) => s.slot_number);
    const hasOccupied = (slots || []).some((s) => s.status === "occupied");

    if (hasOccupied) {
      return fail(res, 400, "Cannot delete hotel branch with currently occupied parking slots.");
    }

    if (slotNumbers.length > 0) {
      const { data: activeSessions } = await supabase
        .from("parking_sessions")
        .select("id")
        .in("parking_slot", slotNumbers)
        .in("status", ["checked_in", "parked", "retrieval_requested", "retrieving"]);

      if (activeSessions && activeSessions.length > 0) {
        return fail(res, 400, "Cannot delete hotel branch with active parking sessions.");
      }
    }
  }

  const { error } = await supabase
    .from("parking_buildings")
    .delete()
    .eq("id", id);

  if (error) return fail(res, 400, error.message);

  return res.json({ success: true, message: "Hotel branch deleted successfully." });
});

const configureHotel = handle("configure hotel infrastructure", async (req, res) => {
  const { building_id, levels } = req.body;

  if (!building_id || !Array.isArray(levels) || levels.length === 0) {
    return fail(res, 400, "building_id and levels array are required.");
  }

  // Check building exists
  const { data: building, error: bErr } = await supabase
    .from("parking_buildings")
    .select("id, building_name")
    .eq("id", building_id)
    .single();

  if (bErr || !building) return fail(res, 404, "Hotel not found.");

  const createdLevels = [];

  for (const level of levels) {
    const floor_name = String(level.floor_name || "").trim();
    const floor_number = Number(level.floor_number ?? 0);
    const slot_count = Number(level.slot_count || level.slots || 0);
    const block_code = String(level.block_code || floor_name.slice(0, 2).toUpperCase() || "A").trim();

    if (!floor_name) continue;

    // 1. Create or get floor
    let { data: floor } = await supabase
      .from("parking_floors")
      .select("id, floor_name, floor_number")
      .eq("building_id", building_id)
      .eq("floor_number", floor_number)
      .maybeSingle();

    if (!floor) {
      const { data: newFloor, error: fErr } = await supabase
        .from("parking_floors")
        .insert([{ building_id, floor_name, floor_number }])
        .select()
        .single();
      if (fErr) throw fErr;
      floor = newFloor;
    } else if (floor.floor_name !== floor_name) {
      // Update floor name if changed by user
      const { data: updatedFloor } = await supabase
        .from("parking_floors")
        .update({ floor_name })
        .eq("id", floor.id)
        .select()
        .single();
      if (updatedFloor) floor = updatedFloor;
    }

    // 2. Generate slots if slot_count > 0
    let slotsAdded = 0;
    if (slot_count > 0 && floor?.id) {
      // Check existing slots on this floor
      const { data: existingSlots } = await supabase
        .from("parking_slots")
        .select("id, slot_number")
        .eq("floor_id", floor.id);

      const currentSlots = existingSlots || [];
      const currentCount = currentSlots.length;

      // Find or create area
      let { data: area } = await supabase
        .from("parking_areas")
        .select("id")
        .eq("floor_id", floor.id)
        .maybeSingle();

      if (!area) {
        const { data: newArea, error: aErr } = await supabase
          .from("parking_areas")
          .insert([{
            floor_id: floor.id,
            block_code,
            start_number: 1,
            end_number: slot_count,
            parking_type: level.parking_type || "car",
            created_by: req.user.id
          }])
          .select()
          .single();
        if (!aErr && newArea) area = newArea;
      }

      if (slot_count > currentCount) {
        const slotsNeeded = slot_count - currentCount;
        const padLen = Math.max(2, String(slot_count).length);
        const hotelPrefix = building.building_name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() || "BAY";
        const slotRows = [];

        // Check highest existing number
        let maxNum = 0;
        currentSlots.forEach((s) => {
          const match = (s.slot_number || "").match(/(\d+)$/);
          if (match) {
            const n = parseInt(match[1], 10);
            if (n > maxNum) maxNum = n;
          }
        });

        for (let i = 1; i <= slotsNeeded; i++) {
          const numStr = String(maxNum + i).padStart(padLen, "0");
          const code = `${hotelPrefix}-${block_code}-${numStr}`;
          slotRows.push({
            slot_number: code,
            parking_type: level.parking_type || "car",
            status: "available",
            floor_id: floor.id,
            area_id: area?.id || null,
            created_by: req.user.id
          });
        }

        // Avoid unique constraint conflicts
        const { data: clash } = await supabase
          .from("parking_slots")
          .select("slot_number")
          .in("slot_number", slotRows.map((s) => s.slot_number));

        const clashSet = new Set((clash || []).map((c) => c.slot_number));
        const nonClashRows = slotRows.filter((s) => !clashSet.has(s.slot_number));

        if (nonClashRows.length > 0) {
          const { error: insErr } = await supabase
            .from("parking_slots")
            .insert(nonClashRows);
          if (!insErr) slotsAdded = nonClashRows.length;
        }
      }
    }

    createdLevels.push({
      floor,
      slots_added: slotsAdded
    });
  }

  // Ensure all managers associated with this hotel branch are actively assigned to ALL its floors
  try {
    const { data: bFloors } = await supabase
      .from("parking_floors")
      .select("id")
      .eq("building_id", building_id);

    const bFloorIds = (bFloors || []).map((f) => f.id);
    if (bFloorIds.length > 0) {
      const { data: existingMas } = await supabase
        .from("manager_assignments")
        .select("manager_id")
        .in("floor_id", bFloorIds);

      const managerIds = [...new Set((existingMas || []).map((m) => m.manager_id).filter(Boolean))];

      for (const mId of managerIds) {
        for (const fId of bFloorIds) {
          const { data: existing } = await supabase
            .from("manager_assignments")
            .select("id")
            .eq("manager_id", mId)
            .eq("floor_id", fId)
            .maybeSingle();

          if (existing) {
            await supabase.from("manager_assignments").update({ is_active: true }).eq("id", existing.id);
          } else {
            await supabase.from("manager_assignments").insert([{
              manager_id: mId,
              floor_id: fId,
              is_active: true,
              assigned_by: req.user?.id || null
            }]);
          }
        }
      }
    }
  } catch (mErr) {
    console.warn("Auto manager floor sync warning:", mErr.message);
  }

  return res.status(201).json({
    success: true,
    message: `Configured ${createdLevels.length} parking level(s) for ${building.building_name}.`,
    levels: createdLevels
  });
});

const getFloors = handle("fetch floors", async (req, res) => {
  const scope = await getAreaScope(req.user);
  const buildingId = req.query.building_id || req.query.hotelId || req.query.hotel_id;

  let query = supabase
    .from("parking_floors")
    .select(FLOOR_SELECT)
    .order("floor_number", { ascending: true });

  query = applyFloorScope(query, scope, "id");

  if (buildingId && buildingId !== "all") {
    query = query.eq("building_id", buildingId);
  }

  const { data: floors, error } = await query;
  if (error) throw error;

  const floorIds = (floors || []).map((f) => f.id);

  const [assignRes, slotsRes] = await Promise.all([
    supabase
      .from("manager_assignments")
      .select("id, floor_id, manager:users!manager_assignments_manager_id_fkey ( id, name, email )")
      .eq("is_active", true),
    floorIds.length > 0
      ? supabase
          .from("parking_slots")
          .select("id, floor_id, status")
          .in("floor_id", floorIds)
      : { data: [] }
  ]);

  if (assignRes.error) throw assignRes.error;

  const byFloor = new Map((assignRes.data || []).map((a) => [a.floor_id, a]));
  const slotsList = slotsRes.data || [];

  return res.json({
    success: true,
    floors: (floors || []).map((floor) => {
      const fSlots = slotsList.filter((s) => s.floor_id === floor.id);
      return {
        ...floor,
        assignment_id: byFloor.get(floor.id)?.id || null,
        manager: byFloor.get(floor.id)?.manager || null,
        total_slots: fSlots.length,
        occupied_slots: fSlots.filter((s) => s.status === "occupied").length,
        available_slots: fSlots.filter((s) => s.status === "available").length,
        hotel_name: floor.building?.building_name || "Unassigned"
      };
    })
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

/**
 * Floor overview for the manager's Valet Positions page: the floor itself,
 * its entry/exit gates and valet posts (with the valets standing on them).
 * Parking slots are NOT mapped here any more - the super admin creates them
 * as parking areas (see "SUPER ADMIN - parking areas" below).
 */
const getFloorMap = handle("fetch floor", async (req, res) => {
  const { floorId } = req.params;
  const scope = await getAreaScope(req.user);

  if (!floorInScope(scope, floorId)) {
    return fail(res, 403, "This floor is not assigned to you.");
  }

  const [floorRes, gatesRes, postsRes, assignRes] = await Promise.all([
    supabase.from("parking_floors").select(FLOOR_SELECT).eq("id", floorId).maybeSingle(),
    supabase.from("parking_gates").select("*").eq("floor_id", floorId).order("gate_name"),
    supabase.from("valet_posts").select("*").eq("floor_id", floorId).order("post_name"),
    supabase
      .from("valet_assignments")
      .select("id, post_id, valet:employees ( id, name, phone, email )")
      .eq("floor_id", floorId)
      .eq("is_active", true)
  ]);

  for (const result of [floorRes, gatesRes, postsRes, assignRes]) {
    if (result.error) throw result.error;
  }

  if (!floorRes.data) return fail(res, 404, "Floor not found.");

  const posts = (postsRes.data || []).map((post) => ({
    ...post,
    valets: (assignRes.data || [])
      .filter((a) => a.post_id === post.id)
      .map((a) => ({ assignment_id: a.id, ...a.valet }))
  }));

  return res.json({
    success: true,
    floor: floorRes.data,
    gates: gatesRes.data || [],
    posts
  });
});

/* ========================================================================
   SUPER ADMIN - parking areas
   "Block A, slot 1 to 50" creates slots A-01 ... A-50 on a manager's floor.
   ======================================================================== */

const AREA_SELECT = `
  id, floor_id, block_code, start_number, end_number, parking_type, created_at,
  floor:parking_floors ( id, floor_name, floor_number, building:parking_buildings ( building_name ) )
`;

const MAX_SLOTS_PER_AREA = 500;

const formatSlotNumber = (block, number, width) =>
  `${block}-${String(number).padStart(width, "0")}`;

const getParkingAreas = handle("fetch parking areas", async (req, res) => {
  const [areasRes, assignmentsRes, slotsRes] = await Promise.all([
    supabase.from("parking_areas").select(AREA_SELECT).order("created_at", { ascending: false }),
    supabase
      .from("manager_assignments")
      .select("floor_id, manager:users!manager_assignments_manager_id_fkey ( id, name )")
      .eq("is_active", true),
    supabase.from("parking_slots").select("area_id, status").not("area_id", "is", null)
  ]);

  for (const result of [areasRes, assignmentsRes, slotsRes]) {
    if (result.error) throw result.error;
  }

  const managerByFloor = new Map(
    (assignmentsRes.data || []).map((row) => [row.floor_id, row.manager || null])
  );

  const countsByArea = new Map();
  for (const slot of slotsRes.data || []) {
    const entry = countsByArea.get(slot.area_id) || { total: 0, occupied: 0 };
    entry.total += 1;
    if (slot.status === "occupied") entry.occupied += 1;
    countsByArea.set(slot.area_id, entry);
  }

  const areas = (areasRes.data || []).map((area) => ({
    ...area,
    manager: managerByFloor.get(area.floor_id) || null,
    slot_count: countsByArea.get(area.id)?.total || 0,
    occupied_count: countsByArea.get(area.id)?.occupied || 0
  }));

  return res.json({ success: true, areas });
});

const createParkingArea = handle("create parking area", async (req, res) => {
  const { floor_id } = req.body;
  const block = String(req.body.block || "").trim().toUpperCase();
  const start = Number(req.body.start_number);
  const end = Number(req.body.end_number);
  const parking_type = req.body.parking_type || "car";

  if (!floor_id || !block) {
    return fail(res, 400, "floor_id and block are required.");
  }

  if (!/^[A-Z0-9]{1,6}$/.test(block)) {
    return fail(res, 400, "Block must be 1 to 6 letters or digits, for example A.");
  }

  if (!SLOT_TYPES.includes(parking_type)) {
    return fail(res, 400, "Use car, bike or truck.");
  }

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
    return fail(res, 400, "Slot range must be whole numbers, starting at 1 or more, with the end not below the start.");
  }

  if (end - start + 1 > MAX_SLOTS_PER_AREA) {
    return fail(res, 400, `One area can hold at most ${MAX_SLOTS_PER_AREA} slots.`);
  }

  const { data: floor, error: floorError } = await supabase
    .from("parking_floors")
    .select("id")
    .eq("id", floor_id)
    .maybeSingle();

  if (floorError) throw floorError;
  if (!floor) return fail(res, 404, "Floor not found.");

  const width = Math.max(2, String(end).length);
  const slotNumbers = [];
  for (let n = start; n <= end; n += 1) slotNumbers.push(formatSlotNumber(block, n, width));

  // slot_number is unique across the system, so refuse the whole block on a clash.
  const { data: clash, error: clashError } = await supabase
    .from("parking_slots")
    .select("slot_number")
    .in("slot_number", slotNumbers);

  if (clashError) throw clashError;

  if (clash?.length) {
    return fail(
      res,
      409,
      `Slots already exist (${clash.slice(0, 3).map((c) => c.slot_number).join(", ")}${clash.length > 3 ? ", ..." : ""}). Use a different block or range.`
    );
  }

  const { data: area, error: areaError } = await supabase
    .from("parking_areas")
    .insert([{
      floor_id,
      block_code: block,
      start_number: start,
      end_number: end,
      parking_type,
      created_by: req.user.id
    }])
    .select(AREA_SELECT)
    .single();

  if (areaError) return fail(res, 400, areaError.message);

  const rows = slotNumbers.map((slot_number) => ({
    slot_number,
    parking_type,
    floor_id,
    area_id: area.id,
    created_by: req.user.id
  }));

  const { error: insertError } = await supabase.from("parking_slots").insert(rows);

  if (insertError) {
    // do not leave an empty area behind
    await supabase.from("parking_areas").delete().eq("id", area.id);
    return fail(res, 400, insertError.message);
  }

  return res.status(201).json({
    success: true,
    area,
    created: rows.length,
    message: `Block ${block} created: ${slotNumbers[0]} to ${slotNumbers[slotNumbers.length - 1]} (${rows.length} slots).`
  });
});

const deleteParkingArea = handle("delete parking area", async (req, res) => {
  const { data: area, error } = await supabase
    .from("parking_areas")
    .select("id, block_code")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) throw error;
  if (!area) return fail(res, 404, "Parking area not found.");

  const { data: slots, error: slotsError } = await supabase
    .from("parking_slots")
    .select("id, status")
    .eq("area_id", area.id);

  if (slotsError) throw slotsError;

  if ((slots || []).some((slot) => slot.status !== "available")) {
    return fail(res, 400, "This block has occupied or reserved slots. Free them before removing the block.");
  }

  if (slots?.length) {
    const { error: deleteSlotsError } = await supabase
      .from("parking_slots")
      .delete()
      .in("id", slots.map((slot) => slot.id));

    if (deleteSlotsError) throw deleteSlotsError;
  }

  const { error: deleteError } = await supabase.from("parking_areas").delete().eq("id", area.id);
  if (deleteError) throw deleteError;

  return res.json({ success: true, message: `Block ${area.block_code} removed.` });
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
  updateBuilding,
  deleteBuilding,
  configureHotel,
  getFloors,
  createFloor,
  getManagers,
  assignManagerToFloor,
  removeManagerAssignment,
  getUnassignedSlots,
  assignSlotsToFloor,
  getParkingAreas,
  createParkingArea,
  deleteParkingArea,
  getMyAreas,
  getFloorMap,
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

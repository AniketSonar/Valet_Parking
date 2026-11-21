const supabase = require("../config/supabase");

/**
 * Area scope of the logged-in user.
 *  - super_admin: unrestricted  -> { unrestricted: true, floorIds: null, buildingIds: null, buildingId: null, slotNumbers: null }
 *  - manager / parking_admin:   only the hotel branch(es) and floors assigned to them
 *  - anyone else: empty scope
 */
const getAreaScope = async (user) => {
  if (!user) {
    return { unrestricted: false, floorIds: [], buildingIds: [], buildingId: null, slotNumbers: [] };
  }

  if (user.role === "super_admin") {
    return { unrestricted: true, floorIds: null, buildingIds: null, buildingId: null, slotNumbers: null };
  }

  if (user.role !== "manager" && user.role !== "parking_admin") {
    return { unrestricted: false, floorIds: [], buildingIds: [], buildingId: null, slotNumbers: [] };
  }

  // 1. Fetch manager assignments (active first)
  const { data, error } = await supabase
    .from("manager_assignments")
    .select(`
      floor_id,
      floor:parking_floors (
        id,
        building_id
      )
    `)
    .eq("manager_id", user.id)
    .eq("is_active", true);

  if (error) throw error;

  let directFloorIds = (data || []).map((row) => row.floor_id).filter(Boolean);
  let rawBuildingIds = [
    ...new Set(
      (data || [])
        .map((row) => row.floor?.building_id)
        .filter(Boolean)
    )
  ];

  let primaryBuildingId = rawBuildingIds[0] || null;

  // Fallback 1: check any manager_assignments (even if is_active was false)
  if (!primaryBuildingId) {
    const { data: anyMa } = await supabase
      .from("manager_assignments")
      .select(`
        floor_id,
        floor:parking_floors ( id, building_id )
      `)
      .eq("manager_id", user.id)
      .limit(1)
      .maybeSingle();

    if (anyMa?.floor?.building_id) {
      primaryBuildingId = anyMa.floor.building_id;
    }
  }

  // Fallback 2: check employees or users profile for assigned hotel
  if (!primaryBuildingId && user.email) {
    const { data: emp } = await supabase
      .from("employees")
      .select("assigned_hotel_id")
      .eq("email", user.email)
      .maybeSingle();

    if (emp?.assigned_hotel_id) {
      primaryBuildingId = emp.assigned_hotel_id;
    }
  }

  // A manager operates exclusively their single assigned hotel branch
  const buildingIds = primaryBuildingId ? [primaryBuildingId] : [];

  // Include all floors belonging to the manager's assigned hotel branch
  let allFloorIds = [];
  if (primaryBuildingId) {
    let { data: bFloors } = await supabase
      .from("parking_floors")
      .select("id, floor_name, floor_number")
      .eq("building_id", primaryBuildingId);

    // If building has NO floors yet, create Ground Floor
    if (!bFloors || bFloors.length === 0) {
      const { data: newF } = await supabase
        .from("parking_floors")
        .insert([{ building_id: primaryBuildingId, floor_name: "Ground Floor", floor_number: 0 }])
        .select()
        .single();
      if (newF) bFloors = [newF];
    }

    if (bFloors && bFloors.length > 0) {
      allFloorIds = bFloors.map((f) => f.id);

      // Ensure manager is actively assigned to all floors of this building
      for (const fId of allFloorIds) {
        if (!directFloorIds.includes(fId)) {
          const { data: ex } = await supabase
            .from("manager_assignments")
            .select("id")
            .eq("manager_id", user.id)
            .eq("floor_id", fId)
            .maybeSingle();

          if (ex) {
            await supabase.from("manager_assignments").update({ is_active: true }).eq("id", ex.id);
          } else {
            await supabase.from("manager_assignments").insert([{
              manager_id: user.id,
              floor_id: fId,
              is_active: true
            }]);
          }
        }
      }
    }
  } else if (directFloorIds.length > 0) {
    allFloorIds = directFloorIds;
  }

  // Pre-load slot numbers for fast session / bay queries, auto-seed if 0 slots
  let slotNumbers = [];
  if (allFloorIds.length > 0) {
    let { data: slots } = await supabase
      .from("parking_slots")
      .select("id, slot_number")
      .in("floor_id", allFloorIds);

    // Auto-generate standard 30 slots if branch has 0 slots
    if ((!slots || slots.length === 0) && primaryBuildingId) {
      try {
        const targetFloorId = allFloorIds[0];
        const { data: bData } = await supabase
          .from("parking_buildings")
          .select("building_name")
          .eq("id", primaryBuildingId)
          .maybeSingle();

        const bName = bData?.building_name || "BAY";
        const prefix = bName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() || "BAY";

        const { data: area } = await supabase
          .from("parking_areas")
          .insert([{
            floor_id: targetFloorId,
            block_code: prefix,
            start_number: 1,
            end_number: 30,
            parking_type: "car"
          }])
          .select()
          .single();

        const newSlots = [];
        for (let i = 1; i <= 30; i++) {
          newSlots.push({
            slot_number: `${prefix}-${String(i).padStart(2, "0")}`,
            parking_type: "car",
            status: "available",
            floor_id: targetFloorId,
            area_id: area?.id || null
          });
        }
        const { data: insSlots } = await supabase.from("parking_slots").insert(newSlots).select("slot_number");
        slots = insSlots || newSlots;
      } catch (seedErr) {
        console.warn("Auto-seed slots in areaScope warning:", seedErr.message);
      }
    }

    slotNumbers = (slots || []).map((s) => s.slot_number).filter(Boolean);
  }

  return {
    unrestricted: false,
    floorIds: allFloorIds,
    buildingIds,
    buildingId: buildingIds[0] || null,
    slotNumbers
  };
};

const floorInScope = (scope, floorId) =>
  scope.unrestricted || (Boolean(floorId) && scope.floorIds.includes(floorId));

/** Limit a supabase query on a table with a floor_id column to the scope. */
const applyFloorScope = (query, scope, column = "floor_id") => {
  if (scope.unrestricted) return query;
  if (scope.floorIds.length === 0) {
    // impossible id -> empty result without a special case for callers
    return query.eq(column, "00000000-0000-0000-0000-000000000000");
  }
  return query.in(column, scope.floorIds);
};

/** The floor a valet (users row) currently works on, via employees.email. */
const getValetPost = async (user) => {
  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id")
    .eq("email", user.email)
    .eq("role", "valet")
    .maybeSingle();

  if (employeeError) throw employeeError;
  if (!employee) return null;

  const { data, error: assignmentError } = await supabase
    .from("valet_assignments")
    .select(`
      id, floor_id, post_id, assigned_at,
      post:valet_posts ( id, post_name, capacity, gate:parking_gates ( id, gate_name, gate_type, side ) ),
      floor:parking_floors ( id, floor_name, floor_number, building_id, building:parking_buildings ( id, building_name ) )
    `)
    .eq("valet_id", employee.id)
    .eq("is_active", true)
    .maybeSingle();

  if (assignmentError) throw assignmentError;

  return data ? { ...data, employee_id: employee.id } : { employee_id: employee.id };
};

module.exports = { getAreaScope, floorInScope, applyFloorScope, getValetPost };

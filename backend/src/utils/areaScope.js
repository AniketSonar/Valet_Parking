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

  const directFloorIds = (data || []).map((row) => row.floor_id).filter(Boolean);
  const rawBuildingIds = [
    ...new Set(
      (data || [])
        .map((row) => row.floor?.building_id)
        .filter(Boolean)
    )
  ];

  // A manager operates exclusively their single assigned hotel branch
  const primaryBuildingId = rawBuildingIds[0] || null;
  const buildingIds = primaryBuildingId ? [primaryBuildingId] : [];

  // Include all floors belonging to the manager's assigned hotel branch
  let allFloorIds = [];
  if (primaryBuildingId) {
    const { data: bFloors } = await supabase
      .from("parking_floors")
      .select("id")
      .eq("building_id", primaryBuildingId);

    if (bFloors && bFloors.length > 0) {
      allFloorIds = bFloors.map((f) => f.id);
    }
  } else if (directFloorIds.length > 0) {
    allFloorIds = directFloorIds;
  }

  // Pre-load slot numbers for fast session / bay queries
  let slotNumbers = [];
  if (allFloorIds.length > 0) {
    const { data: slots } = await supabase
      .from("parking_slots")
      .select("slot_number")
      .in("floor_id", allFloorIds);

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
      floor:parking_floors ( id, floor_name, floor_number, building:parking_buildings ( building_name ) )
    `)
    .eq("valet_id", employee.id)
    .eq("is_active", true)
    .maybeSingle();

  if (assignmentError) throw assignmentError;

  return data ? { ...data, employee_id: employee.id } : { employee_id: employee.id };
};

module.exports = { getAreaScope, floorInScope, applyFloorScope, getValetPost };

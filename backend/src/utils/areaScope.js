const supabase = require("../config/supabase");

/**
 * Area scope of the logged-in user.
 *  - super_admin: unrestricted  -> { unrestricted: true, floorIds: null }
 *  - manager:     only the floors the super admin assigned to them
 *  - anyone else: empty scope
 */
const getAreaScope = async (user) => {
  if (!user) return { unrestricted: false, floorIds: [] };

  if (user.role === "super_admin") {
    return { unrestricted: true, floorIds: null };
  }

  if (user.role !== "manager") {
    return { unrestricted: false, floorIds: [] };
  }

  const { data, error } = await supabase
    .from("manager_assignments")
    .select("floor_id")
    .eq("manager_id", user.id)
    .eq("is_active", true);

  if (error) throw error;

  return {
    unrestricted: false,
    floorIds: (data || []).map((row) => row.floor_id)
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

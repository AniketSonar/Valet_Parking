
const supabase = require("../config/supabase");
const { getAreaScope } = require("../utils/areaScope");

const allowedRoles = [
  "super_admin",
  "manager",
  "valet",
];

const findEmployeeByEmail = async (email) => {
  if (!email) return null;

  const {
    data,
    error
  } = await supabase
    .from("employees")
    .select("id, name, role, phone, email, is_active")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const findEmployeeByPhone = async (phone) => {
  if (!phone) return null;

  const {
    data,
    error
  } = await supabase
    .from("employees")
    .select("id, name, role, phone, email, is_active")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const syncValetEmployee = async ({
  name,
  email,
  phone,
  is_active
}) => {
  if (!phone) {
    throw new Error(
      "Phone number is required for valet staff."
    );
  }

  const employeeByPhone =
    await findEmployeeByPhone(phone);

  const employeeByEmail =
    await findEmployeeByEmail(email);

  if (
    employeeByPhone &&
    employeeByEmail &&
    employeeByPhone.id !== employeeByEmail.id
  ) {
    const error = new Error(
      "The phone number and email already belong to different employee records."
    );

    error.statusCode = 409;

    throw error;
  }

  const existingEmployee =
    employeeByPhone || employeeByEmail;

  if (existingEmployee) {
    const {
      data: employee,
      error
    } = await supabase
      .from("employees")
      .update({
        name,
        role: "valet",
        phone,
        email,
        is_active
      })
      .eq("id", existingEmployee.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return employee;
  }

  const {
    data: employee,
    error
  } = await supabase
    .from("employees")
    .insert([
      {
        name,
        role: "valet",
        phone,
        email,
        is_active
      }
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return employee;
};

const getEmployeeByEmail = async (email) => {
  if (!email) return null;

  const {
    data,
    error
  } = await supabase
    .from("employees")
    .select("id, name, role, phone, email, is_active")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const createStaff = async (req, res) => {
  let authUserId = null;
  let createdUserId = null;

  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      hotel_id,
      position_name,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !role
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, password and role are required."
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff role."
      });
    }

    if (role === "valet" && !phone) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number is required for valet staff."
      });
    }

    if (role === "valet") {
      const existingEmployeeByPhone =
        await findEmployeeByPhone(phone);

      if (existingEmployeeByPhone) {
        return res.status(409).json({
          success: false,
          message:
            "An employee with this phone number already exists."
        });
      }

      const existingEmployeeByEmail =
        await findEmployeeByEmail(email);

      if (existingEmployeeByEmail) {
        return res.status(409).json({
          success: false,
          message:
            "An employee with this email already exists."
        });
      }
    }

    const {
      data: authData,
      error: authError
    } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      return res.status(400).json({
        success: false,
        message: authError.message
      });
    }

    authUserId = authData.user.id;

    const {
      data: user,
      error: userError
    } = await supabase
      .from("users")
      .insert([
        {
          auth_user_id: authData.user.id,
          name,
          email,
          role
        }
      ])
      .select()
      .single();

    if (userError) {
      await supabase.auth.admin.deleteUser(
        authUserId
      );

      return res.status(400).json({
        success: false,
        message: userError.message
      });
    }

    createdUserId = user.id;

    let employee = null;

    if (role === "valet") {
      try {
        employee =
          await syncValetEmployee({
            name,
            email,
            phone,
            is_active: true
          });
      } catch (employeeError) {
        await supabase
          .from("users")
          .delete()
          .eq("id", createdUserId);

        await supabase.auth.admin.deleteUser(
          authUserId
        );

        if (employeeError.statusCode === 409) {
          return res.status(409).json({
            success: false,
            message: employeeError.message
          });
        }

        return res.status(400).json({
          success: false,
          message:
            employeeError.message ||
            "Failed to create valet employee record."
        });
      }
    }

    if (hotel_id) {
      try {
        let { data: floors } = await supabase
          .from("parking_floors")
          .select("id")
          .eq("building_id", hotel_id)
          .order("floor_number", { ascending: true });

        if (!floors || floors.length === 0) {
          const { data: defaultFloor } = await supabase
            .from("parking_floors")
            .insert([{ building_id: hotel_id, floor_name: "Ground Floor", floor_number: 0 }])
            .select()
            .single();
          if (defaultFloor) floors = [defaultFloor];
        }

        if (floors && floors.length > 0) {
          const firstFloorId = floors[0].id;
          if (role === "manager" || role === "parking_admin") {
            // Deactivate any existing manager assignments for this hotel branch
            await supabase
              .from("manager_assignments")
              .update({ is_active: false })
              .in("floor_id", floors.map((f) => f.id));

            // Assign this manager to ALL floors of this hotel branch
            const managerRecords = floors.map((f) => ({
              manager_id: user.id,
              floor_id: f.id,
              assigned_by: req.user?.id || null,
              is_active: true
            }));
            await supabase.from("manager_assignments").insert(managerRecords);
          } else if (role === "valet" && employee?.id) {
            const targetPostName = position_name ? String(position_name).trim() : "Main Post";
            let { data: post } = await supabase
              .from("valet_posts")
              .select("id")
              .eq("floor_id", firstFloorId)
              .ilike("post_name", targetPostName)
              .limit(1)
              .maybeSingle();

            if (!post) {
              const { data: newPost } = await supabase
                .from("valet_posts")
                .insert([{ floor_id: firstFloorId, post_name: targetPostName }])
                .select()
                .single();
              post = newPost;
            }

            if (post) {
              await supabase.from("valet_assignments").insert([{
                valet_id: employee.id,
                floor_id: firstFloorId,
                post_id: post.id,
                assigned_by: req.user?.id || null,
                is_active: true
              }]);
            }
          }
        }
      } catch (assignErr) {
        console.warn("Auto hotel assign warning:", assignErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message:
        "Staff member created successfully.",
      user,
      employee
    });
  } catch (error) {
    console.error(
      "Create staff error:",
      error
    );

    if (createdUserId) {
      await supabase
        .from("users")
        .delete()
        .eq("id", createdUserId);
    }

    if (authUserId) {
      await supabase.auth.admin.deleteUser(
        authUserId
      );
    }

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Internal server error."
    });
  }
};

const getAllStaff = async (req, res) => {
  try {
    const hotelId = req.query.hotelId || req.query.building_id;
    const roleFilter = req.query.role;

    const {
      data: users,
      error
    } = await supabase
      .from("users")
      .select(
        "id, name, email, role, created_at, auth_user_id, is_active"
      )
      .in("role", [
        "super_admin",
        "manager",
        "parking_admin",
        "valet_attendant",
        "reception_security",
        "valet",
        "cashier"
      ])
      .order("created_at", {
        ascending: false
      });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Fetch all active manager assignments and valet assignments with building info
    const [managerAssignRes, valetAssignRes] = await Promise.all([
      supabase
        .from("manager_assignments")
        .select(`
          manager_id,
          floor:parking_floors (
            id,
            floor_name,
            building:parking_buildings ( id, building_name )
          )
        `)
        .eq("is_active", true),
      supabase
        .from("valet_assignments")
        .select(`
          valet_id,
          post:valet_posts ( id, post_name ),
          floor:parking_floors (
            id,
            floor_name,
            building:parking_buildings ( id, building_name )
          )
        `)
        .eq("is_active", true)
    ]);

    const managerAssignments = managerAssignRes.data || [];
    const valetAssignments = valetAssignRes.data || [];

    let staff = await Promise.all(
      (users || []).map(async (user) => {
        let phone = null;
        let employee_id = null;
        let employee_is_active = null;

        if (user.role === "valet") {
          const employee = await getEmployeeByEmail(user.email);
          phone = employee?.phone || null;
          employee_id = employee?.id || null;
          employee_is_active = employee?.is_active ?? null;
        }

        // Determine hotel association
        let hotel_id = null;
        let hotel_name = "Unassigned";
        let floor_name = null;
        let post_name = null;

        if (user.role === "manager" || user.role === "parking_admin") {
          const userAssignments = managerAssignments.filter((a) => a.manager_id === user.id);
          const ma = userAssignments[0];
          if (ma?.floor?.building) {
            hotel_id = ma.floor.building.id;
            hotel_name = ma.floor.building.building_name;
            const floorNames = userAssignments.map((a) => a.floor?.floor_name).filter(Boolean);
            floor_name = floorNames.length > 0 ? floorNames.join(", ") : ma.floor.floor_name;
          }
        } else if (user.role === "valet" && employee_id) {
          const va = valetAssignments.find((a) => a.valet_id === employee_id);
          if (va?.floor?.building) {
            hotel_id = va.floor.building.id;
            hotel_name = va.floor.building.building_name;
            floor_name = va.floor.floor_name;
          }
          post_name = va?.post?.post_name || null;
        }

        return {
          ...user,
          phone,
          employee_id,
          employee_is_active,
          hotel_id,
          hotel_name,
          floor_name,
          post_name
        };
      })
    );

    // If caller is a manager or parking_admin, they should ONLY see staff from their own hotel branch!
    if (req.user?.role === "manager" || req.user?.role === "parking_admin") {
      const scope = await getAreaScope(req.user);
      if (scope.buildingId) {
        staff = staff.filter((s) => s.hotel_id === scope.buildingId);
      } else {
        staff = [];
      }
    } else if (hotelId && hotelId !== "all") {
      staff = staff.filter((s) => s.hotel_id === hotelId);
    }

    if (roleFilter && roleFilter !== "all") {
      if (roleFilter === "manager") {
        staff = staff.filter((s) => s.role === "manager" || s.role === "parking_admin");
      } else {
        staff = staff.filter((s) => s.role === roleFilter);
      }
    }

    return res.status(200).json({
      success: true,
      count: staff.length,
      users: staff
    });
  } catch (error) {
    console.error(
      "Get staff error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      data: user,
      error
    } = await supabase
      .from("users")
      .select(
        "id, name, email, role, created_at, auth_user_id, is_active"
      )
      .eq("id", id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found."
      });
    }

    let employee = null;

    if (user.role === "valet") {
      employee =
        await getEmployeeByEmail(user.email);
    }

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        phone: employee?.phone || null,
        employee_id: employee?.id || null,
        employee_is_active:
          employee?.is_active ?? null
      }
    });
  } catch (error) {
    console.error(
      "Get staff error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      role,
      phone
    } = req.body;

    const {
      data: existingUser,
      error: existingUserError
    } = await supabase
      .from("users")
      .select(
        "id, name, email, role, is_active"
      )
      .eq("id", id)
      .single();

    if (
      existingUserError ||
      !existingUser
    ) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found."
      });
    }

    if (!name || !role) {
      return res.status(400).json({
        success: false,
        message:
          "Name and role are required."
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff role."
      });
    }

    if (
      role === "valet" &&
      !phone &&
      existingUser.role !== "valet"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number is required when assigning the valet role."
      });
    }

    const {
      data: user,
      error
    } = await supabase
      .from("users")
      .update({
        name,
        role
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !user) {
      return res.status(400).json({
        success: false,
        message:
          error?.message ||
          "Failed to update staff."
      });
    }

    if (
      existingUser.role === "valet" &&
      role === "valet"
    ) {
      const employee =
        await getEmployeeByEmail(
          existingUser.email
        );

      if (employee) {
        let employeePhone =
          phone || employee.phone;

        const employeeByPhone =
          await findEmployeeByPhone(
            employeePhone
          );

        if (
          employeeByPhone &&
          employeeByPhone.id !== employee.id
        ) {
          return res.status(409).json({
            success: false,
            message:
              "This phone number is already assigned to another employee."
          });
        }

        const {
          error: employeeError
        } = await supabase
          .from("employees")
          .update({
            name,
            phone: employeePhone,
            email: user.email,
            role: "valet",
            is_active: user.is_active
          })
          .eq("id", employee.id);

        if (employeeError) {
          return res.status(400).json({
            success: false,
            message:
              employeeError.message
          });
        }
      } else {
        try {
          await syncValetEmployee({
            name,
            email: user.email,
            phone,
            is_active: user.is_active
          });
        } catch (employeeError) {
          return res.status(400).json({
            success: false,
            message:
              employeeError.message
          });
        }
      }
    }

    if (
      existingUser.role !== "valet" &&
      role === "valet"
    ) {
      try {
        await syncValetEmployee({
          name,
          email: user.email,
          phone,
          is_active: user.is_active
        });
      } catch (employeeError) {
        return res.status(400).json({
          success: false,
          message:
            employeeError.message
        });
      }
    }

    if (
      existingUser.role === "valet" &&
      role !== "valet"
    ) {
      const employee =
        await getEmployeeByEmail(
          existingUser.email
        );

      if (employee) {
        const {
          error: employeeError
        } = await supabase
          .from("employees")
          .update({
            is_active: false
          })
          .eq("id", employee.id);

        if (employeeError) {
          return res.status(400).json({
            success: false,
            message:
              employeeError.message
          });
        }
      }
    }

    const hotel_id = req.body.hotel_id;
    if (hotel_id) {
      try {
        const { data: floors } = await supabase
          .from("parking_floors")
          .select("id")
          .eq("building_id", hotel_id)
          .order("floor_number", { ascending: true })
          .limit(1);

        if (floors && floors.length > 0) {
          const floorId = floors[0].id;
          if (role === "manager" || role === "parking_admin") {
            await supabase
              .from("manager_assignments")
              .update({ is_active: false })
              .eq("manager_id", id);

            await supabase.from("manager_assignments").insert([{
              manager_id: id,
              floor_id: floorId,
              assigned_by: req.user?.id || null,
              is_active: true
            }]);
          } else if (role === "valet") {
            const employee = await getEmployeeByEmail(user.email);
            if (employee?.id) {
              await supabase
                .from("valet_assignments")
                .update({ is_active: false })
                .eq("valet_id", employee.id);

              let { data: post } = await supabase
                .from("valet_posts")
                .select("id")
                .eq("floor_id", floorId)
                .limit(1)
                .maybeSingle();

              if (!post) {
                const { data: newPost } = await supabase
                  .from("valet_posts")
                  .insert([{ floor_id: floorId, post_name: "Main Post" }])
                  .select()
                  .single();
                post = newPost;
              }

              if (post) {
                await supabase.from("valet_assignments").insert([{
                  valet_id: employee.id,
                  floor_id: floorId,
                  post_id: post.id,
                  assigned_by: req.user?.id || null,
                  is_active: true
                }]);
              }
            }
          }
        }
      } catch (uAssignErr) {
        console.warn("Update hotel assign warning:", uAssignErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Staff updated successfully.",
      user
    });
  } catch (error) {
    console.error(
      "Update staff error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Internal server error."
    });
  }
};

const updateStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message:
          "is_active must be a boolean."
      });
    }

    const {
      data: existingUser,
      error: existingUserError
    } = await supabase
      .from("users")
      .select(
        "id, name, email, role"
      )
      .eq("id", id)
      .single();

    if (
      existingUserError ||
      !existingUser
    ) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found."
      });
    }

    const {
      data: user,
      error
    } = await supabase
      .from("users")
      .update({
        is_active
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !user) {
      return res.status(400).json({
        success: false,
        message:
          error?.message ||
          "Failed to update staff status."
      });
    }

    if (existingUser.role === "valet") {
      const employee =
        await getEmployeeByEmail(
          existingUser.email
        );

      if (employee) {
        const {
          error: employeeError
        } = await supabase
          .from("employees")
          .update({
            is_active
          })
          .eq("id", employee.id);

        if (employeeError) {
          return res.status(400).json({
            success: false,
            message:
              employeeError.message
          });
        }

        // Also update valet assignments active status
        await supabase
          .from("valet_assignments")
          .update({ is_active })
          .eq("valet_id", employee.id);
      }
    } else if (existingUser.role === "manager" || existingUser.role === "parking_admin") {
      // Also update manager assignments active status
      await supabase
        .from("manager_assignments")
        .update({ is_active })
        .eq("manager_id", existingUser.id);
    }

    return res.status(200).json({
      success: true,
      message:
        `Staff ${is_active ? "activated" : "deactivated"} successfully.`,
      user
    });
  } catch (error) {
    console.error(
      "Update staff status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Internal server error."
    });
  }
};

module.exports = {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  updateStaffStatus
};

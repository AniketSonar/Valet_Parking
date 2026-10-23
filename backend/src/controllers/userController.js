
const supabase = require("../config/supabase");

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
      phone
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

    const staff = await Promise.all(
      (users || []).map(async (user) => {
        if (user.role !== "valet") {
          return user;
        }

        const employee =
          await getEmployeeByEmail(user.email);

        return {
          ...user,
          phone: employee?.phone || null,
          employee_id: employee?.id || null,
          employee_is_active:
            employee?.is_active ?? null
        };
      })
    );

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
      }
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

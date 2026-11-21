const supabase = require("../config/supabase");
const { createAuthClient } = supabase;
const { normalizeRole } = require("../middleware/roleMiddleware");

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // separate client: signing in must not turn the shared admin client into this user
    const { data, error } =
      await createAuthClient().auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

    if (error) {
      console.error("SUPABASE LOGIN ERROR:", error);

      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    const authUser = data.user;

    const {
      data: user,
      error: userError
    } = await supabase
      .from("users")
      .select("id, name, email, role, is_active")
      .eq("auth_user_id", authUser.id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found."
      });
    }

    if (user.is_active === false) {
      return res.status(403).json({
        success: false,
        message: "Your joining request is pending approval by the Admin or Branch Manager. Please wait for approval before logging in."
      });
    }

    const normalizedRole = normalizeRole(user.role);
    let assignedHotel = null;

    if (normalizedRole === "manager" || normalizedRole === "parking_admin") {
      const { data: ma } = await supabase
        .from("manager_assignments")
        .select(`
          floor:parking_floors (
            id,
            building:parking_buildings ( id, building_name, address )
          )
        `)
        .eq("manager_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (ma?.floor?.building) {
        assignedHotel = ma.floor.building;
      }
    }

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: {
        ...user,
        role: normalizedRole,
        assigned_hotel_id: assignedHotel?.id || null,
        assigned_hotel_name: assignedHotel?.building_name || null,
        assigned_hotel: assignedHotel
      },
      session: data.session
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const refreshSession = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required."
      });
    }

    const { data, error } = await createAuthClient().auth.refreshSession({
      refresh_token
    });

    if (error || !data?.session) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again."
      });
    }

    return res.status(200).json({
      success: true,
      session: data.session
    });
  } catch (error) {
    console.error("Session refresh error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to refresh session."
    });
  }
};

/*
|--------------------------------------------------------------------------
| CUSTOMER REGISTRATION
|--------------------------------------------------------------------------
*/
const registerCustomer = async (req, res) => {
  let authUserId = null;
  let applicationUserId = null;

  try {
    const {
      name,
      phone,
      email,
      password
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Validate input
    |--------------------------------------------------------------------------
    */
    if (!name || !phone || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Name, phone, email and password are required."
      });
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: "Name is required."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check existing customer
    |--------------------------------------------------------------------------
    */
    const {
      data: existingCustomer,
      error: customerCheckError
    } = await supabase
      .from("customers")
      .select("id, email, phone")
      .or(
        `email.eq.${normalizedEmail},phone.eq.${normalizedPhone}`
      )
      .maybeSingle();

    if (customerCheckError) {
      console.error(
        "Customer existence check error:",
        customerCheckError
      );

      return res.status(500).json({
        success: false,
        message: "Unable to verify customer information."
      });
    }

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message:
          "A customer account already exists with this email or phone number."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check application user
    |--------------------------------------------------------------------------
    */
    const {
      data: existingUser,
      error: userCheckError
    } = await supabase
      .from("users")
      .select("id, email, role")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (userCheckError) {
      console.error(
        "User existence check error:",
        userCheckError
      );

      return res.status(500).json({
        success: false,
        message: "Unable to verify account information."
      });
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account already exists with this email address."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create Supabase Auth User
    |--------------------------------------------------------------------------
    */
    const {
      data: authData,
      error: authError
    } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true
    });

    if (authError || !authData?.user) {
      console.error(
        "Customer auth creation error:",
        authError
      );

      return res.status(400).json({
        success: false,
        message:
          authError?.message ||
          "Unable to create authentication account."
      });
    }

    authUserId = authData.user.id;

    /*
    |--------------------------------------------------------------------------
    | Create application user
    |--------------------------------------------------------------------------
    */
    const {
      data: user,
      error: userError
    } = await supabase
      .from("users")
      .insert([
        {
          auth_user_id: authUserId,
          name: trimmedName,
          email: normalizedEmail,
          role: "customer"
        }
      ])
      .select("id, name, email, role")
      .single();

    if (userError || !user) {
      console.error(
        "Customer application user creation error:",
        userError
      );

      await supabase.auth.admin.deleteUser(authUserId);

      return res.status(400).json({
        success: false,
        message:
          userError?.message ||
          "Unable to create customer account."
      });
    }

    applicationUserId = user.id;

    /*
    |--------------------------------------------------------------------------
    | Create Customer Profile
    |--------------------------------------------------------------------------
    */
    const {
      data: customer,
      error: customerError
    } = await supabase
      .from("customers")
      .insert([
        {
          name: trimmedName,
          phone: normalizedPhone,
          email: normalizedEmail
        }
      ])
      .select("id, name, phone, email")
      .single();

    if (customerError || !customer) {
      console.error(
        "Customer profile creation error:",
        customerError
      );

      /*
      | Roll back application user
      */
      if (applicationUserId) {
        await supabase
          .from("users")
          .delete()
          .eq("id", applicationUserId);
      }

      /*
      | Roll back Supabase Auth user
      */
      if (authUserId) {
        await supabase.auth.admin.deleteUser(authUserId);
      }

      return res.status(400).json({
        success: false,
        message:
          customerError?.message ||
          "Unable to create customer profile."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Success
    |--------------------------------------------------------------------------
    */
    return res.status(201).json({
      success: true,
      message: "Customer account created successfully.",
      user,
      customer
    });

  } catch (error) {
    console.error(
      "Customer registration error:",
      error
    );

    /*
    |--------------------------------------------------------------------------
    | Emergency rollback
    |--------------------------------------------------------------------------
    */
    try {
      if (applicationUserId) {
        await supabase
          .from("users")
          .delete()
          .eq("id", applicationUserId);
      }

      if (authUserId) {
        await supabase.auth.admin.deleteUser(authUserId);
      }
    } catch (rollbackError) {
      console.error(
        "Customer registration rollback error:",
        rollbackError
      );
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to create customer account."
    });
  }
};

/*
|--------------------------------------------------------------------------
| CUSTOMER PHONE LOGIN (no password – used from WhatsApp dashboard link)
|--------------------------------------------------------------------------
*/
const { generateCustomerToken } = require("../utils/customerToken");

const customerPhoneLogin = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required."
      });
    }

    const raw = String(phone).trim();
    const digits = raw.replace(/\D/g, "");
    const last10 = digits.slice(-10);

    const candidatePhones = [
      raw,
      digits,
      last10,
      `+91${last10}`,
      `91${last10}`,
      `0${last10}`,
      `+${digits}`
    ].filter(Boolean);

    const uniqueCandidates = [...new Set(candidatePhones)];

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name, phone, email, created_at")
      .in("phone", uniqueCandidates)
      .limit(1)
      .maybeSingle();

    let foundCustomer = customer;

    // Fallback: search by last 10 digits in case formatted with dashes/spaces
    if (!foundCustomer && last10.length === 10) {
      const { data: allCust } = await supabase
        .from("customers")
        .select("id, name, phone, email, created_at");

      foundCustomer = (allCust || []).find((c) => {
        const cDigits = String(c.phone || "").replace(/\D/g, "");
        return cDigits === digits || (last10 && cDigits.slice(-10) === last10);
      });
    }

    // If still not found, auto-create customer record so any newly arrived customer gets access
    if (!foundCustomer) {
      const { data: newCust, error: newCustErr } = await supabase
        .from("customers")
        .insert([{
          name: "Customer",
          phone: last10 || raw
        }])
        .select("id, name, phone, email, created_at")
        .single();

      if (!newCustErr && newCust) {
        foundCustomer = newCust;
      }
    }

    if (!foundCustomer) {
      return res.status(404).json({
        success: false,
        message: "No customer found with this phone number."
      });
    }

    const token = generateCustomerToken(foundCustomer);

    return res.status(200).json({
      success: true,
      message: "Customer mobile login successful.",
      user: {
        id: foundCustomer.id,
        name: foundCustomer.name,
        email: foundCustomer.email,
        phone: foundCustomer.phone,
        role: "customer"
      },
      customer: foundCustomer,
      session: {
        access_token: token,
        refresh_token: token
      }
    });
  } catch (error) {
    console.error("Customer phone login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

/*
|--------------------------------------------------------------------------
| PUBLIC BRANCHES (for staff registration dropdown)
|--------------------------------------------------------------------------
*/
const getPublicBranches = async (req, res) => {
  try {
    const { data: buildings, error } = await supabase
      .from("parking_buildings")
      .select("id, building_name, address, status")
      .order("building_name", { ascending: true });

    if (error) throw error;

    const activeBuildings = (buildings || []).filter((b) => b.status !== "inactive");
    const buildingIds = activeBuildings.map((building) => building.id);
    const floorsByBuilding = new Map();

    if (buildingIds.length > 0) {
      const { data: floors, error: floorError } = await supabase
        .from("parking_floors")
        .select("id, building_id, floor_name, floor_number, status")
        .in("building_id", buildingIds)
        .order("floor_number", { ascending: true });

      if (floorError) throw floorError;

      (floors || [])
        .filter((floor) => floor.status !== "inactive")
        .forEach((floor) => {
          const branchFloors = floorsByBuilding.get(floor.building_id) || [];
          branchFloors.push({
            id: floor.id,
            floor_name: floor.floor_name,
            floor_number: floor.floor_number
          });
          floorsByBuilding.set(floor.building_id, branchFloors);
        });
    }

    const list = activeBuildings.map((b) => {
      let loc = b.address || "";
      if (loc.includes(" | ")) {
        loc = loc.split(" | ")[1] || loc.split(" | ")[0];
      }
      return {
        id: b.id,
        building_name: b.building_name,
        location: loc || "City Location",
        floors: floorsByBuilding.get(b.id) || []
      };
    });

    return res.status(200).json({ success: true, branches: list });
  } catch (error) {
    console.error("getPublicBranches error:", error);
    return res.status(500).json({ success: false, message: "Failed to load hotel branches." });
  }
};

/*
|--------------------------------------------------------------------------
| STAFF REGISTRATION (New joining request -> pending approval by Admin/Manager)
|--------------------------------------------------------------------------
*/
const registerStaff = async (req, res) => {
  try {
    const { name, email, phone, password, role, hotel_id, floor_id, position_name } = req.body;

    if (!name || !email || !password || !hotel_id) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, password, and hotel branch are required."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const staffRole = role === "manager" ? "manager" : "valet";

    let selectedFloor = null;
    if (staffRole === "valet") {
      if (!floor_id) {
        return res.status(400).json({
          success: false,
          message: "Please select a parking level."
        });
      }

      const { data: floor, error: floorError } = await supabase
        .from("parking_floors")
        .select("id, building_id")
        .eq("id", floor_id)
        .eq("building_id", hotel_id)
        .neq("status", "inactive")
        .maybeSingle();

      if (floorError) throw floorError;
      if (!floor) {
        return res.status(400).json({
          success: false,
          message: "The selected parking level is not available for this branch."
        });
      }
      selectedFloor = floor;
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists."
      });
    }

    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true
    });

    if (authError || !authData.user) {
      return res.status(400).json({
        success: false,
        message: authError?.message || "Failed to create authentication credentials."
      });
    }

    // 2. Insert into users with is_active: false (pending approval!)
    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert([
        {
          auth_user_id: authData.user.id,
          name: name.trim(),
          email: normalizedEmail,
          role: staffRole,
          is_active: false // PENDING APPROVAL
        }
      ])
      .select()
      .single();

    if (userError || !newUser) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({
        success: false,
        message: userError?.message || "Failed to register staff profile."
      });
    }

    // 3. Pre-assign to branch (inactive until accepted)
    if (staffRole === "valet") {
      const { data: emp, error: empErr } = await supabase
        .from("employees")
        .insert([
          {
            name: name.trim(),
            email: normalizedEmail,
            phone: phone ? phone.trim() : null,
            role: "valet",
            is_active: false
          }
        ])
        .select()
        .single();

      if (empErr || !emp) {
        await supabase.from("users").delete().eq("id", newUser.id);
        await supabase.auth.admin.deleteUser(authData.user.id);
        return res.status(400).json({
          success: false,
          message: empErr?.message || "Failed to create the staff record."
        });
      }

      const targetPost = position_name ? String(position_name).trim() : "Main Post";
      let { data: post, error: postError } = await supabase
        .from("valet_posts")
        .select("id")
        .eq("floor_id", selectedFloor.id)
        .ilike("post_name", targetPost)
        .limit(1)
        .maybeSingle();

      if (postError) {
        await supabase.from("employees").delete().eq("id", emp.id);
        await supabase.from("users").delete().eq("id", newUser.id);
        await supabase.auth.admin.deleteUser(authData.user.id);
        return res.status(400).json({ success: false, message: postError.message });
      }

      if (!post) {
        const { data: newPost, error: newPostError } = await supabase
          .from("valet_posts")
          .insert([{ floor_id: selectedFloor.id, post_name: targetPost }])
          .select("id")
          .single();
        if (newPostError || !newPost) {
          await supabase.from("employees").delete().eq("id", emp.id);
          await supabase.from("users").delete().eq("id", newUser.id);
          await supabase.auth.admin.deleteUser(authData.user.id);
          return res.status(400).json({
            success: false,
            message: newPostError?.message || "Failed to create the valet post."
          });
        }
        post = newPost;
      }

      const { error: assignmentError } = await supabase.from("valet_assignments").insert([{
        valet_id: emp.id,
        floor_id: selectedFloor.id,
        post_id: post.id,
        is_active: false
      }]);

      if (assignmentError) {
        await supabase.from("employees").delete().eq("id", emp.id);
        await supabase.from("users").delete().eq("id", newUser.id);
        await supabase.auth.admin.deleteUser(authData.user.id);
        return res.status(400).json({
          success: false,
          message: assignmentError.message || "Failed to assign the selected parking level."
        });
      }
    } else if (staffRole === "manager") {
      let { data: floors } = await supabase
        .from("parking_floors")
        .select("id")
        .eq("building_id", hotel_id);

      if (floors && floors.length > 0) {
        const records = floors.map((f) => ({
          manager_id: newUser.id,
          floor_id: f.id,
          is_active: false
        }));
        await supabase.from("manager_assignments").insert(records);
      }
    }

    // 4. In-app notification for Super Admin & this specific Branch Manager
    let activeAdminCount = 0;
    let activeManagerCount = 0;
    let registrationNotificationError = false;
    try {
      const { data: building, error: buildingError } = await supabase
        .from("parking_buildings")
        .select("building_name")
        .eq("id", hotel_id)
        .maybeSingle();

      if (buildingError) throw buildingError;

      const branchName = building?.building_name || "Hotel Branch";
      const notifMsg = `New staff joining request: ${name.trim()} (${staffRole === "manager" ? "Branch Manager" : "Valet Staff"}) has requested to join ${branchName}. Approval required.`;

      // Find Super Admins
      const { data: superAdmins, error: adminError } = await supabase
        .from("users")
        .select("id, role")
        .eq("role", "super_admin")
        .eq("is_active", true);

      if (adminError) throw adminError;

      // Find Managers assigned to this specific hotel branch
      let branchManagers = [];
      const { data: floors, error: floorsError } = await supabase
        .from("parking_floors")
        .select("id")
        .eq("building_id", hotel_id);

      if (floorsError) throw floorsError;

      if (floors && floors.length > 0) {
        const floorIds = floors.map((f) => f.id);
        const { data: mgrAssignments, error: assignmentsError } = await supabase
          .from("manager_assignments")
          .select("manager_id")
          .in("floor_id", floorIds)
          .eq("is_active", true);

        if (assignmentsError) throw assignmentsError;

        if (mgrAssignments && mgrAssignments.length > 0) {
          const mgrIds = [...new Set(mgrAssignments.map((m) => m.manager_id))];
          const { data: mgrUsers, error: managersError } = await supabase
            .from("users")
            .select("id, role")
            .in("id", mgrIds)
            .eq("is_active", true);
          if (managersError) throw managersError;
          if (mgrUsers) branchManagers = mgrUsers;
        }
      }

      // Combine super admins and branch managers (deduplicating by ID)
      const recipientMap = new Map();
      (superAdmins || []).forEach((u) => recipientMap.set(u.id, u));
      (branchManagers || []).forEach((u) => recipientMap.set(u.id, u));

      const notifsToInsert = Array.from(recipientMap.values()).map((recipient) => ({
        parking_session_id: null,
        recipient_type: recipient.role === "parking_admin" ? "manager" : recipient.role,
        recipient_id: recipient.id,
        message: notifMsg,
        channel: "in_app",
        status: "sent",
        sent_at: new Date().toISOString()
      }));

      if (notifsToInsert.length > 0) {
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert(notifsToInsert);
        if (notificationError) throw notificationError;
        activeAdminCount = (superAdmins || []).length;
        activeManagerCount = branchManagers.length;
      }
    } catch (notifErr) {
      registrationNotificationError = true;
      console.warn("Notification insert warning:", notifErr.message);
    }

    let submissionMessage = "Joining request submitted successfully!";
    if (registrationNotificationError) {
      submissionMessage += " Notification delivery failed; please contact the Admin.";
    } else if (activeAdminCount && activeManagerCount) {
      submissionMessage += " Your request was sent to the Admin and Branch Manager.";
    } else if (activeAdminCount) {
      submissionMessage += " Your request was sent to the Admin.";
    } else if (activeManagerCount) {
      submissionMessage += " Your request was sent to the Branch Manager.";
    } else {
      submissionMessage += " No active approver was found; please contact the hotel branch.";
    }

    return res.status(201).json({
      success: true,
      message: `${submissionMessage} Once accepted, you will be able to log in.`
    });
  } catch (error) {
    console.error("Staff registration error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit joining request."
    });
  }
};

module.exports = {
  login,
  refreshSession,
  registerCustomer,
  customerPhoneLogin,
  getPublicBranches,
  registerStaff
};
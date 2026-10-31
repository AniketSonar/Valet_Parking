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
      .select("id, name, email, role")
      .eq("auth_user_id", authUser.id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: {
        ...user,
        role: normalizeRole(user.role)
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

    const normalizedPhone = phone.trim();

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name, phone, email, created_at")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (customerError || !customer) {
      return res.status(404).json({
        success: false,
        message: "No customer found with this phone number."
      });
    }

    const token = generateCustomerToken(customer);

    return res.status(200).json({
      success: true,
      message: "Customer mobile login successful.",
      user: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        role: "customer"
      },
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

module.exports = {
  login,
  refreshSession,
  registerCustomer,
  customerPhoneLogin
};
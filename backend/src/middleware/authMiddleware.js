const supabase = require("../config/supabase");
const { normalizeRole } = require("./roleMiddleware");
const { verifyCustomerToken } = require("../utils/customerToken");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token required."
      });
    }

    const token = authHeader.split(" ")[1];

    // Customer mobile access session token
    if (token.startsWith("cust_phone_")) {
      const payload = verifyCustomerToken(token);
      if (!payload?.customerId) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired mobile session."
        });
      }

      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .select("*")
        .eq("id", payload.customerId)
        .maybeSingle();

      if (custErr || !customer) {
        return res.status(401).json({
          success: false,
          message: "Customer account not found."
        });
      }

      req.customer = customer;
      req.user = {
        id: customer.id,
        name: customer.name || "Customer",
        email: customer.email || `${customer.phone}@guest.valet`,
        phone: customer.phone,
        role: "customer"
      };
      req.authUser = {
        id: customer.id,
        email: req.user.email
      };

      return next();
    }

    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token."
      });
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("auth_user_id", authData.user.id)
      .single();

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        message: "User not found."
      });
    }

    req.user = {
      ...user,
      role: normalizeRole(user.role)
    };
    req.authUser = authData.user;

    next();

  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed."
    });
  }
};

module.exports = authenticate;

const ROLE_ALIASES = {
  super_admin: "super_admin",
  parking_admin: "manager",
  manager: "manager",
  reception_security: "valet",
  cashier: "valet",
  valet_attendant: "valet",
  valet: "valet",
  customer: "customer"
};

const normalizeRole = (role) => ROLE_ALIASES[role] || role;

const authorizeRoles = (...allowedRoles) => {
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated."
      });
    }

    if (!normalizedAllowedRoles.includes(normalizeRole(req.user.role))) {
      return res.status(403).json({
        success: false,
        message: "Access denied."
      });
    }

    next();
  };
};

module.exports = authorizeRoles;
module.exports.normalizeRole = normalizeRole;
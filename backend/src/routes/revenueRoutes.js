const express = require("express");

const { getRevenue } = require("../controllers/revenueController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// Revenue is visible to the super admin and managers only.
router.get("/", authenticate, authorizeRoles("super_admin", "manager"), getRevenue);

module.exports = router;

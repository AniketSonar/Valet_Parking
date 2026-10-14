const express = require("express");
const { getDashboardStats } = require("../controllers/adminController");
const { getParkingReports } = require("../controllers/parkingAdminController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/dashboard",
  authenticate,
  authorizeRoles("super_admin"),
  getDashboardStats
);

router.get(
  "/reports",
  authenticate,
  authorizeRoles("super_admin"),
  getParkingReports
);

module.exports = router;
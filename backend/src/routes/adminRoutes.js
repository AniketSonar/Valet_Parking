const express = require("express");
const {
  getDashboardStats,
  getDashboardAnalytics,
  getRevenuePerformance,
} = require("../controllers/adminController");
const { getParkingReports } = require("../controllers/parkingAdminController");
const area = require("../controllers/areaController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/dashboard",
  authenticate,
  authorizeRoles("super_admin", "manager"),
  getDashboardStats
);

router.get(
  "/dashboard-analytics",
  authenticate,
  authorizeRoles("super_admin", "manager"),
  getDashboardAnalytics
);

router.get(
  "/revenue-performance",
  authenticate,
  authorizeRoles("super_admin", "manager"),
  getRevenuePerformance
);

router.get(
  "/reports",
  authenticate,
  authorizeRoles("super_admin", "manager"),
  getParkingReports
);

router.get(
  "/hotels",
  authenticate,
  authorizeRoles("super_admin", "manager"),
  area.getBuildings
);

module.exports = router;
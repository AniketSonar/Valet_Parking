const express = require("express");
const { getDashboardStats } = require("../controllers/adminController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/dashboard",
  authenticate,
  authorizeRoles("super_admin"),
  getDashboardStats
);

module.exports = router;
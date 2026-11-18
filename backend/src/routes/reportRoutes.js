const express = require("express");

const {
  getReportValets,
  getValetReport,
  exportValetReport,
  getSystemReports
} = require("../controllers/reportController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

const allowed = authorizeRoles("super_admin", "manager");

router.get("/valets", authenticate, allowed, getReportValets);
router.get("/valet-sessions", authenticate, allowed, getValetReport);
router.get("/valet-sessions/export", authenticate, allowed, exportValetReport);
router.get("/system-reports", authenticate, allowed, getSystemReports);

module.exports = router;

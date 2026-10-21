const express = require("express");

const {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  getIncidentsByParkingSession
} = require("../controllers/incidentController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorizeRoles(
    "reception_security",
    "valet",
    "cashier",
    "parking_admin",
    "super_admin"
  ),
  createIncident
);

router.get(
  "/",
  authenticate,
  authorizeRoles(
    "reception_security",
    "valet",
    "cashier",
    "parking_admin",
    "super_admin"
  ),
  getIncidents
);

router.get(
  "/session/:parking_session_id",
  authenticate,
  authorizeRoles(
    "reception_security",
    "valet",
    "cashier",
    "parking_admin",
    "super_admin"
  ),
  getIncidentsByParkingSession
);

router.get(
  "/:id",
  authenticate,
  authorizeRoles(
    "reception_security",
    "valet",
    "cashier",
    "parking_admin",
    "super_admin"
  ),
  getIncidentById
);

router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  updateIncidentStatus
);

module.exports = router;
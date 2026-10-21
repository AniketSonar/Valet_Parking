const express = require("express");

const {
  getParkingSessions,
  getActiveParkingSessions,
  getReceptionDashboard,
  createParkingSession,
  requestRetrieval,
  verifyTicket,
  completeReturn,
  getReceptionValets
} = require("../controllers/parkingSessionController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

const RECEPTION_ROLES = [
  "cashier",
  "reception_security",
  "parking_admin",
  "super_admin"
];

router.get(
  "/dashboard",
  authenticate,
  authorizeRoles(...RECEPTION_ROLES),
  getReceptionDashboard
);

router.get(
  "/sessions",
  authenticate,
  authorizeRoles(...RECEPTION_ROLES),
  getParkingSessions
);

router.get(
  "/active-sessions",
  authenticate,
  authorizeRoles(...RECEPTION_ROLES),
  getActiveParkingSessions
);

router.get(
  "/valets",
  authenticate,
  authorizeRoles(...RECEPTION_ROLES),
  getReceptionValets
);

router.post(
  "/sessions",
  authenticate,
  authorizeRoles(...RECEPTION_ROLES),
  createParkingSession
);

router.patch(
  "/sessions/:id/request-retrieval",
  authenticate,
  authorizeRoles(...RECEPTION_ROLES),
  requestRetrieval
);

router.patch(
  "/sessions/:id/complete",
  authenticate,
  authorizeRoles(...RECEPTION_ROLES),
  completeReturn
);

router.get(
  "/tickets/:ticket_code",
  authenticate,
  authorizeRoles(
    "cashier",
    "reception_security",
    "parking_admin",
    "super_admin"
  ),
  verifyTicket
);

module.exports = router;
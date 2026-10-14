const express = require("express");

const {
  getParkingSessions,
  createParkingSession,
  quickCheckIn,
  assignParkingSlot,
  assignValet,
  requestRetrieval,
  startRetrieval,
  markReadyForPickup,
  completeReturn,
  verifyExit,
  getRetrievalRequests,
  getParkingHistory,
  getValetDashboard
} = require("../controllers/parkingSessionController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  getParkingSessions
);

router.post(
  "/",
  authenticate,
  authorizeRoles(
    "parking_admin",
    "super_admin",
    "valet",
    "valet_attendant"
  ),
  createParkingSession
);

router.post(
  "/quick-check-in",
  authenticate,
  authorizeRoles(
    "parking_admin",
    "super_admin",
    "valet",
    "valet_attendant"
  ),
  quickCheckIn
);

router.post(
  "/verify-exit",
  authenticate,
  authorizeRoles(
    "cashier",
    "reception_security",
    "parking_admin",
    "super_admin"
  ),
  verifyExit
);
router.patch(
  "/:id/assign-slot",
  authenticate,
  authorizeRoles("parking_admin", "super_admin", "valet", "valet_attendant"),
  assignParkingSlot
);

router.patch(
  "/:id/slot",
  authenticate,
  authorizeRoles("parking_admin", "super_admin", "valet", "valet_attendant"),
  assignParkingSlot
);

router.patch(
  "/:id/assign-valet",
  authenticate,
  authorizeRoles(
    "parking_admin",
    "super_admin",
    "valet",
    "valet_attendant"
  ),
  assignValet
);

router.patch(
  "/:id/valet",
  authenticate,
  authorizeRoles(
    "parking_admin",
    "super_admin",
    "valet",
    "valet_attendant"
  ),
  assignValet
);

router.patch(
  "/:id/request-retrieval",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  requestRetrieval
);

router.patch(
  "/:id/start-retrieval",
  authenticate,
  authorizeRoles(
    "parking_admin",
    "super_admin",
    "valet",
    "valet_attendant"
  ),
  startRetrieval
);

router.patch(
  "/:id/ready",
  authenticate,
  authorizeRoles(
    "parking_admin",
    "super_admin",
    "valet",
    "valet_attendant"
  ),
  markReadyForPickup
);

router.patch(
  "/:id/ready-for-pickup",
  authenticate,
  authorizeRoles(
    "parking_admin",
    "super_admin",
    "valet",
    "valet_attendant"
  ),
  markReadyForPickup
);

router.patch(
  "/:id/complete",
  authenticate,
  authorizeRoles(
    "parking_admin",
    "super_admin",
    "valet",
    "valet_attendant"
  ),
  completeReturn
);

router.patch(
  "/:id/complete-return",
  authenticate,
  authorizeRoles(
    "parking_admin",
    "super_admin",
    "valet",
    "valet_attendant"
  ),
  completeReturn
);

router.get(
  "/retrievals",
  authenticate,
  authorizeRoles(
    "parking_admin",
    "super_admin"
  ),
  getRetrievalRequests
);

router.get(
  "/retrieval-requests",
  authenticate,
  authorizeRoles(
    "parking_admin",
    "super_admin"
  ),
  getRetrievalRequests
);

router.get(
  "/history",
  authenticate,
  authorizeRoles(
    "parking_admin",
    "super_admin"
  ),
  getParkingHistory
);

router.get(
  "/valet-dashboard",
  authenticate,
  authorizeRoles("valet", "valet_attendant"),
  getValetDashboard
);

module.exports = router;
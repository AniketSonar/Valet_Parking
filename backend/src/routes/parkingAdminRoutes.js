const express = require("express");

const {
  getParkingAdminDashboard,
  getParkingStaff,
  getParkingReports,
  getParkingAdminProfile
} = require("../controllers/parkingAdminController");

const {
  createStaffAssignment,
  getStaffAssignments,
  deactivateStaffAssignment
} = require("../controllers/staffAssignmentController");

const {
  getParkingSessions,
  getRetrievalRequests,
  getParkingHistory,
  createParkingSession,
  assignParkingSlot,
  assignValet,
  requestRetrieval,
  startRetrieval,
  markReadyForPickup,
  completeReturn
} = require("../controllers/parkingSessionController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/dashboard",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  getParkingAdminDashboard
);

router.get(
  "/sessions",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  getParkingSessions
);

router.post(
  "/sessions",
  authenticate,
  authorizeRoles(
    "parking_admin",
    "super_admin",
    "valet_attendant",
    "valet"
  ),
  createParkingSession
);

router.patch(
  "/sessions/:id/slot",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  assignParkingSlot
);

router.patch(
  "/sessions/:id/valet",
  authenticate,
  authorizeRoles("parking_admin", "super_admin", "valet_attendant", "valet"),
  assignValet
);

router.patch(
  "/sessions/:id/request-retrieval",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  requestRetrieval
);

router.patch(
  "/sessions/:id/start-retrieval",
  authenticate,
  authorizeRoles("parking_admin", "super_admin", "valet", "valet_attendant"),
  startRetrieval
);

router.patch(
  "/sessions/:id/ready",
  authenticate,
  authorizeRoles("parking_admin", "super_admin", "valet", "valet_attendant"),
  markReadyForPickup
);

router.patch(
  "/sessions/:id/complete",
  authenticate,
  authorizeRoles("parking_admin", "super_admin", "valet", "valet_attendant"),
  completeReturn
);

router.get(
  "/retrieval-requests",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  getRetrievalRequests
);

router.get(
  "/history",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  getParkingHistory
);

router.get(
  "/staff",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  getParkingStaff
);

router.get(
  "/reports",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  getParkingReports
);

router.get(
  "/profile",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  getParkingAdminProfile
);

router.post(
  "/staff-assignments",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  createStaffAssignment
);

router.get(
  "/staff-assignments",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  getStaffAssignments
);

router.patch(
  "/staff-assignments/:id/deactivate",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  deactivateStaffAssignment
);

module.exports = router;
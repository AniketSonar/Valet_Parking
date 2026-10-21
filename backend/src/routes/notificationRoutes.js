const express = require("express");

const {
  createNotification,
  getNotifications,
  updateNotificationStatus,
  getMyNotifications
} = require("../controllers/notificationController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorizeRoles("cashier", "parking_admin", "super_admin"),
  createNotification
);

router.get(
  "/",
  authenticate,
  authorizeRoles("cashier", "reception_security", "parking_admin", "super_admin", "valet", "valet_attendant"),
  getNotifications
);

router.get(
  "/my",
  authenticate,
  authorizeRoles(
    "customer",
    "cashier",
    "reception_security",
    "parking_admin",
    "super_admin",
    "valet",
    "valet_attendant"
  ),
  getMyNotifications
);

router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles("cashier", "parking_admin", "super_admin"),
  updateNotificationStatus
);

module.exports = router;
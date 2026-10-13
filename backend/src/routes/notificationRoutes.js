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
  authorizeRoles("cashier", "reception_security", "parking_admin", "super_admin", "valet"),
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
    "valet"
  ),
  getMyNotifications
);

router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles("cashier", "parking_admin", "super_admin"),
  updateNotificationStatus
);

router.get(
  "/my",
  authenticate,
  authorizeRoles("customer"),
  getMyNotifications
);
module.exports = router;
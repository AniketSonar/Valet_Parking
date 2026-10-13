const express = require("express");

const {
  getAllKeys,
  getKeyById,
  getKeyBySession,
  createKey,
  updateKey,
  assignKey,
  returnKey,
  markKeyLost,
  getKeyHistory
} = require("../controllers/keyController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

const KEY_VIEW_ROLES = [
  "super_admin",
  "parking_admin",
  "valet",
  "reception_security",
  "cashier"
];

router.get(
  "/",
  authenticate,
  authorizeRoles(...KEY_VIEW_ROLES),
  getAllKeys
);

router.get(
  "/session/:session_id",
  authenticate,
  authorizeRoles(...KEY_VIEW_ROLES),
  getKeyBySession
);

router.get(
  "/:id",
  authenticate,
  authorizeRoles(...KEY_VIEW_ROLES),
  getKeyById
);

router.post(
  "/",
  authenticate,
  authorizeRoles("super_admin", "parking_admin"),
  createKey
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("super_admin", "parking_admin"),
  updateKey
);

router.patch(
  "/:id/assign",
  authenticate,
  authorizeRoles("super_admin", "parking_admin"),
  assignKey
);

router.patch(
  "/:id/return",
  authenticate,
  authorizeRoles("super_admin", "parking_admin", "valet"),
  returnKey
);

router.patch(
  "/:id/lost",
  authenticate,
  authorizeRoles("super_admin", "parking_admin"),
  markKeyLost
);

router.get(
  "/:id/history",
  authenticate,
  authorizeRoles(...KEY_VIEW_ROLES),
  getKeyHistory
);

module.exports = router;
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

const KEY_MANAGE_ROLES = [
  "super_admin",
  "parking_admin",
  "reception_security"
];

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
  authorizeRoles(...KEY_MANAGE_ROLES),
  createKey
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles(...KEY_MANAGE_ROLES),
  updateKey
);

router.patch(
  "/:id/assign",
  authenticate,
  authorizeRoles(...KEY_MANAGE_ROLES),
  assignKey
);

router.patch(
  "/:id/return",
  authenticate,
  authorizeRoles(...KEY_MANAGE_ROLES, "valet"),
  returnKey
);

router.patch(
  "/:id/lost",
  authenticate,
  authorizeRoles(...KEY_MANAGE_ROLES),
  markKeyLost
);

router.get(
  "/:id/history",
  authenticate,
  authorizeRoles(...KEY_VIEW_ROLES),
  getKeyHistory
);

module.exports = router;
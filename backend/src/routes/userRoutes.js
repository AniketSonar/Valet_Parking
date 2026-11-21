const express = require("express");

const {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  updateStaffStatus
} = require("../controllers/userController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorizeRoles("super_admin", "manager"),
  createStaff
);

router.get(
  "/",
  authenticate,
  authorizeRoles("super_admin", "manager", "parking_admin"),
  getAllStaff
);

router.get(
  "/:id",
  authenticate,
  authorizeRoles("super_admin"),
  getStaffById
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("super_admin"),
  updateStaff
);
router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles("super_admin", "manager"),
  updateStaffStatus
);


module.exports = router;
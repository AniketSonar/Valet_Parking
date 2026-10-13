const express = require("express");

const {
  createParkingSlot,
  getParkingSlots,
  getValetParkingSlots,
  getParkingSlotById,
  updateParkingSlot,
  updateParkingSlotStatus
} = require("../controllers/parkingSlotController");
const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorizeRoles("super_admin", "parking_admin"),
  createParkingSlot
);

router.get(
  "/",
  authenticate,
  authorizeRoles("super_admin", "parking_admin"),
  getParkingSlots
);

router.get(
  "/valet",
  authenticate,
  authorizeRoles("valet"),
  getValetParkingSlots
);

router.get(
  "/:id",
  authenticate,
  authorizeRoles("super_admin", "parking_admin"),
  getParkingSlotById
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("super_admin", "parking_admin"),
  updateParkingSlot
);

router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles("super_admin", "parking_admin"),
  updateParkingSlotStatus
);
module.exports = router;
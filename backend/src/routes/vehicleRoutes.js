const express = require("express");

const {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle
} = require("../controllers/vehicleController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

const VEHICLE_ACCESS_ROLES = [
  "cashier",
  "reception_security",
  "parking_admin",
  "super_admin",
  "valet_attendant",
  "valet"
];

router.post(
  "/",
  authenticate,
  authorizeRoles(...VEHICLE_ACCESS_ROLES),
  createVehicle
);

router.get(
  "/",
  authenticate,
  authorizeRoles(...VEHICLE_ACCESS_ROLES),
  getVehicles
);

router.get(
  "/:id",
  authenticate,
  authorizeRoles(...VEHICLE_ACCESS_ROLES),
  getVehicleById
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles(...VEHICLE_ACCESS_ROLES),
  updateVehicle
);

module.exports = router;
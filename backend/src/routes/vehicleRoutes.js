const express = require("express");

const {
  createVehicle,
  getVehicles,
  getVehicleById
} = require("../controllers/vehicleController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorizeRoles(
    "cashier",
    "parking_admin",
    "super_admin",
    "valet_attendant"
  ),
  createVehicle
);

router.get(
  "/",
  authenticate,
  authorizeRoles(
    "cashier",
    "parking_admin",
    "super_admin",
    "valet_attendant"
  ),
  getVehicles
);

router.get(
  "/:id",
  authenticate,
  authorizeRoles(
    "cashier",
    "parking_admin",
    "super_admin",
    "valet_attendant"
  ),
  getVehicleById
);

module.exports = router;
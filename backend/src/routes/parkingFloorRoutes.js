const express = require("express");

const {
  createParkingFloor,
  getParkingFloors
} = require("../controllers/parkingFloorController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  createParkingFloor
);

router.get(
  "/",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  getParkingFloors
);

console.log(
  "PARKING FLOOR ROUTES:",
  router.stack.map(r => ({
    path: r.route?.path,
    methods: r.route?.methods
  }))
);

module.exports = router;
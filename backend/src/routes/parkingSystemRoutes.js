const express = require("express");

const {
  createParkingSystem,
  getParkingSystems
} = require("../controllers/parkingSystemController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorizeRoles("parking_admin"),
  createParkingSystem
);

router.get(
  "/",
  authenticate,
  authorizeRoles("parking_admin"),
  getParkingSystems
);

module.exports = router;
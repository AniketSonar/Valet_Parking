const express = require("express");

const {
  createParkingPosition,
  getParkingPositions
} = require("../controllers/parkingPositionController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorizeRoles("parking_admin"),
  createParkingPosition
);

router.get(
  "/",
  authenticate,
  authorizeRoles("parking_admin"),
  getParkingPositions
);

module.exports = router;
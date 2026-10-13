const express = require("express");

const {
  createParkingBooking,
  getParkingBookings,
  getParkingBookingById,
  arriveParkingBooking
} = require("../controllers/parkingBookingController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorizeRoles("cashier", "parking_admin", "super_admin"),
  createParkingBooking
);

router.get(
  "/",
  authenticate,
  authorizeRoles("cashier", "parking_admin", "super_admin"),
  getParkingBookings
);

router.get(
  "/:id",
  authenticate,
  authorizeRoles("cashier", "parking_admin", "super_admin"),
  getParkingBookingById
);
router.patch(
  "/:id/arrive",
  authenticate,
  authorizeRoles("cashier", "parking_admin", "super_admin"),
  arriveParkingBooking
);
module.exports = router;
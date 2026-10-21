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

const BOOKING_STAFF_ROLES = [
  "cashier",
  "reception_security",
  "parking_admin",
  "super_admin",
  "valet",
  "valet_attendant"
];

router.post(
  "/",
  authenticate,
  authorizeRoles(...BOOKING_STAFF_ROLES),
  createParkingBooking
);

router.get(
  "/",
  authenticate,
  authorizeRoles(...BOOKING_STAFF_ROLES),
  getParkingBookings
);

router.get(
  "/:id",
  authenticate,
  authorizeRoles(...BOOKING_STAFF_ROLES),
  getParkingBookingById
);
router.patch(
  "/:id/arrive",
  authenticate,
  authorizeRoles(...BOOKING_STAFF_ROLES),
  arriveParkingBooking
);
module.exports = router;
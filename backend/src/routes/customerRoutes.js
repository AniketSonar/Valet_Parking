const express = require("express");

const {
  createCustomer,
  getCustomers,
  getCustomerById,
  deleteCustomer,
  getCustomerDashboard,
  getCustomerParkingHistory,
  requestCustomerRetrieval,
  getCustomerVehicles,
  cancelCustomerRetrieval,
  getCustomerProfile,
  createCustomerBooking,
  getCustomerBookings,
  getCustomerBookingById,
  cancelCustomerBooking
} = require("../controllers/customerController");

const {
  getCustomerPayments,
  downloadCustomerInvoice
} = require("../controllers/paymentController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

const STAFF_AND_CUSTOMER_ROLES = [
  "cashier",
  "reception_security",
  "parking_admin",
  "super_admin",
  "valet_attendant",
  "valet",
  "customer"
];

router.post(
  "/",
  authenticate,
  authorizeRoles(...STAFF_AND_CUSTOMER_ROLES),
  createCustomer
);

router.get(
  "/",
  authenticate,
  authorizeRoles(...STAFF_AND_CUSTOMER_ROLES),
  getCustomers
);

router.get(
  "/portal/dashboard",
  authenticate,
  authorizeRoles("customer"),
  getCustomerDashboard
);

router.get(
  "/portal/vehicles",
  authenticate,
  authorizeRoles("customer"),
  getCustomerVehicles
);

router.get(
  "/portal/history",
  authenticate,
  authorizeRoles("customer"),
  getCustomerParkingHistory
);

router.get(
  "/portal/payments",
  authenticate,
  authorizeRoles("customer"),
  getCustomerPayments
);

router.get(
  "/portal/payments/:id/invoice",
  authenticate,
  authorizeRoles("customer"),
  downloadCustomerInvoice
);

router.get(
  "/portal/profile",
  authenticate,
  authorizeRoles("customer"),
  getCustomerProfile
);

router.post(
  "/portal/bookings",
  authenticate,
  authorizeRoles("customer"),
  createCustomerBooking
);

router.get(
  "/portal/bookings",
  authenticate,
  authorizeRoles("customer"),
  getCustomerBookings
);

router.get(
  "/portal/bookings/:id",
  authenticate,
  authorizeRoles("customer"),
  getCustomerBookingById
);

router.patch(
  "/portal/bookings/:id/cancel",
  authenticate,
  authorizeRoles("customer"),
  cancelCustomerBooking
);

router.patch(
  "/portal/retrieval/:id",
  authenticate,
  authorizeRoles("customer"),
  requestCustomerRetrieval
);

router.patch(
  "/portal/retrieval/:id/cancel",
  authenticate,
  authorizeRoles("customer"),
  cancelCustomerRetrieval
);

router.get(
  "/:id",
  authenticate,
  authorizeRoles(...STAFF_AND_CUSTOMER_ROLES),
  getCustomerById
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles(
    "cashier",
    "reception_security",
    "parking_admin",
    "super_admin"
  ),
  deleteCustomer
);

module.exports = router;
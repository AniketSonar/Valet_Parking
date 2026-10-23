const express = require("express");
const router = express.Router();

const {
  createPayment,
  downloadInvoice
} = require("../controllers/paymentController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

router.post(
  "/",
  authenticate,
  authorizeRoles(
    "cashier",
    "parking_admin",
    "super_admin"
  ),
  createPayment
);

router.get(
  "/:id/invoice",
  authenticate,
  authorizeRoles(
    "cashier",
    "parking_admin",
    "super_admin"
  ),
  downloadInvoice
);

module.exports = router;
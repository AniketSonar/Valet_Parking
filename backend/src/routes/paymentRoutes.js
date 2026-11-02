const express = require("express");
const router = express.Router();

const { downloadInvoice } = require("../controllers/paymentController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// Payments are collected at check-in. Invoices (which show amounts) are
// available to the super admin and managers only.
router.get(
  "/:id/invoice",
  authenticate,
  authorizeRoles("manager", "super_admin"),
  downloadInvoice
);

module.exports = router;

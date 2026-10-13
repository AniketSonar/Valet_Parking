const express = require("express");

const {
  createFeedback,
  getMyFeedback,
  getAllFeedback,
  getFeedbackStats
} = require("../controllers/feedbackController");
const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorizeRoles("customer"),
  createFeedback
);
router.get(
  "/my",
  authenticate,
  authorizeRoles("customer"),
  getMyFeedback
);

router.get(
  "/",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  getAllFeedback
);

router.get(
  "/stats",
  authenticate,
  authorizeRoles("parking_admin", "super_admin"),
  getFeedbackStats
);

module.exports = router;
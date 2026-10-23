const express = require("express");

const {
  login,
  refreshSession,
  registerCustomer
} = require("../controllers/authController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Staff + Customer Login
|--------------------------------------------------------------------------
*/
router.post("/login", login);
router.post("/refresh", refreshSession);

/*
|--------------------------------------------------------------------------
| Customer Registration
|--------------------------------------------------------------------------
*/
router.post("/customer-register", registerCustomer);

/*
|--------------------------------------------------------------------------
| Current Authenticated User
|--------------------------------------------------------------------------
*/
router.get("/me", authenticate, async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authenticated user",
    user: req.authUser
  });
});

module.exports = router;
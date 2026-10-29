const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const parkingSlotRoutes = require("./routes/parkingSlotRoutes");
const parkingAdminRoutes = require("./routes/parkingAdminRoutes");
const parkingSessionRoutes = require("./routes/parkingSessionRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const receptionRoutes = require("./routes/receptionRoutes");
const customerRoutes = require("./routes/customerRoutes");
const vehicleInspectionRoutes = require("./routes/vehicleInspectionRoutes");
const parkingBookingRoutes = require("./routes/parkingBookingRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const keyRoutes = require("./routes/keyRoutes");
const incidentRoutes = require("./routes/incidentRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const parkingFloorRoutes = require("./routes/parkingFloorRoutes");
const parkingSystemRoutes = require("./routes/parkingSystemRoutes");
const parkingPositionRoutes = require("./routes/parkingPositionRoutes");
const areaRoutes = require("./routes/areaRoutes");
const reportRoutes = require("./routes/reportRoutes");
console.log("PARKING FLOOR ROUTE LOADED");
const app = express();

app.use(cors());
app.use(express.json());

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/
app.use("/api/auth", authRoutes);

/*
|--------------------------------------------------------------------------
| User / Admin
|--------------------------------------------------------------------------
*/
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

/*
|--------------------------------------------------------------------------
| Parking
|--------------------------------------------------------------------------
*/
app.use("/api/parking-slots", parkingSlotRoutes);
app.use("/api/parking-floors", parkingFloorRoutes);
app.use("/api/parking-systems", parkingSystemRoutes);
app.use("/api/parking-positions", parkingPositionRoutes);
app.use("/api/areas", areaRoutes);
app.use("/api/parking-admin", parkingAdminRoutes);
app.use("/api/parking-admin/sessions", parkingSessionRoutes);
app.use("/api/parking-bookings", parkingBookingRoutes);


/*
|--------------------------------------------------------------------------
| Reception
|--------------------------------------------------------------------------
*/
app.use("/api/reception", receptionRoutes);

/*
|--------------------------------------------------------------------------
| Customers
|--------------------------------------------------------------------------
*/
app.use("/api/customers", customerRoutes);

/*
|--------------------------------------------------------------------------
| Vehicles / Inspection
|--------------------------------------------------------------------------
*/
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/vehicle-inspections", vehicleInspectionRoutes);

/*
|--------------------------------------------------------------------------
| Notifications / Keys
|--------------------------------------------------------------------------
*/
app.use("/api/notifications", notificationRoutes);
app.use("/api/keys", keyRoutes);

/*
|--------------------------------------------------------------------------
| Incidents / Feedback
|--------------------------------------------------------------------------
*/
app.use("/api/incidents", incidentRoutes);
app.use("/api/feedback", feedbackRoutes);

app.use("/api/payments", paymentRoutes);
app.use("/api/reports", reportRoutes);

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Valet Parking API is running."
  });
});

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

/*
|--------------------------------------------------------------------------
| Error Handler
|--------------------------------------------------------------------------
*/
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error."
  });
});

module.exports = app;
const express = require("express");

const {
  createVehicleInspection,
  getInspectionBySession,
  uploadInspectionPhoto,
  getInspectionPhotos,
  deleteInspectionPhoto,
  getVehicleInspectionHistory
} = require("../controllers/vehicleInspectionController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const uploadInspectionPhotoMiddleware = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorizeRoles(
    "cashier",
    "reception_security",
    "parking_admin",
    "super_admin",
    "valet_attendant",
    "valet"
  ),
  createVehicleInspection
);

router.get(
  "/session/:session_id",
  authenticate,
  authorizeRoles(
    "cashier",
    "reception_security",
    "parking_admin",
    "super_admin",
    "valet_attendant",
    "valet"
  ),
  getInspectionBySession
);

router.post(
  "/:inspection_id/photos",
  authenticate,
  authorizeRoles(
    "cashier",
    "reception_security",
    "parking_admin",
    "super_admin",
    "valet_attendant",
    "valet"
  ),
  uploadInspectionPhotoMiddleware.single("photo"),
  uploadInspectionPhoto
);

router.get(
  "/:inspection_id/photos",
  authenticate,
  authorizeRoles(
    "cashier",
    "reception_security",
    "parking_admin",
    "super_admin",
    "valet_attendant",
    "valet"
  ),
  getInspectionPhotos
);

router.delete(
  "/photos/:photo_id",
  authenticate,
  authorizeRoles(
    "cashier",
    "reception_security",
    "parking_admin",
    "super_admin"
  ),
  deleteInspectionPhoto
);

router.get(
  "/vehicle/:vehicle_id/history",
  authenticate,
  authorizeRoles(
    "cashier",
    "reception_security",
    "parking_admin",
    "super_admin",
    "valet_attendant",
    "valet"
  ),
  getVehicleInspectionHistory
);

module.exports = router;
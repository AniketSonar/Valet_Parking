const express = require("express");

const area = require("../controllers/areaController");
const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

const superAdmin = [authenticate, authorizeRoles("super_admin")];
const manager = [authenticate, authorizeRoles("manager", "super_admin")];
const valet = [authenticate, authorizeRoles("valet")];

/* Super admin: buildings, floors, who manages what */
router.get("/buildings", ...manager, area.getBuildings);
router.post("/buildings", ...superAdmin, area.createBuilding);
router.get("/floors", ...manager, area.getFloors);
router.post("/floors", ...superAdmin, area.createFloor);
router.get("/managers", ...superAdmin, area.getManagers);
router.post("/manager-assignments", ...superAdmin, area.assignManagerToFloor);
router.delete("/manager-assignments/:id", ...superAdmin, area.removeManagerAssignment);
router.get("/unassigned-slots", ...superAdmin, area.getUnassignedSlots);
router.patch("/slots/assign", ...superAdmin, area.assignSlotsToFloor);

/* Super admin: parking areas ("Block A, slot 1 to 50" -> A-01 ... A-50) */
router.get("/parking-areas", ...superAdmin, area.getParkingAreas);
router.post("/parking-areas", ...superAdmin, area.createParkingArea);
router.delete("/parking-areas/:id", ...superAdmin, area.deleteParkingArea);

/* Manager: own floors, entry/exit gates */
router.get("/my-areas", ...manager, area.getMyAreas);
router.get("/floors/:floorId/map", ...manager, area.getFloorMap);

router.post("/gates", ...manager, area.createGate);
router.patch("/gates/:id", ...manager, area.updateGate);
router.delete("/gates/:id", ...manager, area.deleteGate);

/* Manager: valet posts and who stands there */
router.post("/posts", ...manager, area.createPost);
router.patch("/posts/:id", ...manager, area.updatePost);
router.delete("/posts/:id", ...manager, area.deletePost);
router.get("/valets", ...manager, area.getAssignableValets);
router.post("/valet-assignments", ...manager, area.assignValetToPost);
router.delete("/valet-assignments/:id", ...manager, area.removeValetAssignment);

/* Valet: my current post */
router.get("/my-post", ...valet, area.getMyPost);

module.exports = router;

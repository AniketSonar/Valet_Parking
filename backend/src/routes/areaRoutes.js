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

/* Manager: map their own area */
router.get("/my-areas", ...manager, area.getMyAreas);
router.get("/floors/:floorId/map", ...manager, area.getFloorMap);
router.delete("/floors/:floorId/previous-slots", ...manager, area.removePreviousSlots);

router.post("/zones", ...manager, area.createZone);
router.patch("/zones/:id", ...manager, area.updateZone);
router.delete("/zones/:id", ...manager, area.deleteZone);
router.post("/zones/:id/slots", ...manager, area.createSlotOnMap);
router.post("/zones/:id/generate-slots", ...manager, area.generateSlots);
router.delete("/slots/:id", ...manager, area.deleteSlot);

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

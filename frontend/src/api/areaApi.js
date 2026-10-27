import apiClient from "./apiClient";

const json = (method, body) => ({ method, body: JSON.stringify(body) });

// ---- Super admin: buildings, floors, manager assignment ----------------
export const getBuildings = () => apiClient("/api/areas/buildings");
export const createBuilding = (data) => apiClient("/api/areas/buildings", json("POST", data));

export const getFloors = () => apiClient("/api/areas/floors");
export const createFloor = (data) => apiClient("/api/areas/floors", json("POST", data));

export const getManagersWithAreas = () => apiClient("/api/areas/managers");
export const assignManagerToFloor = (managerId, floorId) =>
  apiClient("/api/areas/manager-assignments", json("POST", { manager_id: managerId, floor_id: floorId }));
export const removeManagerAssignment = (id) =>
  apiClient(`/api/areas/manager-assignments/${id}`, { method: "DELETE" });

export const getUnassignedSlots = () => apiClient("/api/areas/unassigned-slots");
export const assignSlotsToFloor = (slotIds, floorId) =>
  apiClient("/api/areas/slots/assign", json("PATCH", { slot_ids: slotIds, floor_id: floorId }));

// ---- Manager: own area, zones, map, gates ------------------------------
export const getMyAreas = () => apiClient("/api/areas/my-areas");
export const getFloorMap = (floorId) => apiClient(`/api/areas/floors/${floorId}/map`);
export const removePreviousSlots = (floorId) =>
  apiClient(`/api/areas/floors/${floorId}/previous-slots`, { method: "DELETE" });

export const createZone = (data) => apiClient("/api/areas/zones", json("POST", data));
export const updateZone = (id, data) => apiClient(`/api/areas/zones/${id}`, json("PATCH", data));
export const deleteZone = (id) => apiClient(`/api/areas/zones/${id}`, { method: "DELETE" });

export const createSlotOnMap = (zoneId, data) =>
  apiClient(`/api/areas/zones/${zoneId}/slots`, json("POST", data));
export const generateSlots = (zoneId, data) =>
  apiClient(`/api/areas/zones/${zoneId}/generate-slots`, json("POST", data));
export const deleteSlot = (id) => apiClient(`/api/areas/slots/${id}`, { method: "DELETE" });

export const createGate = (data) => apiClient("/api/areas/gates", json("POST", data));
export const updateGate = (id, data) => apiClient(`/api/areas/gates/${id}`, json("PATCH", data));
export const deleteGate = (id) => apiClient(`/api/areas/gates/${id}`, { method: "DELETE" });

// ---- Manager: valet posts and assignments ------------------------------
export const createPost = (data) => apiClient("/api/areas/posts", json("POST", data));
export const updatePost = (id, data) => apiClient(`/api/areas/posts/${id}`, json("PATCH", data));
export const deletePost = (id) => apiClient(`/api/areas/posts/${id}`, { method: "DELETE" });

export const getAssignableValets = () => apiClient("/api/areas/valets");
export const assignValetToPost = (valetId, postId) =>
  apiClient("/api/areas/valet-assignments", json("POST", { valet_id: valetId, post_id: postId }));
export const removeValetAssignment = (id) =>
  apiClient(`/api/areas/valet-assignments/${id}`, { method: "DELETE" });

// ---- Valet ---------------------------------------------------------------
export const getMyPost = () => apiClient("/api/areas/my-post");

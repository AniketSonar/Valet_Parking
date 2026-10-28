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

// ---- Super admin: parking areas (Block A, slot 1 to 50 -> A-01 ... A-50) --
export const getParkingAreas = () => apiClient("/api/areas/parking-areas");
export const createParkingArea = (data) =>
  apiClient("/api/areas/parking-areas", json("POST", data));
export const deleteParkingArea = (id) =>
  apiClient(`/api/areas/parking-areas/${id}`, { method: "DELETE" });

// ---- Manager: own floors and entry / exit gates --------------------------
export const getMyAreas = () => apiClient("/api/areas/my-areas");
export const getFloorMap = (floorId) => apiClient(`/api/areas/floors/${floorId}/map`);

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

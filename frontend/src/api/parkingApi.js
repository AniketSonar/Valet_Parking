import apiClient from "./apiClient";

// ============================================================
// DASHBOARD
// ============================================================

export const getParkingDashboardStats = async () => {
  return apiClient("/api/parking-admin/dashboard");
};

// ============================================================
// PARKING SLOTS
// ============================================================

export const getParkingSlots = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient(`/api/parking-slots${query ? `?${query}` : ""}`);
};

export const updateParkingSlotStatus = async (slotId, status) => {
  return apiClient(`/api/parking-slots/${slotId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
};

export const createParkingSlot = async (slotData) => {
  return apiClient("/api/parking-slots", {
    method: "POST",
    body: JSON.stringify(slotData),
  });
};

// ============================================================
// PARKING SESSIONS
// ============================================================

export const getParkingSessions = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient(`/api/parking-admin/sessions${query ? `?${query}` : ""}`);
};

export const createParkingSession = async (sessionData) => {
  return apiClient("/api/parking-admin/sessions", {
    method: "POST",
    body: JSON.stringify(sessionData),
  });
};

export const assignParkingSlot = async (sessionId, slotNumber) => {
  return apiClient(`/api/parking-admin/sessions/${sessionId}/assign-slot`, {
    method: "PATCH",
    body: JSON.stringify({ parking_slot: slotNumber }),
  });
};

export const assignValet = async (sessionId, valetId) => {
  return apiClient(`/api/parking-admin/sessions/${sessionId}/valet`, {
    method: "PATCH",
    body: JSON.stringify({ valet_id: valetId }),
  });
};

// ============================================================
// RETRIEVAL WORKFLOW
// ============================================================

export const requestRetrieval = async (sessionId) => {
  return apiClient(`/api/parking-admin/sessions/${sessionId}/request-retrieval`, {
    method: "PATCH",
  });
};

export const startRetrieval = async (sessionId) => {
  return apiClient(`/api/parking-admin/sessions/${sessionId}/start-retrieval`, {
    method: "PATCH",
  });
};

export const markReadyForPickup = async (sessionId) => {
  return apiClient(`/api/parking-admin/sessions/${sessionId}/ready`, {
    method: "PATCH",
  });
};

export const completeReturn = async (sessionId) => {
  return apiClient(`/api/parking-admin/sessions/${sessionId}/complete`, {
    method: "PATCH",
  });
};

export const getRetrievalRequests = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient(`/api/parking-admin/sessions/retrievals${query ? `?${query}` : ""}`);
};

// ============================================================
// HISTORY & REPORTS
// ============================================================

export const getParkingHistory = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient(`/api/parking-admin/sessions/history${query ? `?${query}` : ""}`);
};

export const getParkingReports = async () => {
  return apiClient("/api/parking-admin/reports");
};

export const getParkingStaff = async () => {
  return apiClient("/api/parking-admin/staff");
};

export const getParkingAdminProfile = async () => {
  return apiClient("/api/parking-admin/profile");
};

// ============================================================
// CUSTOMERS & VEHICLES
// ============================================================

export const createCustomer = async (customerData) => {
  return apiClient("/api/customers", {
    method: "POST",
    body: JSON.stringify(customerData),
  });
};

export const getCustomers = async (search = "") => {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiClient(`/api/customers${query}`);
};

export const createVehicle = async (vehicleData) => {
  return apiClient("/api/vehicles", {
    method: "POST",
    body: JSON.stringify(vehicleData),
  });
};

export const getVehicles = async (search = "") => {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiClient(`/api/vehicles${query}`);
};

// ============================================================
// VALET DASHBOARD
// ============================================================

export const getValetDashboard = async () => {
  return apiClient("/api/parking-admin/sessions/valet-dashboard");
};


// ============================================================
// VALET PARKING SLOTS
// ============================================================

export const getValetParkingSlots = async (params = {}) => {
  const query = new URLSearchParams(params).toString();

  return apiClient(
    `/api/parking-slots/valet${query ? `?${query}` : ""}`
  );
};


// ============================================================
// INCIDENT MANAGEMENT
// ============================================================

export const getIncidents = async (params = {}) => {
  const query = new URLSearchParams(params).toString();

  return apiClient(
    `/api/incidents${query ? `?${query}` : ""}`
  );
};

export const createIncident = async (incidentData) => {
  return apiClient("/api/incidents", {
    method: "POST",
    body: JSON.stringify(incidentData),
  });
};

export const getIncidentById = async (incidentId) => {
  return apiClient(`/api/incidents/${incidentId}`);
};

export const updateIncidentStatus = async (
  incidentId,
  status
) => {
  return apiClient(
    `/api/incidents/${incidentId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
};

export const getIncidentsBySession = async (
  sessionId
) => {
  return apiClient(
    `/api/incidents/session/${sessionId}`
  );
};

// ============================================================
// NOTIFICATIONS
// ============================================================
export const getParkingAdminNotifications =
  async () => {
    return apiClient("/api/notifications/my");
  };
  
/**
 * Get notifications for the currently authenticated user.
 *
 * This endpoint is user-scoped by the backend using:
 * - req.user.id
 * - req.user.role
 */
export const getMyNotifications = async () => {
  return apiClient("/api/notifications/my");
};

/**
 * Get notifications using the staff/admin notification endpoint.
 *
 * Use only where the backend route is intended to expose
 * the requested notification scope.
 */
export const getNotifications = async (params = {}) => {
  const query = new URLSearchParams(params).toString();

  return apiClient(
    `/api/notifications${query ? `?${query}` : ""}`
  );
};


// ============================================================
// FEEDBACK MANAGEMENT
// ============================================================

export const getFeedback = async () => {
  return apiClient("/api/feedback");
};

export const getFeedbackStats = async () => {
  return apiClient("/api/feedback/stats");
};
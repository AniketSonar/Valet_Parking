import apiClient from "./apiClient";

export const getCustomerDashboard = async () => {
  return apiClient("/api/customers/portal/dashboard");
};

export const getCustomerVehicles = async () => {
  return apiClient("/api/customers/portal/vehicles");
};

export const getCustomerHistory = async () => {
  return apiClient("/api/customers/portal/history");
};

export const getCustomerProfile = async () => {
  return apiClient("/api/customers/portal/profile");
};

export const requestVehicleRetrieval = async (sessionId) => {
  return apiClient(`/api/customers/portal/retrieval/${sessionId}`, {
    method: "PATCH",
  });
};

export const cancelVehicleRetrieval = async (sessionId) => {
  return apiClient(`/api/customers/portal/retrieval/${sessionId}/cancel`, {
    method: "PATCH",
  });
};

// ============================================================
// CUSTOMER FEEDBACK
// ============================================================

export const getMyFeedback = async () => {
  return apiClient("/api/feedback/my");
};

export const createFeedback = async (feedbackData) => {
  return apiClient("/api/feedback", {
    method: "POST",
    body: JSON.stringify(feedbackData),
  });
};


// ============================================================
// CUSTOMER PAYMENTS
// ============================================================

export const getCustomerPayments = async () => {
  return apiClient("/api/customers/portal/payments");
};

export const downloadCustomerInvoice = async (paymentId) => {
  return apiClient(
    `/api/customers/portal/payments/${paymentId}/invoice`,
    {
      responseType: "blob",
    }
  );
};
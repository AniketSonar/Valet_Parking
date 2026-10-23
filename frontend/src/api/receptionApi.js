
import apiClient from "./apiClient";

export const getReceptionSessions = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient(`/api/reception/sessions${query ? `?${query}` : ""}`);
};

export const getReceptionValets = async () => {
  return apiClient("/api/reception/valets");
};

export const createReceptionSession = async (sessionData) => {
  return apiClient("/api/reception/sessions", {
    method: "POST",
    body: JSON.stringify(sessionData),
  });
};

export const requestReceptionRetrieval = async (sessionId) => {
  return apiClient(`/api/reception/sessions/${sessionId}/request-retrieval`, {
    method: "PATCH",
  });
};

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

export const deleteCustomer = async (customerId) => {
  return apiClient(`/api/customers/${customerId}`, {
    method: "DELETE",
  });
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

export const verifyReceptionTicket = async (ticketCode) => {
  return apiClient(`/api/reception/tickets/${encodeURIComponent(ticketCode)}`);
};

export const completeReceptionHandover = async (sessionId) => {
  return apiClient(`/api/reception/sessions/${sessionId}/complete`, {
    method: "PATCH",
  });
};

export const getReceptionNotifications = async () => {
  return apiClient("/api/notifications/my");
};

export const getSessionKey = async (sessionId) => {
  return apiClient(`/api/keys/session/${sessionId}`);
};

export const createVehicleInspection = async (inspection) => {
  return apiClient("/api/vehicle-inspections", {
    method: "POST",
    body: JSON.stringify(inspection),
  });
};

export const uploadInspectionPhoto = async (inspectionId, file) => {
  const formData = new FormData();
  formData.append("photo", file);

  return apiClient(`/api/vehicle-inspections/${inspectionId}/photos`, {
    method: "POST",
    body: formData,
  });
};

export const getInspectionBySession = async (sessionId) => {
  return apiClient(`/api/vehicle-inspections/session/${sessionId}`);
};

export const getInspectionPhotos = async (inspectionId) => {
  return apiClient(`/api/vehicle-inspections/${inspectionId}/photos`);
};

export const getVehicleInspectionHistory = async (vehicleId) => {
  return apiClient(`/api/vehicle-inspections/vehicle/${vehicleId}/history`);
};

export const deleteInspectionPhoto = async (photoId) => {
  return apiClient(`/api/vehicle-inspections/photos/${photoId}`, {
    method: "DELETE",
  });
};

export const getKeys = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient(`/api/keys${query ? `?${query}` : ""}`);
};

export const getKeyById = async (keyId) => {
  return apiClient(`/api/keys/${keyId}`);
};

export const createKey = async (keyData) => {
  return apiClient("/api/keys", {
    method: "POST",
    body: JSON.stringify(keyData),
  });
};

export const updateKey = async (keyId, keyData) => {
  return apiClient(`/api/keys/${keyId}`, {
    method: "PUT",
    body: JSON.stringify(keyData),
  });
};

export const assignKey = async (keyId, data) => {
  return apiClient(`/api/keys/${keyId}/assign`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const returnKey = async (keyId, data) => {
  return apiClient(`/api/keys/${keyId}/return`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const markKeyLost = async (keyId, data) => {
  return apiClient(`/api/keys/${keyId}/lost`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const getKeyHistory = async (keyId) => {
  return apiClient(`/api/keys/${keyId}/history`);
};


// ============================================================
// PAYMENTS & INVOICES
// ============================================================

// export const createPayment = async (paymentData) => {
//   return apiClient("/api/payments", {
//     method: "POST",
//     body: JSON.stringify(paymentData),
//   });
// };

// export const downloadInvoice = async (paymentId) => {
//   const token = localStorage.getItem("access_token");

//   const response = await fetch(`/api/payments/${paymentId}/invoice`, {
//     method: "GET",
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//   });

//   if (!response.ok) {
//     let message = "Failed to download invoice.";

//     try {
//       const data = await response.json();
//       message = data?.message || message;
//     } catch {
//       // Response was not JSON.
//     }

//     throw new Error(message);
//   }

//   const blob = await response.blob();

//   const disposition = response.headers.get("Content-Disposition");
//   const filenameMatch = disposition?.match(/filename="([^"]+)"/);
//   const filename = filenameMatch?.[1] || `Invoice-${paymentId}.pdf`;

//   const url = window.URL.createObjectURL(blob);
//   const link = document.createElement("a");

//   link.href = url;
//   link.download = filename;

//   document.body.appendChild(link);
//   link.click();
//   link.remove();

//   window.URL.revokeObjectURL(url);
// };


// ============================================================
// PAYMENTS & INVOICES
// ============================================================

export const createPayment = async (paymentData) => {
  return apiClient("/api/payments", {
    method: "POST",
    body: JSON.stringify(paymentData),
  });
};

export const downloadInvoice = async (paymentId) => {
  const blob = await apiClient(
    `/api/payments/${paymentId}/invoice`,
    {
      method: "GET",
      responseType: "blob"
    }
  );

  const filename = `Invoice-${paymentId}.pdf`;

  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
};
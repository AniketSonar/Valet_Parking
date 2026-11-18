import apiClient from "./apiClient";

export const getAllStaff = async (params = {}) => {
  let query = "";
  if (typeof params === "string") {
    query = params && params !== "all" ? `?hotelId=${encodeURIComponent(params)}` : "";
  } else if (params && typeof params === "object") {
    const q = new URLSearchParams(params).toString();
    query = q ? `?${q}` : "";
  }
  return apiClient(`/api/users${query}`);
};

export const getStaffById = async (id) => {
  return apiClient(`/api/users/${id}`);
};

export const createStaff = async (staffData) => {
  return apiClient("/api/users", {
    method: "POST",
    body: JSON.stringify(staffData),
  });
};

export const updateStaff = async (id, staffData) => {
  return apiClient(`/api/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(staffData),
  });
};

export const updateStaffStatus = async (id, isActive) => {
  return apiClient(`/api/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      is_active: isActive,
    }),
  });
};
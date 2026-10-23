import apiClient from "./apiClient";

export const getAllStaff = async () => {
  return apiClient("/api/users");
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
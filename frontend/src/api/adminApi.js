import apiClient from "./apiClient";

export const getDashboardStats = async () => {
  return apiClient("/api/admin/dashboard");
};

export const getAllStaff = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient(`/api/users${query ? `?${query}` : ""}`);
};

export const getAdminReports = async () => {
  return apiClient("/api/admin/reports");
};
import apiClient from "./apiClient";

export const getDashboardStats = async () => {
  return apiClient("/api/admin/dashboard");
};

export const getDashboardAnalytics = async () => {
  return apiClient("/api/admin/dashboard-analytics");
};

export const getRevenuePerformance = async (days = 7) => {
  const query = new URLSearchParams({ days: String(days) }).toString();
  return apiClient(`/api/admin/revenue-performance?${query}`);
};

export const getAllStaff = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient(`/api/users${query ? `?${query}` : ""}`);
};

export const getAdminReports = async () => {
  return apiClient("/api/admin/reports");
};
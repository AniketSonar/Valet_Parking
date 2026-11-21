import apiClient from "./apiClient";

export const getDashboardStats = async (hotelId = "all") => {
  const query = hotelId && hotelId !== "all" ? `?hotelId=${encodeURIComponent(hotelId)}` : "";
  return apiClient(`/api/admin/dashboard${query}`);
};

export const getDashboardAnalytics = async (hotelId = "all") => {
  const query = hotelId && hotelId !== "all" ? `?hotelId=${encodeURIComponent(hotelId)}` : "";
  return apiClient(`/api/admin/dashboard-analytics${query}`);
};

export const getRevenuePerformance = async (days = 7, hotelId = "all") => {
  const params = { days: String(days) };
  if (hotelId && hotelId !== "all") params.hotelId = hotelId;
  const query = new URLSearchParams(params).toString();
  return apiClient(`/api/admin/revenue-performance?${query}`);
};

export const getRevenue = async (days = 30, hotelId = "all", dateRange = {}) => {
  const params = {
    tz_offset: String(-new Date().getTimezoneOffset()),
  };
  if (dateRange.fromDate && dateRange.toDate) {
    params.from_date = dateRange.fromDate;
    params.to_date = dateRange.toDate;
  } else {
    params.days = String(days);
  }
  if (hotelId && hotelId !== "all") params.hotelId = hotelId;
  const query = new URLSearchParams(params).toString();
  return apiClient(`/api/revenue?${query}`);
};

export const getAllStaff = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient(`/api/users${query ? `?${query}` : ""}`);
};

export const getAdminReports = async () => {
  return apiClient("/api/admin/reports");
};

export const getSystemReports = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient(`/api/reports/system-reports${query ? `?${query}` : ""}`);
};
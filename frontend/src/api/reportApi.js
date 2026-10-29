import apiClient from "./apiClient";

const buildQuery = (filters = {}) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
      return;
    }
    params.set(key, String(value));
  });

  return params.toString();
};

export const getReportValets = async () => apiClient("/api/reports/valets");

export const getValetReport = async (filters) =>
  apiClient(`/api/reports/valet-sessions?${buildQuery(filters)}`);

/** format: "csv" | "pdf" -> returns a Blob */
export const exportValetReport = async (filters, format) =>
  apiClient(
    `/api/reports/valet-sessions/export?${buildQuery({ ...filters, format })}`,
    { responseType: "blob" }
  );

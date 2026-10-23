const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

let refreshPromise = null;

const clearAuthSession = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
};

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem("refresh_token");

  if (!refreshToken) {
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success || !data.session) {
          return false;
        }

        localStorage.setItem(
          "access_token",
          data.session.access_token
        );
        localStorage.setItem(
          "refresh_token",
          data.session.refresh_token
        );

        return true;
      })
      .catch(() => {
        console.warn("Session refresh unavailable; login is required.");
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

const parseResponse = async (response, options) => {
  const contentType = response.headers.get("content-type");

  if (
    options.responseType === "blob" ||
    contentType?.includes("application/pdf")
  ) {
    return response.blob();
  }

  if (contentType?.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : {};
};

const apiClient = async (endpoint, options = {}, hasRetried = false) => {
  const token = localStorage.getItem("access_token");

  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers,
      }
    );

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        const errorText = await response.text();
        if (errorText) errorMessage = errorText;
      }

      if (response.status === 401 && !hasRetried) {
        const refreshed = await refreshAccessToken();

        if (refreshed) {
          return apiClient(endpoint, options, true);
        }

        clearAuthSession();
        window.location.assign("/login");
        throw new Error("Your session expired. Please log in again.");
      }

      throw new Error(errorMessage);
    }

    return parseResponse(response, options);
  } catch (error) {
    if (error?.message !== "Your session expired. Please log in again.") {
      console.error(`API Error [${endpoint}]:`, error);
    }

    throw error;
  }
};

export default apiClient;
export { clearAuthSession, refreshAccessToken };
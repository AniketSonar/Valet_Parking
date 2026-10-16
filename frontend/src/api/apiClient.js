const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const apiClient = async (endpoint, options = {}) => {
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

      if (response.status === 401) {
        console.error("Authentication failed.");
      }

      throw new Error(errorMessage);
    }

    const contentType =
      response.headers.get("content-type");

    if (options.responseType === "blob" || contentType?.includes("application/pdf")) {
      return await response.blob();
    }

    let data = {};

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : {};
    }

    return data;
  } catch (error) {
    console.error(
      `API Error [${endpoint}]:`,
      error
    );

    throw error;
  }
};

export default apiClient;
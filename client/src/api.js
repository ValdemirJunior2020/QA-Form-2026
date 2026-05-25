// C:\Users\Valdemir Goncalves\Desktop\Meus Projetos\qa-form-react-project\client\src\api.js

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }

  return data;
}

function buildParams(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });

  return params.toString();
}

export const api = {
  health() {
    return request("/api/health");
  },

  getAppData() {
    return request("/api/app-data");
  },

  appData() {
    return request("/api/app-data");
  },

  calculate(payload) {
    return request("/api/calculate", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  submit(payload) {
    return request("/api/submit", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  aiCoaching(payload) {
    return request("/api/ai-coaching", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  pastSubmissions(filters = {}) {
    const query = buildParams(filters);
    return request(`/api/past-submissions${query ? `?${query}` : ""}`);
  },

  dashboard(filters = {}) {
    const query = buildParams(filters);
    return request(`/api/dashboard${query ? `?${query}` : ""}`);
  },

  analytics(filters = {}) {
    const query = buildParams(filters);
    return request(`/api/analytics${query ? `?${query}` : ""}`);
  },

  exportCsv(filters = {}) {
    const query = buildParams(filters);
    return `${API_BASE}/api/export-csv${query ? `?${query}` : ""}`;
  },

  exportCsvUrl(filters = {}) {
    const query = buildParams(filters);
    return `${API_BASE}/api/export-csv${query ? `?${query}` : ""}`;
  }
};

export default api;
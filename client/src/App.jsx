// C:\Users\Valdemir Goncalves\Desktop\Meus Projetos\qa-form-react-project\client\src\api.js

const APPS_SCRIPT_URL =
  import.meta.env.VITE_APPS_SCRIPT_URL ||
  "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

async function appsScriptPost(action, payload = {}) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action,
      ...payload
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!data.ok) {
    throw new Error(data.message || `Request failed`);
  }

  return data;
}

function buildParams(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value);
    }
  });

  return params.toString();
}

export const api = {
  health() {
    return appsScriptPost("health");
  },

  getAppData() {
    return appsScriptPost("getAppData");
  },

  appData() {
    return appsScriptPost("getAppData");
  },

  submit(payload) {
    return appsScriptPost("submitQA", payload);
  },

  aiCoaching(payload) {
    return appsScriptPost("aiCoaching", payload);
  },

  pastSubmissions(filters = {}) {
    return appsScriptPost("pastSubmissions", filters);
  },

  dashboard(filters = {}) {
    return appsScriptPost("dashboard", filters);
  },

  analytics(filters = {}) {
    return appsScriptPost("dashboard", filters);
  },

  exportCsvUrl(filters = {}) {
    const query = buildParams({
      action: "exportCsv",
      ...filters
    });

    return `${APPS_SCRIPT_URL}?${query}`;
  }
};

export default api;
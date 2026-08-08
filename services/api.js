import { Platform } from "react-native";
import Constants from "expo-constants";

function getExpoHostIp() {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest?.debuggerHost ||
      Constants.manifest2?.extra?.expoGo?.developer?.extra?.manifest?.debuggerHost;
    if (hostUri) {
      return hostUri.split(":")[0];
    }
  } catch (e) {}
  return null;
}

const expoHost = getExpoHostIp();
const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;

function getCandidateBaseUrls() {
  const candidates = [];

  if (ENV_API_URL) {
    candidates.push(ENV_API_URL.endsWith("/") ? ENV_API_URL.slice(0, -1) : ENV_API_URL);
  }

  if (expoHost) {
    const expoUrl = `http://${expoHost}:8000/api/v1`;
    if (!candidates.includes(expoUrl)) candidates.push(expoUrl);
  }

  if (Platform.OS === "android") {
    const androidUrl = "http://10.0.2.2:8000/api/v1";
    if (!candidates.includes(androidUrl)) candidates.push(androidUrl);
  }

  const localhostUrl = "http://localhost:8000/api/v1";
  if (!candidates.includes(localhostUrl)) candidates.push(localhostUrl);

  const loopbackUrl = "http://127.0.0.1:8000/api/v1";
  if (!candidates.includes(loopbackUrl)) candidates.push(loopbackUrl);

  return candidates;
}

let activeBaseUrl = getCandidateBaseUrls()[0];

export function resolveMediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const root = (activeBaseUrl || "http://localhost:8000/api/v1").replace("/api/v1", "");
  return `${root}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function request(endpoint, options = {}) {
  const formattedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const candidates = getCandidateBaseUrls();

  const orderedCandidates = [
    activeBaseUrl,
    ...candidates.filter((c) => c !== activeBaseUrl),
  ];

  const defaultHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  let lastError = null;

  for (const baseUrl of orderedCandidates) {
    const url = `${baseUrl}${formattedEndpoint}`;
    try {
      const res = await fetch(url, config);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP Error ${res.status}`);
      }
      activeBaseUrl = baseUrl;
      return await res.json();
    } catch (err) {
      lastError = err;
      if (err.message && err.message.startsWith("HTTP Error")) {
        activeBaseUrl = baseUrl;
        throw err;
      }
    }
  }

  throw lastError || new Error("Failed to connect to backend server");
}

export const api = {
  policeStations: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/police-stations?${query}`);
    },
    getNearMe: (lat, lng, radiusKm = 100, page = 1, pageSize = 50) => {
      return request(
        `/police-stations/near-me?lat=${lat}&lng=${lng}&radius_km=${radiusKm}&page=${page}&page_size=${pageSize}`
      );
    },
    get: (id) => request(`/police-stations/${id}`),
  },

  publications: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/publications?${query}`);
    },
    get: (id) => request(`/publications/${id}`),
  },

  callLogs: {
    create: (data) =>
      request("/call-logs", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  suggestions: {
    create: (data) =>
      request("/comments/public", {
        method: "POST",
        body: JSON.stringify({
          tag: data.category || data.tag || "SUGGESTION",
          subject: data.subject || data.category || "Public Feedback",
          message: data.content || data.message || "",
          citizen_name: data.citizen_name || "Anonymous Citizen",
          citizen_contact: data.citizen_contact || data.phone_number || "",
        }),
      }),
  },

  trafficViolations: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/traffic-violations?${query}`);
    },
    getByLicence: (licenceNumber, page = 1, pageSize = 50) => {
      return request(
        `/traffic-violations?licence_number=${encodeURIComponent(licenceNumber)}&page=${page}&page_size=${pageSize}`
      );
    },
    get: (id) => request(`/traffic-violations/${id}`),
  },

  cases: {
    create: async (data) => {
      let payload = {
        tag: "COMPLAINT",
        subject: "Emergency Incident Report",
        message: "",
        citizen_name: "Citizen",
        citizen_contact: "",
      };

      if (data && typeof data === "object" && !(data instanceof FormData)) {
        payload.subject = data.title || "Emergency Incident Report";
        payload.message = data.description || "";
        payload.citizen_contact = data.phoneNumber || data.phone_number || "";
      } else if (data && data._parts) {
        for (const [key, value] of data._parts) {
          if (key === "title") payload.subject = value;
          if (key === "description") payload.message = value;
          if (key === "phoneNumber" || key === "phone_number") payload.citizen_contact = value;
        }
      }

      const res = await request("/comments/public", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      return {
        id: res.id || `CASE-${Date.now()}`,
        ...res,
      };
    },
  },

  analytics: {
    track: (data) =>
      request("/analytics/track", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getFeatureUsage: () => request("/analytics/feature-usage"),
    getLocationHeatmaps: () => request("/analytics/location-heatmaps"),
  },

  auth: {
    login: (credentials) =>
      request("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      }),
    logout: async () => true,
  },
  notifications: {
    registerToken: (payload) => request("/notifications/push-token", { method: "POST", body: JSON.stringify(payload) }),
  },
};

export default api;

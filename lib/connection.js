import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// On a phone, localhost is the phone itself. During Expo development, Metro's
// host is the computer running both Metro and FastAPI, so use that same host.
const getApiBaseUrl = () => {
  if (Platform.OS === "web" || !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(configuredApiUrl)) {
    return configuredApiUrl.replace(/\/$/, "");
  }

  const metroHost = Constants.expoConfig?.hostUri?.split(":")[0]
    || Constants.expoGoConfig?.debuggerHost?.split(":")[0];
  if (!metroHost) return configuredApiUrl.replace(/\/$/, "");

  return configuredApiUrl
    .replace(/(https?:\/\/)(localhost|127\.0\.0\.1)/i, `$1${metroHost}`)
    .replace(/\/$/, "");
};

const API_BASE_URL = getApiBaseUrl();
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, "");
const TOKEN_KEY = "safetap_access_token";

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const buildQuery = (params = {}) => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (!entries.length) return "";
  return `?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&")}`;
};

const request = async (path, options = {}) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = { Accept: "application/json", ...options.headers };
  if (!isFormData && options.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.detail?.[0]?.msg || payload?.detail || payload?.message || "Unable to complete request";
    throw new ApiError(message, response.status, payload);
  }
  return payload;
};

const mediaUrl = (value) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || value.startsWith("file:")) return value;
  return `${API_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
};

const adaptNews = (item) => ({
  ...item,
  created: item.published_at || item.created_at,
  updated: item.updated_at,
  description: item.summary || "",
  file: item.cover_image_url || "",
  attachments: Array.isArray(item.attachments) ? item.attachments : [],
});

const adaptStation = (item) => ({
  ...item,
  station: item.name,
  member_in_charge: item.officer_in_charge,
  member_in_charge_number: item.phone,
  whatsapp_number: item.whatsapp,
  specialty: item.specialty || "General policing",
  address: item.address || `${item.district}, ${item.province}`,
  operating_hours: item.operating_hours || "24/7",
  created: item.created_at,
});

const adaptViolation = (item) => ({
  ...item,
  violation_type: item.offense_details,
  isSorted: item.is_sorted,
  location: item.station_id || "ZRP Traffic Branch",
  created: item.created_at,
});

const adaptCase = (item) => ({
  ...item,
  phoneNumber: item.phone_number,
  images: item.image_url ? [item.image_url] : [],
  created: item.created_at,
});

const extractQuoted = (filter, field) => {
  if (!filter) return undefined;
  const match = filter.match(new RegExp(`${field}\\s*(?:=|~)\\s*["']([^"']+)["']`, "i"));
  return match?.[1];
};

const resourceConfig = {
  news: { path: "/publications", adapt: adaptNews, defaults: { is_published: true } },
  contacts: { path: "/police-stations", adapt: adaptStation, defaults: { is_active: true } },
  traffic_violations: { path: "/traffic-violations", adapt: adaptViolation },
  cases: { path: "/cases", adapt: adaptCase },
};

const listParams = (name, page, pageSize, options = {}) => {
  const params = { page, page_size: pageSize, ...resourceConfig[name]?.defaults };
  const filter = options.filter || "";
  if (name === "contacts") {
    params.search = extractQuoted(filter, "station");
    params.province = extractQuoted(filter, "province");
    params.district = extractQuoted(filter, "district");
  }
  if (name === "traffic_violations") params.licence_number = extractQuoted(filter, "licence_number");
  return params;
};

const collection = (name) => {
  const config = resourceConfig[name];
  if (name === "comments") {
    return {
      create: (data) => request("/comments/public", {
        method: "POST",
        body: JSON.stringify({
          tag: data.flag || data.tag || "COMMENT",
          subject: data.case ? `${data.case} feedback` : (data.subject || "Mobile app feedback"),
          message: data.comment || data.message,
          citizen_contact: data.user_phone || data.citizen_contact || null,
          citizen_name: data.citizen_name || null,
        }),
      }),
    };
  }
  if (!config) throw new Error(`Unknown API resource: ${name}`);

  return {
    async getList(page = 1, pageSize = 20, options = {}) {
      const payload = await request(`${config.path}${buildQuery(listParams(name, page, pageSize, options))}`);
      let items = (payload.items || []).map(config.adapt);
      if (options.sort === "created") items = items.reverse();
      return { items, page: payload.page, perPage: payload.page_size, totalItems: payload.total, totalPages: payload.total_pages };
    },
    async getFullList(options = {}) {
      const all = [];
      let page = 1;
      do {
        const result = await this.getList(page, 100, options);
        all.push(...result.items);
        if (page >= result.totalPages) break;
        page += 1;
      } while (true);
      return all;
    },
    async getOne(id) {
      return config.adapt(await request(`${config.path}/${encodeURIComponent(id)}`));
    },
    async create(data) {
      if (name !== "cases") throw new Error(`Create is not supported for ${name}`);
      return config.adapt(await request(config.path, { method: "POST", body: data }));
    },
  };
};

const api = {
  collection,
  files: { getURL: (_record, filename) => mediaUrl(filename) },
  authStore: { clear: () => AsyncStorage.multiRemove([TOKEN_KEY, "safetap_refresh_token"]) },
  request,
  nearbyStations: (lat, lng, radiusKm = 35, page = 1, pageSize = 20) => request(
    `/police-stations/near-me${buildQuery({ lat, lng, radius_km: radiusKm, page, page_size: pageSize })}`
  ),
  mediaUrl,
  baseUrl: API_BASE_URL,
};

export { ApiError, API_BASE_URL, mediaUrl, request };
export default api;

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
const STATION_CACHE_KEY = "safetap_all_police_stations";
const STATION_CACHE_TIME_KEY = "safetap_all_police_stations_synced_at";
const STATION_SYNC_INTERVAL = 6 * 60 * 60 * 1000;
const API_CACHE_PREFIX = "safetap_api_cache_v1:";
const OFFLINE_COOLDOWN_MS = 20000;
const REQUEST_TIMEOUT_MS = 12000;
const inFlightReads = new Map();
let offlineUntil = 0;

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

const cacheKeyFor = (path) => `${API_CACHE_PREFIX}${encodeURIComponent(path).slice(0, 700)}`;
const readCachedResponse = async (path) => {
  try { const value = await AsyncStorage.getItem(cacheKeyFor(path)); return value ? JSON.parse(value) : null; }
  catch { return null; }
};
const markCached = (cached) => {
  if (cached && typeof cached === "object") {
    cached.__from_cache = true;
    return cached;
  }
  return cached;
};

const request = async (path, options = {}) => {
  const method = (options.method || "GET").toUpperCase();
  const isRead = method === "GET";
  if (isRead && inFlightReads.has(path)) return inFlightReads.get(path);

  const execute = async () => {
  if (Date.now() < offlineUntil) {
    if (isRead) {
      const cached = await readCachedResponse(path);
      if (cached) return markCached(cached);
    }
    throw new ApiError("No internet connection. Try again when you are online.", 0, { offline: true });
  }
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = { Accept: "application/json", ...options.headers };
  if (!isFormData && options.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
  } catch (error) {
    offlineUntil = Date.now() + OFFLINE_COOLDOWN_MS;
    if (isRead) {
      const cached = await readCachedResponse(path);
      if (cached) return markCached(cached);
    }
    throw new ApiError("Unable to connect. Check your internet connection.", 0, { offline: true, cause: error?.message });
  } finally {
    clearTimeout(timeout);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.detail?.[0]?.msg || payload?.detail || payload?.message || "Unable to complete request";
    throw new ApiError(message, response.status, payload);
  }
  if (isRead && payload) AsyncStorage.setItem(cacheKeyFor(path), JSON.stringify(payload)).catch(() => {});
  offlineUntil = 0;
  return payload;
  };

  const pending = execute();
  if (isRead) inFlightReads.set(path, pending);
  try { return await pending; }
  finally { if (isRead) inFlightReads.delete(path); }
};

const mediaUrl = (value) => {
  if (!value) return null;
  if (value.startsWith("file:")) return value;
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname)) {
        return `${API_ORIGIN}${parsed.pathname}${parsed.search}`;
      }
    } catch { return value; }
    return value;
  }
  return `${API_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
};

const adaptNews = (item) => ({
  ...item,
  published_at: item.published_at || item.created_at,
  created_at: item.created_at || item.published_at,
  created: item.published_at || item.created_at,
  updated: item.updated_at,
  summary: item.summary || "",
  description: item.summary || "",
  cover_image_url: mediaUrl(item.cover_image_url) || "",
  file: mediaUrl(item.cover_image_url) || "",
  attachments: Array.isArray(item.attachments)
    ? item.attachments.map((attachment) => typeof attachment === "string"
      ? mediaUrl(attachment)
      : { ...attachment, url: mediaUrl(attachment.url) })
    : [],
});

const adaptStation = (item) => ({
  ...item,
  station: item.name,
  whatsapp_number: item.whatsapp,
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

const adaptPerson = (item) => ({
  ...item,
  featured_image_url: mediaUrl(item.featured_image_url),
  images: Array.isArray(item.images) ? item.images.map((value) => mediaUrl(typeof value === "string" ? value : value.url)) : [],
  documents: Array.isArray(item.documents) ? item.documents.map((value) => typeof value === "string" ? mediaUrl(value) : { ...value, url: mediaUrl(value.url) }) : [],
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
  persons: { path: "/persons", adapt: adaptPerson, defaults: { status: "ACTIVE" } },
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
  if (name === "news" && options.sort) params.sort = options.sort;
  if (name === "persons") {
    params.search = extractQuoted(filter, "search");
    params.person_type = extractQuoted(filter, "person_type");
  }
  return params;
};

const collection = (name) => {
  const config = resourceConfig[name];
  if (name === "comments") {
    return {
      create: (data) => {
        if (data.images?.length || data.voice_note?.uri) {
          const form = new FormData();
          form.append("tag", data.flag || data.tag || "COMMENT");
          form.append("subject", data.subject || (data.case ? `${data.case} feedback` : "Mobile app feedback"));
          form.append("message", data.comment || data.message);
          if (data.user_phone || data.citizen_contact) form.append("citizen_contact", data.user_phone || data.citizen_contact);
          if (data.citizen_name) form.append("citizen_name", data.citizen_name);
          if (data.related_person_id) form.append("related_person_id", data.related_person_id);
          data.images.forEach((image, index) => form.append("images", {
            uri: image.uri,
            name: image.fileName || `feedback-${index + 1}.jpg`,
            type: image.mimeType || "image/jpeg",
          }));
          if (data.voice_note?.uri) {
            form.append("audio_duration_ms", String(Math.min(data.voice_note.durationMillis || 0, 60000)));
            form.append("audio", {
              uri: data.voice_note.uri,
              name: data.voice_note.fileName || "voice-note.m4a",
              type: data.voice_note.mimeType || "audio/mp4",
            });
          }
          return request("/comments/public-with-images", { method: "POST", body: form });
        }
        return request("/comments/public", {
          method: "POST",
          body: JSON.stringify({
          tag: data.flag || data.tag || "COMMENT",
          subject: data.subject || (data.case ? `${data.case} feedback` : "Mobile app feedback"),
          message: data.comment || data.message,
          citizen_contact: data.user_phone || data.citizen_contact || null,
          citizen_name: data.citizen_name || null,
          related_person_id: data.related_person_id || null,
          }),
        });
      },
    };
  }
  if (!config) throw new Error(`Unknown API resource: ${name}`);

  return {
    async getList(page = 1, pageSize = 20, options = {}) {
      const payload = await request(`${config.path}${buildQuery(listParams(name, page, pageSize, options))}`);
      let items = (payload.items || []).map(config.adapt);
      if (options.sort === "created") items = items.reverse();
      const totalPages = payload.total_pages
        ?? Math.ceil((payload.total || items.length) / (payload.page_size || pageSize));
      return { items, page: payload.page, perPage: payload.page_size, totalItems: payload.total, totalPages, offline: Boolean(payload.__from_cache) };
    },
    async getFullList(options = {}) {
      const all = [];
      let page = 1;
      do {
        const result = await this.getList(page, 100, options);
        all.push(...result.items.filter((item) => !all.some((existing) => existing.id === item.id)));
        if (!result.items.length || page >= result.totalPages) break;
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

const getCachedStations = async () => {
  try {
    const cached = await AsyncStorage.getItem(STATION_CACHE_KEY);
    const stations = cached ? JSON.parse(cached) : [];
    return Array.isArray(stations) ? stations : [];
  } catch {
    return [];
  }
};

const saveCachedStations = async (stations) => {
  if (!Array.isArray(stations)) return;
  await AsyncStorage.multiSet([
    [STATION_CACHE_KEY, JSON.stringify(stations)],
    [STATION_CACHE_TIME_KEY, Date.now().toString()],
  ]);
};

const syncStationsForOffline = async (force = false) => {
  const lastSync = Number(await AsyncStorage.getItem(STATION_CACHE_TIME_KEY) || 0);
  if (!force && Date.now() - lastSync < STATION_SYNC_INTERVAL) return getCachedStations();
  const stations = await collection("contacts").getFullList({ sort: "station" });
  await saveCachedStations(stations);
  return stations;
};

const api = {
  collection,
  files: { getURL: (_record, filename) => mediaUrl(filename) },
  authStore: { clear: () => AsyncStorage.multiRemove([TOKEN_KEY, "safetap_refresh_token"]) },
  request,
  nearbyStations: (lat, lng, radiusKm = 35, page = 1, pageSize = 20) => request(
    `/police-stations/near-me${buildQuery({
      lat,
      lng,
      radius_km: Math.min(Math.max(Number(radiusKm) || 35, 1), 200),
      page,
      page_size: Math.min(Math.max(Number(pageSize) || 20, 1), 50),
    })}`
  ),
  stationDirectoryMetadata: () => request("/police-stations/directory-metadata"),
  mediaUrl,
  baseUrl: API_BASE_URL,
  getCachedStations,
  saveCachedStations,
  syncStationsForOffline,
  resetNetworkCircuit: () => { offlineUntil = 0; },
  trackEvent: (event) => request("/analytics/track", {
    method: "POST",
    body: JSON.stringify({ platform: Platform.OS, ...event }),
  }).catch(() => null),
};

export { ApiError, API_BASE_URL, mediaUrl, request };
export default api;

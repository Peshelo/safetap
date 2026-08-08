// Re-export FastAPI API client replacing legacy Pocketbase client
import api, { resolveMediaUrl } from "./api";

export { resolveMediaUrl };
export default api;

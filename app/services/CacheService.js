import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_MANIFEST_KEY = "@cache_manifest";
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

class CacheService {
  constructor() {
    this._memoryCache = new Map();
  }

  async set(key, data, ttl = DEFAULT_TTL) {
    try {
      const timestamp = Date.now();
      const expiry = timestamp + ttl;
      const cacheItem = { data, timestamp, expiry };

      // Update memory cache
      this._memoryCache.set(key, cacheItem);

      // Update manifest
      const manifest = await this.getManifest();
      manifest[key] = { timestamp, expiry };
      await AsyncStorage.setItem(CACHE_MANIFEST_KEY, JSON.stringify(manifest)).catch(() => {});

      // Store data
      await AsyncStorage.setItem(`@cache_${key}`, JSON.stringify(cacheItem));
      return true;
    } catch (error) {
      console.log("[CacheService] set error:", error);
      return false;
    }
  }

  async get(key) {
    try {
      // Check memory cache first
      if (this._memoryCache.has(key)) {
        const item = this._memoryCache.get(key);
        if (Date.now() <= item.expiry) {
          return item.data;
        }
        this._memoryCache.delete(key);
      }

      // Check manifest
      const manifest = await this.getManifest();
      if (manifest[key] && Date.now() > manifest[key].expiry) {
        await this.remove(key);
        return null;
      }

      // Get item from storage
      const cached = await AsyncStorage.getItem(`@cache_${key}`);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      if (Date.now() > parsed.expiry) {
        await this.remove(key);
        return null;
      }

      this._memoryCache.set(key, parsed);
      return parsed.data;
    } catch (error) {
      console.log("[CacheService] get error:", error);
      return null;
    }
  }

  async remove(key) {
    try {
      this._memoryCache.delete(key);
      const manifest = await this.getManifest();
      delete manifest[key];
      await AsyncStorage.setItem(CACHE_MANIFEST_KEY, JSON.stringify(manifest)).catch(() => {});
      await AsyncStorage.removeItem(`@cache_${key}`).catch(() => {});
      return true;
    } catch (error) {
      console.log("[CacheService] remove error:", error);
      return false;
    }
  }

  async clearAll() {
    try {
      this._memoryCache.clear();
      await AsyncStorage.removeItem(CACHE_MANIFEST_KEY).catch(() => {});
      return true;
    } catch (error) {
      console.log("[CacheService] clearAll error:", error);
      return false;
    }
  }

  async getManifest() {
    try {
      const manifest = await AsyncStorage.getItem(CACHE_MANIFEST_KEY);
      return manifest ? JSON.parse(manifest) : {};
    } catch (error) {
      return {};
    }
  }
}

export default new CacheService();

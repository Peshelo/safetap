import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

const CACHE_DIR = `${FileSystem.cacheDirectory}app_cache/`;
const CACHE_MANIFEST_KEY = "@cache_manifest";
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

class CacheService {
  constructor() {
    this.initCacheDir();
  }

  async initCacheDir() {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  }

  async set(key, data, ttl = DEFAULT_TTL) {
    try {
      const timestamp = Date.now();
      const expiry = timestamp + ttl;
      const cacheItem = { data, timestamp, expiry };

      // Update manifest
      const manifest = await this.getManifest();
      manifest[key] = { timestamp, expiry };
      await AsyncStorage.setItem(CACHE_MANIFEST_KEY, JSON.stringify(manifest));

      // Store data based on type
      if (typeof data === "object") {
        await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
      } else if (typeof data === "string" && data.startsWith("file://")) {
        const fileName = `${CACHE_DIR}${key}`;
        await FileSystem.copyAsync({ from: data, to: fileName });
        await AsyncStorage.setItem(key, fileName);
      } else {
        await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
      }

      return true;
    } catch (error) {
      console.error("CacheService set error:", error);
      return false;
    }
  }

  async get(key) {
    try {
      // Check manifest first
      const manifest = await this.getManifest();
      if (!manifest[key]) return null;

      // Check if expired
      if (Date.now() > manifest[key].expiry) {
        await this.remove(key);
        return null;
      }

      // Get the cached item
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      // Handle file paths
      if (cached.startsWith(CACHE_DIR) || cached.startsWith("file://")) {
        const fileInfo = await FileSystem.getInfoAsync(cached);
        return fileInfo.exists ? cached : null;
      }

      // Handle JSON data
      const parsed = JSON.parse(cached);
      return parsed.data;
    } catch (error) {
      console.error("CacheService get error:", error);
      return null;
    }
  }

  async remove(key) {
    try {
      // Remove from manifest
      const manifest = await this.getManifest();
      delete manifest[key];
      await AsyncStorage.setItem(CACHE_MANIFEST_KEY, JSON.stringify(manifest));

      // Remove the item
      const cached = await AsyncStorage.getItem(key);
      if (
        cached &&
        (cached.startsWith(CACHE_DIR) || cached.startsWith("file://"))
      ) {
        await FileSystem.deleteAsync(cached, { idempotent: true });
      }
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error("CacheService remove error:", error);
      return false;
    }
  }

  async clearExpired() {
    try {
      const manifest = await this.getManifest();
      const now = Date.now();
      let clearedCount = 0;

      for (const [key, { expiry }] of Object.entries(manifest)) {
        if (now > expiry) {
          await this.remove(key);
          clearedCount++;
        }
      }

      return clearedCount;
    } catch (error) {
      console.error("CacheService clearExpired error:", error);
      return 0;
    }
  }

  async clearAll() {
    try {
      await AsyncStorage.removeItem(CACHE_MANIFEST_KEY);
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      await this.initCacheDir();
      return true;
    } catch (error) {
      console.error("CacheService clearAll error:", error);
      return false;
    }
  }

  async getManifest() {
    try {
      const manifest = await AsyncStorage.getItem(CACHE_MANIFEST_KEY);
      return manifest ? JSON.parse(manifest) : {};
    } catch (error) {
      console.error("CacheService getManifest error:", error);
      return {};
    }
  }

  async getCacheSize() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) return 0;

      const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
      let totalSize = 0;

      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${CACHE_DIR}${file}`);
        if (fileInfo.exists && fileInfo.size) {
          totalSize += fileInfo.size;
        }
      }

      return totalSize;
    } catch (error) {
      console.error("CacheService getCacheSize error:", error);
      return 0;
    }
  }
}

export default new CacheService();

import AsyncStorage from "@react-native-async-storage/async-storage";

const OFFLINE_CONTACTS_KEY = "@safetap_offline_saved_contacts";
const OFFLINE_DIRECTORY_FULL_KEY = "@safetap_offline_directory_full";

class OfflineContactService {
  constructor() {
    this._memoryDirectoryCache = null;
    this._memoryBookmarksCache = null;
  }

  /**
   * Retrieves all offline bookmarked police station contacts.
   */
  async getOfflineContacts() {
    if (this._memoryBookmarksCache) return this._memoryBookmarksCache;
    try {
      const jsonStr = await AsyncStorage.getItem(OFFLINE_CONTACTS_KEY);
      const parsed = jsonStr ? JSON.parse(jsonStr) : [];
      this._memoryBookmarksCache = parsed;
      return parsed;
    } catch (error) {
      console.error("[OfflineContactService] Failed to read offline contacts:", error);
      return [];
    }
  }

  /**
   * Saves full station directory array to local storage for offline access.
   */
  async saveFullDirectoryOffline(stations) {
    if (!Array.isArray(stations)) return false;
    try {
      this._memoryDirectoryCache = stations;
      await AsyncStorage.setItem(OFFLINE_DIRECTORY_FULL_KEY, JSON.stringify(stations));
      return true;
    } catch (error) {
      console.error("[OfflineContactService] Failed to cache full directory:", error);
      return false;
    }
  }

  /**
   * Gets cached full station directory array from local storage.
   */
  async getFullDirectoryOffline() {
    if (this._memoryDirectoryCache && this._memoryDirectoryCache.length > 0) {
      return this._memoryDirectoryCache;
    }
    try {
      const jsonStr = await AsyncStorage.getItem(OFFLINE_DIRECTORY_FULL_KEY);
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);
        this._memoryDirectoryCache = parsed;
        return parsed;
      }
      return [];
    } catch (error) {
      console.error("[OfflineContactService] Failed to load full cached directory:", error);
      return [];
    }
  }

  /**
   * Saves a police station contact object locally for offline access.
   */
  async saveStationOffline(station) {
    if (!station || !station.id) return false;
    try {
      const currentList = await this.getOfflineContacts();
      const exists = currentList.some((item) => item.id === station.id);
      if (!exists) {
        const updatedList = [station, ...currentList];
        this._memoryBookmarksCache = updatedList;
        await AsyncStorage.setItem(OFFLINE_CONTACTS_KEY, JSON.stringify(updatedList));
      }
      return true;
    } catch (error) {
      console.error("[OfflineContactService] Failed to save station offline:", error);
      return false;
    }
  }

  /**
   * Removes a saved station contact from offline storage.
   */
  async removeStationOffline(stationId) {
    if (!stationId) return false;
    try {
      const currentList = await this.getOfflineContacts();
      const updatedList = currentList.filter((item) => item.id !== stationId);
      this._memoryBookmarksCache = updatedList;
      await AsyncStorage.setItem(OFFLINE_CONTACTS_KEY, JSON.stringify(updatedList));
      return true;
    } catch (error) {
      console.error("[OfflineContactService] Failed to remove offline contact:", error);
      return false;
    }
  }

  /**
   * Checks if a station is currently saved offline.
   */
  async isStationSavedOffline(stationId) {
    if (!stationId) return false;
    try {
      const currentList = await this.getOfflineContacts();
      return currentList.some((item) => item.id === stationId);
    } catch (error) {
      return false;
    }
  }

  /**
   * Toggles bookmark state for a station contact.
   */
  async toggleStationOffline(station) {
    if (!station || !station.id) return false;
    const isSaved = await this.isStationSavedOffline(station.id);
    if (isSaved) {
      await this.removeStationOffline(station.id);
      return false;
    } else {
      await this.saveStationOffline(station);
      return true;
    }
  }
}

export const offlineContactService = new OfflineContactService();
export default offlineContactService;

import AsyncStorage from "@react-native-async-storage/async-storage";

const RECENT_KEY = "safetap_recent_stations_v1";

export const getRecentStations = async () => {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const addRecentStation = async (station) => {
  if (!station || !station.id) return;
  try {
    const current = await getRecentStations();
    const filtered = current.filter((s) => s.id !== station.id);
    const updated = [station, ...filtered].slice(0, 6);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch (e) {
    console.log("addRecentStation error:", e);
  }
};

export const clearRecentStations = async () => {
  try {
    await AsyncStorage.removeItem(RECENT_KEY);
  } catch (e) {}
};

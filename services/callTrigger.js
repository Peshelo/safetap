import { Linking } from "react-native";
import * as Location from "expo-location";
import api from "./api";

export async function triggerStationCall(station) {
  if (!station || (!station.phone && !station.station_number)) {
    console.warn("Station has no phone number available for dialer");
    return;
  }

  const rawNumber = station.phone || station.station_number;
  const phoneNumber = rawNumber.replace(/\D/g, "");

  let latitude = null;
  let longitude = null;
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === "granted") {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      if (loc && loc.coords) {
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }
    }
  } catch (err) {
    console.log("GPS permission check for call log skipped:", err);
  }

  api.callLogs
    .create({
      station_id: station.id || null,
      station_name: station.name || station.station || "General Emergency Hotline",
      station_phone: rawNumber,
      user_latitude: latitude,
      user_longitude: longitude,
      caller_device: "Mobile App",
    })
    .catch((err) => console.log("Background call log error:", err));

  Linking.openURL(`tel:${phoneNumber}`).catch((err) =>
    console.error("Failed to launch native phone dialer:", err)
  );
}

import { Platform } from "react-native";
import * as Location from "expo-location";
import api from "./api";

class AnalyticsService {
  constructor() {
    this.locationPermissionCache = null;
  }

  /**
   * Safe check for iOS and Android location permission state.
   */
  async checkLocationPermission() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      this.locationPermissionCache = status === "granted";
      return this.locationPermissionCache;
    } catch (e) {
      return false;
    }
  }

  /**
   * Tracks feature access and optionally includes user location if allowed.
   * Fully compliant with iOS Apple Privacy & App Store Guidelines.
   */
  async trackFeature(featureName, options = {}) {
    try {
      let coords = null;
      const isAllowed = await this.checkLocationPermission();

      if (isAllowed && options.includeLocation !== false) {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
        } catch (locErr) {
          // Non-blocking fallback if location fetch fails
          console.log("[Analytics] Location ping skipped:", locErr.message);
        }
      }

      const payload = {
        event_type: options.eventType || "FEATURE_ACCESS",
        feature_name: featureName,
        platform: Platform.OS,
        latitude: coords ? coords.latitude : null,
        longitude: coords ? coords.longitude : null,
        device_info: `${Platform.OS} ${Platform.Version}`,
      };

      // Fire & Forget background request
      api.analytics.track(payload).catch((err) => {
        console.log("[Analytics] Telemetry payload failed silently:", err.message);
      });
    } catch (err) {
      // Fail silently without disrupting user flow
    }
  }

  /**
   * Direct location telemetry ping (if user grants permission).
   */
  async trackLocation(featureContext = "Location Update") {
    return this.trackFeature(featureContext, { eventType: "LOCATION_PING", includeLocation: true });
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;

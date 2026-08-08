import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import api from "./api";

// Check if running inside Expo Go client environment
const isExpoGo =
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === "storeClient";

let Notifications = null;

if (!isExpoGo) {
  try {
    Notifications = require("expo-notifications");
    // Configure foreground notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (err) {
    console.log("[NotificationService] expo-notifications unavailable:", err.message);
  }
}

class NotificationService {
  constructor() {
    this.pushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  /**
   * Initializes Expo Push Notifications, requests permissions,
   * registers push token with FastAPI backend, and sets up listeners.
   */
  async init(navigationHandler = null) {
    if (!Device.isDevice) {
      console.log("[NotificationService] Push notifications require a physical device.");
      return null;
    }

    if (isExpoGo || !Notifications) {
      console.log(
        "[NotificationService] Running in Expo Go. Remote push tokens require a development build (npx expo run:android / expo run:ios)."
      );
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("[NotificationService] Push notification permission denied.");
        return null;
      }

      // Get Expo Push Token safely
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      }).catch((tokenErr) => {
        console.log("[NotificationService] Push token notice:", tokenErr.message);
        return null;
      });

      if (!tokenData) return null;

      this.pushToken = tokenData.data;

      // Register token with backend server
      await this.registerTokenWithBackend(this.pushToken);

      // Setup Android notification channel
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#0052CC",
        });
      }

      // Listener for incoming notification while app is foregrounded
      this.notificationListener = Notifications.addNotificationReceivedListener(
        (notification) => {
          console.log("[NotificationService] Foreground Push Received:", notification);
        }
      );

      // Listener for user tapping notification action
      this.responseListener = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data = response.notification.request.content.data;
          console.log("[NotificationService] User tapped notification data:", data);
          if (navigationHandler && data) {
            navigationHandler(data);
          }
        }
      );

      return this.pushToken;
    } catch (error) {
      console.log("[NotificationService] Push initialization notice:", error.message);
      return null;
    }
  }

  /**
   * Registers push token with FastAPI backend server.
   */
  async registerTokenWithBackend(token) {
    if (!token) return;
    try {
      await api.analytics.track({
        event_type: "PUSH_TOKEN_REGISTER",
        feature_name: "Push Notification System",
        platform: Platform.OS,
        device_info: `${Platform.OS} Push Client`,
      });

      await api.notifications.registerToken({
        token,
        platform: Platform.OS,
        device_info: `${Device.brand || ""} ${Device.modelName || ""}`.trim(),
      });
    } catch (err) {
      console.log("[NotificationService] Backend registration notice:", err.message);
    }
  }

  /**
   * Cleans up notification listeners.
   */
  cleanup() {
    if (this.notificationListener && Notifications) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener && Notifications) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;

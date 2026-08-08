import 'dotenv/config';

export default {
  expo: {
    name: "ZRP SafeTap",
    slug: "safetap",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.peshelgomo.safetap",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "ZRP SafeTap requires access to your location to locate nearby police stations and send emergency SOS location coordinates.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "ZRP SafeTap uses your location to navigate you to the nearest ZRP police station during emergency situations.",
        NSCameraUsageDescription: "ZRP SafeTap requires camera access to allow you to scan police station QR contact cards and upload incident photos.",
        NSPhotoLibraryUsageDescription: "ZRP SafeTap requires photo library access to allow you to upload supporting incident documentation.",
        NSContactsUsageDescription: "ZRP SafeTap requires contact access to save official police station phone numbers directly to your device contacts."
      }
    },

    android: {
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      },
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#0F172A"
      },
      package: "com.peshelgomo.safetap",
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "READ_CONTACTS",
        "WRITE_CONTACTS"
      ]
    },

    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },

    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#0F172A"
        }
      ],
      "expo-secure-store",
      "expo-location",
      "expo-image-picker",
      [
        "expo-contacts",
        {
          contactsPermission: "Allow ZRP SafeTap to save police station contact details to your device contacts."
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#0052CC"
        }
      ]
    ],

    experiments: {
      typedRoutes: true
    },

    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: "7d350930-32c7-4d2a-a4a6-8f12559add72"
      }
    }
  }
};
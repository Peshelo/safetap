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
      bundleIdentifier: "com.peshelgomo.safetap"
    },

    android: {
      usesCleartextTraffic: true,
      softwareKeyboardLayoutMode: "resize",
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      },
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.peshelgomo.safetap"
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
          backgroundColor: "#ffffff"
        }
      ],
      "expo-secure-store",
      [
        "expo-location",
        {
          locationWhenInUsePermission: "Allow SafeTap to use your location for nearby police stations and emergency reports."
        }
      ],
      [
        "expo-contacts",
        {
          contactsPermission: "Allow SafeTap to import or save emergency and police contacts when you request it."
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Allow SafeTap to attach a selected photo as evidence to your report.",
          cameraPermission: "Allow SafeTap to take a photo to attach as evidence to your report."
        }
      ]
    ],

    experiments: {
      typedRoutes: true
    },

    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      router: {
        origin: false
      },
      eas: {
        projectId: "7d350930-32c7-4d2a-a4a6-8f12559add72"
      }
    }
  }
};

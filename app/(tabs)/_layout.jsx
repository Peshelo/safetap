import { View, Platform } from "react-native";
import React from "react";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import "../global.css";

export default function RootLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          // position: "absolute",
          // bottom: insets.bottom ? insets.bottom : 10,
          left: 20,
          right: 20,
          height: 60 ,

          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          borderTopWidth: 0,
          paddingHorizontal: 10,
          paddingBottom: insets.bottom ? insets.bottom : 10,
        },
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#64748b",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          paddingBottom: 4,
        },
        tabBarHideOnKeyboard: true, // hides tab bar when keyboard is open
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={focused ? "#2563eb" : "#64748b"}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="contacts"
        options={{
          title: "Stations",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "call" : "call-outline"}
              size={24}
              color={focused ? "#2563eb" : "#64748b"}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={focused ? "file-document" : "file-document-outline"}
              size={24}
              color={focused ? "#2563eb" : "#64748b"}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="about"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={28}
              color={focused ? "#2563eb" : "#64748b"}
            />
          ),
        }}
      />
    </Tabs>
  );
}

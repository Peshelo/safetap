import { View } from "react-native";
import React from "react";
import { Tabs } from "expo-router";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler"; // ADD THIS

// Change this line - remove the variable assignment
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* WRAP HERE */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "white",
            position: "absolute",
            bottom: 0,
            left: 20,
            right: 20,
            height: 60,
            borderRadius: 15,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            borderTopWidth: 0,
            paddingHorizontal: 10,
          },
          tabBarActiveTintColor: "#2563eb",
          tabBarInactiveTintColor: "#64748b",
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "500",
            paddingBottom: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? "albums" : "albums-outline"}
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
          name="trackcase"
          options={{
            title: "Track Case",
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? "search" : "search-outline"}
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
              <Ionicons
                name={focused ? "document-text" : "document-text-outline"}
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
                name={focused ? "person" : "person-outline"}
                size={24}
                color={focused ? "#2563eb" : "#64748b"}
              />
            ),
          }}
        />
      </Tabs>
    </GestureHandlerRootView> // CLOSE HERE
  );
}

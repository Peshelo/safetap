import React from "react";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "../components/Icons";
import { View, StyleSheet } from "react-native";
import "../global.css";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#1E3A8A" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#D1D5DB", // Light gray border (hex value)

            height: 58 + insets.bottom,
            paddingTop: 0,
            paddingBottom: Math.max(insets.bottom, 8),
            paddingHorizontal: 0,
            marginHorizontal: 0,
            elevation: 0,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            overflow: "hidden",
          },
          tabBarActiveTintColor: "#1E40AF", // Dark blue for active
          tabBarInactiveTintColor: "#A9A9A9", // Darker gray for inactive
          tabBarLabelStyle: {
            fontSize: 9,
            fontWeight: "500",
            marginTop: 2,
            marginBottom: 0,
          },
          tabBarIconStyle: {
            marginTop: 2,
          },
          tabBarItemStyle: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingVertical: 4,
          },
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={22}
                color={color}
              />
            ),
            
          }}
        />

        <Tabs.Screen
          name="contacts"
          options={{
            title: "Stations",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? "call" : "call-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />
          <Tabs.Screen
          name="news"
          options={{
            title: "News",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? "newspaper" : "newspaper-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="services"
          options={{
            title: "Services",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? "grid" : "grid-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="about"
          options={{
            title: "About",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? "information-circle" : "information-circle-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

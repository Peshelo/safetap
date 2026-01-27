import React from "react";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Platform, View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import "../global.css";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="light"/>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "transparent",
            borderTopWidth: 1,
            borderTopColor: "#D1D5DB", // Light gray border (hex value)

            height: Platform.select({
              ios: 70 + (insets.bottom > 0 ? insets.bottom - 20 : 0),
              android: 70,
            }),
            paddingTop: 0,
            paddingBottom: Platform.select({
              ios: insets.bottom > 0 ? insets.bottom : 16,
              android: 12,
            }),
            paddingHorizontal: 0,
            marginHorizontal: 0,
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
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
          tabBarBackground: () => (
            <BlurView
              intensity={100}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={size || 19}
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
                size={size || 19}
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
                size={size || 19}
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
                name={focused ? "list-circle" : "list-outline"}
                size={size || 19}
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
                name={focused ? "information-circle" : "information-circle"}
                size={size || 19}
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
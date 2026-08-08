import React from "react";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { componentHeights } from "../../src/constants/theme";
import { useAppTheme } from "../../src/context/ThemeContext";

export default function RootLayout() {
  const { colors: themeColors, mode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);
  const totalNavHeight = componentHeights.bottomNav + bottomPadding;

  return (
    <View style={styles.container}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: themeColors.surface,
            borderTopWidth: 1,
            borderTopColor: themeColors.border,
            height: totalNavHeight,
            paddingTop: 8,
            paddingBottom: bottomPadding,
            paddingHorizontal: 0,
            elevation: 0,
            shadowColor: "transparent",
          },
          tabBarActiveTintColor: themeColors.primary,
          tabBarInactiveTintColor: themeColors.textMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
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
          },
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused, color }) => (
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
            tabBarIcon: ({ focused, color }) => (
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
            title: "News Hub",
            tabBarIcon: ({ focused, color }) => (
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
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "apps" : "apps-outline"}
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
            tabBarIcon: ({ focused, color }) => (
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

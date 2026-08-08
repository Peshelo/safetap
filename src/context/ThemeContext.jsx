import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";

const STORAGE_KEY = "safetap_colour_scheme";
const ThemeContext = createContext(null);

const palettes = {
  light: {
    mode: "light",
    isDark: false,
    isLight: true,
    background: "#F8FAFC",
    pageBg: "#F8FAFC",
    surface: "#FFFFFF",
    cardBg: "#FFFFFF",
    surfaceMuted: "#F1F5F9",
    sectionBg: "#F1F5F9",
    text: "#0B1220",
    textPrimary: "#0B1220",
    textSecondary: "#475569",
    textMuted: "#64748B",
    border: "#E2E8F0",
    primary: "#1E3A8A",
    primarySoft: "#EFF6FF",
    danger: "#DC2626",
    warning: "#C49A45",
    success: "#0E9F6E",
    header: "#1E3A8A",
    headerText: "#FFFFFF",
    neutral: {
      50: "#F8FAFC",
      100: "#F1F5F9",
      200: "#E2E8F0",
      300: "#CBD5E1",
      400: "#94A3B8",
      500: "#64748B",
      600: "#475569",
      700: "#334155",
      800: "#1E293B",
      900: "#0F172A",
      950: "#020617",
      white: "#FFFFFF",
    },
  },
  dark: {
    mode: "dark",
    isDark: true,
    isLight: false,
    background: "#0F172A",
    pageBg: "#0F172A",
    surface: "#1E293B",
    cardBg: "#1E293B",
    surfaceMuted: "#334155",
    sectionBg: "#1E293B",
    text: "#FFFFFF",
    textPrimary: "#F8FAFC",
    textSecondary: "#CBD5E1",
    textMuted: "#94A3B8",
    border: "#334155",
    primary: "#D97706",
    primarySoft: "#451A03",
    danger: "#F87171",
    warning: "#F59E0B",
    success: "#34D399",
    header: "#0F172A",
    headerText: "#FFFFFF",
    neutral: {
      50: "#020617",
      100: "#0F172A",
      200: "#1E293B",
      300: "#334155",
      400: "#64748B",
      500: "#94A3B8",
      600: "#CBD5E1",
      700: "#E2E8F0",
      800: "#F1F5F9",
      900: "#F8FAFC",
      950: "#FFFFFF",
      white: "#1E293B",
    },
  },
};

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState("light");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark") {
          setPreference(stored);
        } else {
          setPreference("light");
        }
      })
      .catch(() => {
        setPreference("light");
      });
  }, []);

  const setMode = async (mode) => {
    setPreference(mode);
    await AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  };

  const toggleTheme = () => {
    const nextMode = preference === "dark" ? "light" : "dark";
    setMode(nextMode);
  };

  const activeMode = preference === "dark" ? "dark" : "light";
  const currentPalette = palettes[activeMode];

  const value = useMemo(
    () => ({
      preference,
      mode: activeMode,
      isDark: activeMode === "dark",
      isLight: activeMode === "light",
      colors: currentPalette,
      setMode,
      toggleTheme,
    }),
    [preference, activeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used inside ThemeProvider");
  }
  return context;
}

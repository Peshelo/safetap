import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

export const ONBOARDING_KEY = "safetap:onboarding:v3";

export default function LaunchGate() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const chooseInitialRoute = async () => {
      try {
        const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (active) router.replace(completed === "complete" ? "/(tabs)" : "/onboarding");
      } catch (error) {
        console.warn("Could not read onboarding state", error);
        if (active) router.replace("/onboarding");
      }
    };
    chooseInitialRoute();
    return () => { active = false; };
  }, [router]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" backgroundColor="#1E3A8A" />
      <ActivityIndicator size="large" color="#FBBF24" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1E3A8A" },
});

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../src/components/AppHeader";
import { useAppTheme } from "../src/context/ThemeContext";

const options = [
  { key: "system", label: "Use device setting", icon: "phone-portrait-outline", description: "Automatically follows your phone's appearance." },
  { key: "light", label: "Light", icon: "sunny-outline", description: "A clear, high-contrast daytime interface." },
  { key: "dark", label: "Dark", icon: "moon-outline", description: "A calmer low-light interface." },
];

export default function SettingsScreen() {
  const { colors, preference, setMode } = useAppTheme();
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title="Settings" subtitle="Your SafeTap preferences" showBack />
      <View style={styles.content}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Colour mode</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>Choose how SafeTap looks on this device.</Text>
          {options.map((option) => {
            const selected = preference === option.key;
            return (
              <TouchableOpacity key={option.key} onPress={() => setMode(option.key)} style={[styles.option, { borderTopColor: colors.border }]} accessibilityRole="radio" accessibilityState={{ selected }}>
                <View style={[styles.icon, { backgroundColor: selected ? colors.primarySoft : colors.surfaceMuted }]}><Ionicons name={option.icon} size={20} color={selected ? colors.primary : colors.textMuted} /></View>
                <View style={styles.optionText}><Text style={[styles.optionTitle, { color: colors.text }]}>{option.label}</Text><Text style={[styles.optionDescription, { color: colors.textMuted }]}>{option.description}</Text></View>
                <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={22} color={selected ? colors.primary : colors.border} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 }, content: { padding: 20 }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.1, marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 16, overflow: "hidden" }, title: { fontSize: 18, fontWeight: "700", paddingHorizontal: 16, paddingTop: 16 },
  description: { fontSize: 13, lineHeight: 19, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderTopWidth: 1 }, icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  optionText: { flex: 1 }, optionTitle: { fontSize: 15, fontWeight: "700" }, optionDescription: { fontSize: 12, lineHeight: 17, marginTop: 2 },
});

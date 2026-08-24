import React, { useMemo, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import CustomHeader from "../components/Header";
import { Ionicons } from "../components/Icons";

const groups = [
  {
    title: "Police services",
    items: [
      { title: "Station directory", subtitle: "Search verified police station contacts", icon: "call-outline", route: "/(tabs)/contacts" },
      { title: "Nearby stations map", subtitle: "View stations and get directions", icon: "map-outline", route: "/maps" },
      { title: "Suggestion box", subtitle: "Submit a comment, complaint or suggestion", icon: "chatbox-outline", route: "/report/complaint" },
      { title: "Missing persons", subtitle: "Search profiles or report information", icon: "person-outline", route: "/missing-persons" },
      { title: "Wanted persons", subtitle: "View profiles or report information", icon: "search-outline", route: "/wanted-persons" },
    ],
  },
  {
    title: "Information",
    items: [
      { title: "News and press releases", subtitle: "Official Zimbabwe Republic Police updates", icon: "newspaper-outline", route: "/(tabs)/news" },
      { title: "About SafeTap", subtitle: "App information, social links and support", icon: "information-circle-outline", route: "/(tabs)/about" },
      { title: "Privacy policy", subtitle: "How SafeTap handles information", icon: "lock-closed-outline", route: "/privacy-policy" },
      { title: "Terms and conditions", subtitle: "Rules for using SafeTap", icon: "document-text-outline", route: "/terms-and-conditions" },
    ],
  },
];

export default function Services() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const filteredGroups = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return groups;
    return groups.map((group) => ({
      ...group,
      items: group.items.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(term)),
    })).filter((group) => group.items.length);
  }, [query]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      <CustomHeader title="Services" subtitle="Zimbabwe Republic Police" showLogo compact />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text style={styles.introLabel}>AVAILABLE SERVICES</Text>
          <Text style={styles.introTitle}>What do you need?</Text>
          <Text style={styles.introText}>Only services currently available in SafeTap are shown.</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={19} color="#64748B" />
            <TextInput value={query} onChangeText={setQuery} placeholder="Search services" placeholderTextColor="#9CA3AF" style={styles.searchInput} />
            {query ? <TouchableOpacity onPress={() => setQuery("")}><Ionicons name="close-circle" size={18} color="#9CA3AF" /></TouchableOpacity> : null}
          </View>
        </View>

        {filteredGroups.map((group) => (
          <View key={group.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{group.title}</Text>
            <View style={styles.card}>
              {group.items.map((item, index) => (
                <React.Fragment key={item.title}>
                  <TouchableOpacity style={styles.row} onPress={() => router.push(item.route)} activeOpacity={0.72}>
                    <View style={styles.iconBox}><Ionicons name={item.icon} size={20} color="#1E3A8A" /></View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>{item.title}</Text>
                      <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                  {index < group.items.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        {!filteredGroups.length && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="search-outline" size={28} color="#64748B" /></View>
            <Text style={styles.emptyTitle}>No service found</Text>
            <Text style={styles.emptyText}>Try a different search term.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F7F9" }, content: { width: "100%", maxWidth: 900, alignSelf: "center", paddingBottom: 30 },
  intro: { backgroundColor: "#1E3A8A", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  introLabel: { color: "#BFDBFE", fontFamily: "GoogleSans_600SemiBold", fontSize: 10, letterSpacing: 1.1 },
  introTitle: { color: "#FFFFFF", fontFamily: "GoogleSans_700Bold", fontSize: 26, marginTop: 7 },
  introText: { color: "#DBEAFE", fontSize: 12.5, marginTop: 4 },
  searchBox: { height: 46, marginTop: 18, backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 9 },
  searchInput: { flex: 1, color: "#111827", fontSize: 14, paddingVertical: 0 },
  section: { marginTop: 22, paddingHorizontal: 16 }, sectionTitle: { color: "#111827", fontFamily: "GoogleSans_700Bold", fontSize: 15, marginBottom: 10 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
  row: { minHeight: 74, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center" },
  iconBox: { width: 40, height: 40, borderRadius: 11, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center", marginRight: 12 },
  rowCopy: { flex: 1, minWidth: 0 }, rowTitle: { color: "#111827", fontFamily: "GoogleSans_600SemiBold", fontSize: 14 }, rowSubtitle: { color: "#64748B", fontSize: 11.5, marginTop: 3 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#E5E7EB", marginLeft: 66 },
  empty: { alignItems: "center", padding: 48 }, emptyIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: "#111827", fontFamily: "GoogleSans_600SemiBold", fontSize: 15, marginTop: 14 }, emptyText: { color: "#64748B", fontSize: 12, marginTop: 4 },
});

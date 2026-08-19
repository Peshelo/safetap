import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import CustomHeader from "./Header";

export default function LegalDocumentPage({ title, subtitle, effectiveDate, sections }) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" backgroundColor="#1E3A8A" />
      <CustomHeader
        title={title}
        subtitle={subtitle}
        showBackButton
        onBack={() => router.back()}
        compact
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.effectiveDate}>Effective date: {effectiveDate}</Text>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.heading}>{section.title}</Text>
            {section.paragraphs.map((paragraph, index) => (
              <Text key={`${section.title}-${index}`} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  effectiveDate: { color: "#64748B", fontSize: 13, marginBottom: 22 },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  heading: { color: "#0F172A", fontSize: 17, fontWeight: "700", marginBottom: 10 },
  paragraph: { color: "#475569", fontSize: 15, lineHeight: 23, marginBottom: 9 },
});

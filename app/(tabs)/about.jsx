import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  Alert,
  Switch,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import AppHeader from "../../src/components/AppHeader";
import { colors, radius, spacing, typography, componentHeights } from "../../src/constants/theme";
import { useAppTheme } from "../../src/context/ThemeContext";

const About = () => {
  const router = useRouter();
  const { colors: themeColors, isDark, toggleTheme } = useAppTheme();

  const socialMediaLinks = [
    {
      id: "facebook",
      name: "Facebook",
      icon: "logo-facebook",
      color: "#1877F2",
      url: "https://www.facebook.com/ZimbabweRepublicPolice",
      username: "@ZimbabweRepublicPolice",
    },
    {
      id: "x",
      name: "X",
      icon: "logo-twitter",
      color: "#1DA1F2",
      url: "https://x.com/policezimbabwe",
      username: "@PoliceZimbabwe",
    },
  ];

  const appInfoSection = [
    {
      title: "Privacy Policy",
      icon: "policy",
      onPress: () => Linking.openURL("https://zrp.gov.zw/safetap-privacy-policy"),
    },
    {
      title: "Terms of Service",
      icon: "description",
      onPress: () => Linking.openURL("https://zrp.gov.zw/safetap-terms-of-service"),
    },
    {
      title: "Help & Support",
      icon: "help",
      onPress: () => Linking.openURL("mailto:support@zrp.gov.zw"),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <AppHeader
        title="About & Settings"
        subtitle="Republic of Zimbabwe Official Platform"
      />

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* App Logo & Header Summary */}
        <View style={[styles.appHeaderCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Image source={require("../../assets/images/logo-alternate.png")} style={styles.appLogo} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.appNameText, { color: themeColors.textPrimary }]}>ZRP SafeTap</Text>
            <Text style={[styles.appVerText, { color: themeColors.textMuted }]}>Version 1.0.0 (Build 2026)</Text>
          </View>
        </View>

        {/* Appearance & Theme Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitleHeader, { color: themeColors.primary }]}>Appearance & Theme</Text>
          <View style={[styles.groupedCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={styles.groupedRow}>
              <View style={[styles.groupedIconWrap, { backgroundColor: themeColors.sectionBg }]}>
                <Ionicons name={isDark ? "moon" : "sunny"} size={18} color={themeColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.groupedTitle, { color: themeColors.textPrimary }]}>Dark Mode</Text>
                <Text style={[styles.groupedSub, { color: themeColors.textSecondary }]}>
                  {isDark ? "Midnight Slate theme enabled" : "Clean light theme active"}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Official Channels (Screenshot 2 Grouped List Style) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitleHeader, { color: themeColors.primary }]}>Official Social Channels</Text>
          <View style={[styles.groupedCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            {socialMediaLinks.map((social, idx) => (
              <TouchableOpacity
                key={social.id}
                style={[
                  styles.groupedRow,
                  idx < socialMediaLinks.length - 1 && { borderBottomWidth: 1, borderBottomColor: themeColors.border },
                ]}
                onPress={() => Linking.openURL(social.url)}
              >
                <View style={[styles.groupedIconWrap, { backgroundColor: themeColors.sectionBg }]}>
                  <Ionicons name={social.icon} size={18} color={social.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.groupedTitle, { color: themeColors.textPrimary }]}>{social.name}</Text>
                  <Text style={[styles.groupedSub, { color: themeColors.textMuted }]}>{social.username}</Text>
                </View>
                <Ionicons name="open-outline" size={16} color={themeColors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Legal & System Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitleHeader, { color: themeColors.primary }]}>Information & Legal</Text>
          <View style={[styles.groupedCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            {appInfoSection.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.groupedRow,
                  idx < appInfoSection.length - 1 && { borderBottomWidth: 1, borderBottomColor: themeColors.border },
                ]}
                onPress={item.onPress}
              >
                <View style={[styles.groupedIconWrap, { backgroundColor: themeColors.sectionBg }]}>
                  <MaterialIcons name={item.icon} size={18} color={themeColors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.groupedTitle, { color: themeColors.textPrimary }]}>{item.title}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={[styles.copyrightText, { color: themeColors.textMuted }]}>
          © 2026 Zimbabwe Republic Police. All Rights Reserved.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  appHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 14,
  },
  appLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    resizeMode: "contain",
  },
  appNameText: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
  },
  appVerText: {
    fontSize: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitleHeader: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  groupedCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  groupedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  groupedIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  groupedTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  groupedSub: {
    fontSize: 12,
    marginTop: 1,
  },
  copyrightText: {
    textAlign: "center",
    fontSize: 11,
    marginTop: 12,
    marginBottom: 20,
  },
});

export default About;

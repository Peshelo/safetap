import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Linking,
} from "react-native";
import { Ionicons } from "../components/Icons";
import * as SecureStore from "expo-secure-store";
import { TextInput } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomHeader from "../components/Header";

const About = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Social media links for Zimbabwe Republic Police
  const socialMediaLinks = [
    {
      id: "facebook",
      name: "Facebook",
      icon: "logo-facebook",
      color: "#1877F2",
      url: "https://www.facebook.com/p/Zimbabwe-Republic-Police-zrp-100088691142271/",
      username: "@ZimbabweRepublicPolice",
    },
    {
      id: "x",
      name: "X",
      icon: "logo-x",
      color: "#000000",
      url: "https://x.com/policezimbabwe",
      username: "@ZRP",
    }
  ];

  const openSocialMedia = (url) => {
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open the link");
    });
  };

  // App info section
  const appInfoSection = [
    {
      title: "Getting Started",
      icon: "rocket-outline",
      color: "#8E8E93",
      onPress: () => router.push("/onboarding"),
    },
    {
      title: "Privacy Policy",
      icon: "policy",
      color: "#8E8E93",
      onPress: () => router.push("/privacy-policy"),
    },
    {
      title: "Terms & Conditions",
      icon: "description",
      color: "#8E8E93",
      onPress: () => router.push("/terms-and-conditions"),
    },
    {
      title: "Help & Support",
      icon: "help",
      color: "#8E8E93",
      onPress: () => Linking.openURL("mailto:support@zrp.co.zw"),
    },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" backgroundColor="#1E3A8A" />

      <CustomHeader title="About SafeTap" subtitle="Zimbabwe Republic Police" showLogo compact />

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* App Information */}
        <View style={styles.section}>
          <View style={styles.appInfo}>
            <Image
              source={require("../../assets/images/logo-alternate.png")}
              style={styles.appLogo}
            />
            <View style={styles.appInfoContent}>
              <Text style={styles.appName}>SafeTap</Text>
              <Text style={styles.appSubtitle}>Zimbabwe Republic Police</Text>
              <Text style={styles.appVersion}>Version 1.0.0</Text>
            </View>
          </View>

          <Text style={styles.appDescription}>
            SafeTap connects Zimbabweans to police services for fast emergency reporting and crime prevention.
          </Text>
        </View>

        {/* Social Media Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow ZRP</Text>
          <View style={styles.socialMediaContainer}>
            {socialMediaLinks.map((social) => (
              <TouchableOpacity
                key={social.id}
                style={styles.socialItem}
                onPress={() => openSocialMedia(social.url)}
                activeOpacity={0.7}
              >
                <View 
                  style={[styles.socialIcon, { backgroundColor: `${social.color}15` }]}
                >
                  <Ionicons name={social.icon} size={28} color={social.color} />
                </View>
                <View style={styles.socialInfo}>
                  <Text style={styles.socialName}>{social.name}</Text>
                  <Text style={styles.socialUsername}>{social.username}</Text>
                </View>
                <Ionicons name="open-outline" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => Linking.openURL("mailto:info@zrp.gov.zw")}
          >
            <View style={[styles.contactIcon, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="mail" size={20} color="#1E3A8A" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>info@zrp.gov.zw</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => Linking.openURL("https://www.zrp.gov.zw")}
          >
            <View style={[styles.contactIcon, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="globe" size={20} color="#1E3A8A" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Website</Text>
              <Text style={styles.contactValue}>www.zrp.gov.zw</Text>
            </View>
            <Ionicons name="open-outline" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* App Info Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>
          {appInfoSection.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.listItem}
              onPress={item.onPress}
            >
              <View style={[styles.listIcon, { backgroundColor: "#F3F4F6" }]}>
                <Ionicons name={item.icon} size={20} color="#6B7280" />
              </View>
              <Text style={styles.listText}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© {new Date().getFullYear()} Zimbabwe Republic Police</Text>
          <Text style={styles.footerSubtext}>www.zrp.gov.zw</Text>
        </View>
        
        {/* Footer Spacing */}
        <View style={styles.footerSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7F9",
  },
  // Header matching other pages
  header: {
    backgroundColor: "#1E3A8A",
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    paddingBottom: 20,
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8EAED",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  appInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  appLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  appInfoContent: {
    flex: 1,
  },
  appName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  appSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  appDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  // Social Media Styles
  socialMediaContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  socialItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  socialIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  socialInfo: {
    flex: 1,
  },
  socialName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  socialUsername: {
    fontSize: 13,
    color: "#6B7280",
  },
  // Contact Styles
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },
  // List Item Styles
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  listText: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
  },
  footer: {
    padding: 24,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  footerText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
  footerSpacing: {
    height: 20,
  },
});

export default About;

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
import { MaterialIcons, Ionicons, Feather } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { TextInput } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";

const About = () => {
  const navigation = useNavigation();
  const router = useRouter();
  
  const [userInfo, setUserInfo] = useState({
    emergencyContact: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  // Load saved user info
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const savedInfo = await SecureStore.getItemAsync("userEmergencyInfo");
        if (savedInfo) {
          const parsedInfo = JSON.parse(savedInfo);
          setUserInfo({
            emergencyContact: parsedInfo.emergencyContact || '',
          });
        }
      } catch (error) {
        console.error("Failed to load user info", error);
      }
    };
    loadUserInfo();
  }, []);

  const handleInputChange = (field, value) => {
    setUserInfo((prev) => ({ ...prev, [field]: value }));
  };

  const saveUserInfo = async () => {
    try {
      await SecureStore.setItemAsync(
        "userEmergencyInfo",
        JSON.stringify(userInfo)
      );
      Alert.alert("Success", "Your information has been saved securely");
      setIsEditing(false);
    } catch (error) {
      Alert.alert("Error", "Failed to save your information");
      console.error(error);
    }
  };

  const resetUserInfo = async () => {
    Alert.alert(
      "Confirm Reset",
      "Are you sure you want to delete all your personal information?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync("userEmergencyInfo");
              setUserInfo({
                emergencyContact: '',
              });
              Alert.alert("Success", "Your information has been deleted");
            } catch (error) {
              Alert.alert("Error", "Failed to delete your information");
            }
          },
        },
      ]
    );
  };

  // Menu sections (commented out for now)
  /*
  const menuSections = [
    {
      title: "Dashboard",
      icon: "dashboard",
      color: "#007AFF",
      onPress: () => navigation.navigate("dashboard"),
    },
    {
      title: "Information & Procedures",
      icon: "info",
      color: "#34C759",
      onPress: () => navigation.navigate("information"),
    },
    {
      title: "Change Language",
      icon: "language",
      color: "#AF52DE",
      onPress: () => {
        Alert.alert(
          "Language Settings",
          "Select your preferred language",
          [
            { text: "English", onPress: () => {} },
            { text: "Shona", onPress: () => {} },
            { text: "Ndebele", onPress: () => {} },
            { text: "Cancel", style: "cancel" }
          ]
        );
      },
    },
    {
      title: "Walkthrough",
      icon: "directions-walk",
      color: "#FF9500",
      onPress: () => navigation.navigate("walkthrough"),
    },
    {
      title: "Report Criminal Complaint",
      icon: "report",
      color: "#FF3B30",
      onPress: () => navigation.navigate("report"),
    },
    {
      title: "About Us",
      icon: "groups",
      color: "#5856D6",
      onPress: () => navigation.navigate("about-us"),
    },
  ];
  */

  // App info section
  const appInfoSection = [
    {
      title: "Privacy Policy",
      icon: "policy",
      color: "#8E8E93",
      onPress: () => Linking.openURL("https://zrp.gov.zw/privacy"),
    },
    {
      title: "Terms of Service",
      icon: "description",
      color: "#8E8E93",
      onPress: () => Linking.openURL("https://zrp.gov.zw/terms"),
    },
    {
      title: "Help & Support",
      icon: "help",
      color: "#8E8E93",
      // onPress: () => navigation.navigate("support"),
    },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />

      {/* Header matching other pages */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
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

        {/* Emergency Contact Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency Contact</Text>
            {!isEditing ? (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Feather name="edit" size={20} color="#1E3A8A" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={saveUserInfo}>
                <Ionicons name="checkmark" size={24} color="#059669" />
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <View style={styles.editSection}>
              <TextInput
                style={styles.input}
                placeholder="Emergency Contact Number (e.g. 0777723454)"
                value={userInfo.emergencyContact}
                onChangeText={(text) => handleInputChange("emergencyContact", text)}
                keyboardType="phone-pad"
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={saveUserInfo}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="call" size={20} color="#1E3A8A" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Emergency Contact</Text>
                  <Text style={styles.infoValue}>
                    {userInfo.emergencyContact || "Not set"}
                  </Text>
                </View>
              </View>
              {userInfo.emergencyContact && (
                <TouchableOpacity 
                  style={styles.resetButton}
                  onPress={resetUserInfo}
                >
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  <Text style={styles.resetButtonText}>Clear Contact</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Features Section - Commented out for now */}
        {/*
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          {menuSections.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.listItem}
              onPress={item.onPress}
            >
              <View style={[styles.listIcon, { backgroundColor: `${item.color}15` }]}>
                <MaterialIcons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.listText}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
        */}

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
                <MaterialIcons name={item.icon} size={20} color="#6B7280" />
              </View>
              <Text style={styles.listText}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Zimbabwe Republic Police</Text>
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
    backgroundColor: "#f8fafc",
  },
  // Header matching other pages
  header: {
    backgroundColor: "#1E3A8A",
    paddingTop: 50,
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
    paddingBottom: 20,
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginTop: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  editSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#111827",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  saveButton: {
    flex: 1,
    padding: 12,
    backgroundColor: "#1E3A8A",
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  infoSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DC2626",
  },
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
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CustomHeader = ({
  title,
  subtitle,
  showBackButton = false,
  onBack,
  showLogo = false,
  rightComponent,
  compact = false, // New prop for extra compact mode
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.headerContainer,
        { paddingTop: insets.top + (compact ? 8 : 16) },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1e40af" />
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          {showBackButton && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="arrow-back"
                size={compact ? 26 : 28}
                color="#fff"
              />
            </TouchableOpacity>
          )}
          <View style={styles.titleSection}>
            <Text
              style={[styles.headerTitle, compact && styles.headerTitleCompact]}
            >
              {title}
            </Text>
            {subtitle && !compact && (
              <Text
                style={[
                  styles.headerSubtitle,
                  compact && styles.headerSubtitleCompact,
                ]}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.headerRight}>
          {showLogo && (
            <Image
              source={require("../../assets/images/logo.png")}
              style={[styles.logoImage, compact && styles.logoImageCompact]}
            />
          )}
          {rightComponent && (
            <View style={compact && styles.rightComponentCompact}>
              {rightComponent}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Main container - total height: ~120-130px (increased from 80-90px)
  headerContainer: {
    backgroundColor: "#1e40af",
    paddingTop: 20,
    paddingBottom: 18, // ⬅️ more vertical space
    paddingHorizontal: 20,
    minHeight: Platform.select({
      ios: 140, // ⬅️ BIG difference
      android: 120,
    }),
    justifyContent: "flex-end", // ⬅️ pushes content down
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },

  // Content layout
  headerContent: {
    flexDirection: "row",
    alignItems: "flex-end", // ⬅️ bottom-aligned like the screenshot
    justifyContent: "space-between",
  },

  // Left side
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minHeight: Platform.select({
      ios: 56, // Increased from 44
      android: 64, // Increased from 56
    }),
  },

  backButton: {
    marginRight: 16, // Increased from 8
    width: 48, // Increased from 40
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },

  titleSection: {
    flex: 1,
    justifyContent: "center",
    minHeight: Platform.select({
      ios: 56,
      android: 64,
    }),
  },

  // Title styles - larger sizing
  headerTitle: {
    fontSize: Platform.select({
      ios: 28, // Increased from 17
      android: 26, // Increased from 18
      default: 22,
    }),
    fontWeight: Platform.select({
      ios: "700", // Increased from 600
      android: "800", // Increased from 700
      default: "700",
    }),
    color: "#fff",
    lineHeight: 36, // Increased from 22
    letterSpacing: Platform.select({
      ios: -0.41,
      android: 0,
      default: 0,
    }),
  },

  headerTitleCompact: {
    fontSize: Platform.select({
      ios: 20, // Increased from 16
      android: 22, // Increased from 17
      default: 20,
    }),
    lineHeight: 26, // Increased from 20
  },

  // Subtitle styles - larger
  headerSubtitle: {
    fontSize: Platform.select({
      ios: 16, // Increased from 12
      android: 17, // Increased from 13
      default: 16,
    }),
    color: "#dbeafe",
    opacity: 0.9,
    marginTop: 6, // Increased from 2
    lineHeight: 20, // Increased from 16
    letterSpacing: Platform.select({
      ios: -0.24,
      android: 0,
      default: 0,
    }),
  },

  headerSubtitleCompact: {
    fontSize: 14, // Increased from 11
    lineHeight: 18, // Increased from 14
    marginTop: 4, // Increased from 1
  },

  // Right side
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    minHeight: Platform.select({
      ios: 56,
      android: 64,
    }),
  },

  // Logo - larger
  logoImage: {
    width: 48, // Increased from 36
    height: 48,
    borderRadius: 8, // Increased from 6
  },

  logoImageCompact: {
    width: 42, // Increased from 32
    height: 42,
  },

  rightComponentCompact: {
    transform: [{ scale: 0.95 }],
  },
});

// Export additional presets for common use cases
export const HeaderPresets = {
  // Standard header with subtitle (larger)
  standard: {
    compact: false,
  },
  // Compact header for content-heavy screens
  compact: {
    compact: true,
  },
  // Modal header (taller for modal presentations)
  modal: {
    compact: false,
  },
  // Tab header (for tab screens)
  tab: {
    compact: true,
    showLogo: true,
  },
  // Extra large header for important pages
  large: {
    compact: false,
  },
};

// Helper function to use presets
export const createHeaderProps = (preset = "standard", overrides = {}) => {
  const baseProps = HeaderPresets[preset] || HeaderPresets.standard;
  return { ...baseProps, ...overrides };
};

export default CustomHeader;

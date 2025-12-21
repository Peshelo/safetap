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
        { paddingTop: insets.top + (compact ? 4 : 8) },
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
                size={compact ? 22 : 24}
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
  // Main container - total height: ~80-90px
  headerContainer: {
    backgroundColor: "#1e40af",
    paddingBottom: 12, // Reduced from 16
    paddingHorizontal: 16,
    // Total height calculation:
    // iOS: insets.top (44) + 8 + contentHeight (44) + 12 = ~104px
    // With compact: insets.top (44) + 4 + contentHeight (36) + 8 = ~92px
    // Android: varies, but similar proportions
    minHeight: Platform.select({
      ios: 44, // Content height
      android: 56,
    }),
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, // Reduced shadow
    shadowOpacity: 0.08, // Lighter shadow
    shadowRadius: 2,
    elevation: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },

  // Content layout
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },

  // Left side
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minHeight: Platform.select({
      ios: 44,
      android: 56,
    }),
  },

  backButton: {
    marginRight: 8, // Reduced from 12
    width: 40, // Standard touch target
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  titleSection: {
    flex: 1,
    justifyContent: "center",
    minHeight: Platform.select({
      ios: 44,
      android: 56,
    }),
  },

  // Title styles - modern sizing
  headerTitle: {
    fontSize: Platform.select({
      ios: 17, // iOS standard
      android: 18, // Slightly larger for Android
      default: 17,
    }),
    fontWeight: Platform.select({
      ios: "600", // Semibold on iOS
      android: "700", // Bold on Android
      default: "600",
    }),
    color: "#fff",
    lineHeight: 22,
    letterSpacing: Platform.select({
      ios: -0.41, // iOS standard tracking
      android: 0,
      default: 0,
    }),
  },

  headerTitleCompact: {
    fontSize: Platform.select({
      ios: 16,
      android: 17,
      default: 16,
    }),
    lineHeight: 20,
  },

  // Subtitle styles
  headerSubtitle: {
    fontSize: Platform.select({
      ios: 12,
      android: 13,
      default: 12,
    }),
    color: "#dbeafe",
    opacity: 0.85,
    marginTop: 2,
    lineHeight: 16,
    letterSpacing: Platform.select({
      ios: -0.24,
      android: 0,
      default: 0,
    }),
  },

  headerSubtitleCompact: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 1,
  },

  // Right side
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    minHeight: Platform.select({
      ios: 44,
      android: 56,
    }),
  },

  // Logo
  logoImage: {
    width: 36, // Reduced from 40
    height: 36,
    borderRadius: 6, // Slightly smaller radius
  },

  logoImageCompact: {
    width: 32,
    height: 32,
  },

  rightComponentCompact: {
    transform: [{ scale: 0.9 }],
  },
});

// Export additional presets for common use cases
export const HeaderPresets = {
  // Standard header with subtitle
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
};

// Helper function to use presets
export const createHeaderProps = (preset = "standard", overrides = {}) => {
  const baseProps = HeaderPresets[preset] || HeaderPresets.standard;
  return { ...baseProps, ...overrides };
};

export default CustomHeader;

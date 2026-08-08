import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, ImageBackground, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, typography } from "../constants/theme";
import { useAppTheme } from "../context/ThemeContext";

const ZRP_LOGO = require("../../assets/images/logo-alternate.png");
const PATTERN_BG = require("../../assets/images/fallback.png");

export default function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBackPress,
  rightActions = [],
  showLogo = true,
  style,
}) {
  const router = useRouter();
  const { colors: themeColors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 6, Platform.OS === "ios" ? 24 : 18);

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <ImageBackground
      source={PATTERN_BG}
      style={[styles.container, { paddingTop: topPadding, backgroundColor: themeColors.header, borderBottomColor: themeColors.border }, style]}
      imageStyle={{ opacity: 0.08 }}
    >
      <StatusBar barStyle="light-content" backgroundColor={themeColors.header} translucent={true} />
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : showLogo ? (
          <Image source={ZRP_LOGO} style={styles.logoImage} />
        ) : (
          <View style={styles.brandIconContainer}>
            <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
          </View>
        )}
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.titleText} numberOfLines={1}>
          {title || "ZRP SafeTap"}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitleText} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightContainer}>
        {rightActions.slice(0, 2).map((action, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.actionButton}
            onPress={action.onPress}
            activeOpacity={0.7}
            accessibilityLabel={action.label || "Header action"}
            accessibilityRole="button"
          >
            {action.icon || (
              <Ionicons
                name={action.iconName || "ellipsis-vertical"}
                size={22}
                color="#FFFFFF"
              />
            )}
          </TouchableOpacity>
        ))}

        {showBack && showLogo && rightActions.length === 0 && (
          <Image source={ZRP_LOGO} style={styles.logoImageSmall} />
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  leftContainer: {
    minWidth: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  logoImage: {
    width: 38,
    height: 38,
    borderRadius: 7,
  },
  logoImageSmall: {
    width: 32,
    height: 32,
    borderRadius: 7,
    marginLeft: 6,
  },
  brandIconContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.micro,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#DBEAFE",
    textAlign: "center",
    marginTop: 2,
  },
  rightContainer: {
    minWidth: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
});

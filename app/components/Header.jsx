import React from "react";
import { Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CustomHeader = ({
  title,
  subtitle,
  showBackButton = false,
  onBack,
  showLogo = false,
  rightComponent,
  bottomComponent,
  compact = false,
}) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          {showBackButton && (
            <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={10}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          {showLogo && (
            <Image
              source={require("../../assets/images/logo-alternate.png")}
              style={[styles.logoImage, compact && styles.logoImageCompact]}
              resizeMode="contain"
            />
          )}
          <View style={styles.titleSection}>
            <Text numberOfLines={1} style={[styles.headerTitle, compact && styles.headerTitleCompact]}>{title}</Text>
            {subtitle ? <Text numberOfLines={1} style={styles.headerSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        {rightComponent ? <View style={styles.headerRight}>{rightComponent}</View> : null}
      </View>
      {bottomComponent ? <View style={styles.bottomComponent}>{bottomComponent}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#1E3A8A",
    paddingHorizontal: 16,
    paddingBottom: 14,
    minHeight: 96,
    justifyContent: "flex-end",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.16)",
  },
  headerContent: { width: "100%", maxWidth: 900, alignSelf: "center", minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center" },
  backButton: { width: 40, height: 40, marginRight: 8, alignItems: "center", justifyContent: "center" },
  logoImage: { width: 40, height: 40, borderRadius: 8, marginRight: 10 },
  logoImageCompact: { width: 38, height: 38 },
  titleSection: { flex: 1, minWidth: 0, justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontFamily: "GoogleSans_700Bold", fontSize: 20, lineHeight: 25, letterSpacing: -0.25 },
  headerTitleCompact: { fontSize: 19, lineHeight: 24 },
  headerSubtitle: { color: "#DBEAFE", fontFamily: "GoogleSans_400Regular", fontSize: 12, lineHeight: 16, marginTop: 2, opacity: 0.88 },
  headerRight: { minHeight: 44, marginLeft: 10, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  bottomComponent: { width: "100%", maxWidth: 900, alignSelf: "center", marginTop: 10 },
});

export const HeaderPresets = {
  standard: { compact: false }, compact: { compact: true }, modal: { compact: false },
  tab: { compact: true, showLogo: true }, large: { compact: false },
};

export const createHeaderProps = (preset = "standard", overrides = {}) => ({
  ...(HeaderPresets[preset] || HeaderPresets.standard), ...overrides,
});

export default CustomHeader;

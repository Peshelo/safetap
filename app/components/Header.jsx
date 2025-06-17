import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const CustomHeader = ({
  title,
  subtitle,
  showLogo = true,
  showBackButton = false,
  onBack,
  showSyncButton = false,
  onSync,
  syncing = false,
  backgroundColor = "#2563eb",
  statusBarStyle = "light-content",
  statusBarColor = "#2563eb",
  logoSource = require("../../assets/images/logo.jpg"),
}) => {
  return (
    <View style={[styles.headerContainer, { backgroundColor }]}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarColor}
        translucent={false}
      />
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          {showBackButton && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        </View>

        <View style={styles.headerRight}>
          {showSyncButton && (
            <TouchableOpacity
              onPress={onSync}
              disabled={syncing}
              style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
            >
              <MaterialIcons
                name="sync"
                size={20}
                color={syncing ? "#94a3b8" : "#fff"}
              />
            </TouchableOpacity>
          )}
          {showLogo && <Image source={logoSource} style={styles.logoImage} />}
        </View>
      </View>
    </View>
  );
};

// const styles = StyleSheet.create({
//   headerContainer: {
//     paddingTop: 50,
//     paddingBottom: 20,
//     paddingHorizontal: 20,
//   },
//   headerContent: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     // alignItems: "center",
//   },
//   headerLeft: {
//     width: 40,
//     justifyContent: "start",
//   },
//   backButton: {
//     padding: 8,
//     borderRadius: 20,
//     backgroundColor: "rgba(255, 255, 255, 0.1)",
//   },
//   titleSection: {
//     flex: 1,
//     alignItems: "center", // Center the title when back button is present
//   },
//   headerTitle: {
//     fontSize: 28,
//     fontWeight: "bold",
//     color: "#fff",
//     marginBottom: 4,
//     // textAlign: "start",
//   },
//   headerSubtitle: {
//     fontSize: 16,
//     color: "#c7d2fe",
//     opacity: 0.9,
//     // textAlign: "center",
//   },
//   headerRight: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 12,
//     width: 40, // Fixed width to balance the left side
//     justifyContent: "flex-end",
//   },
//   syncButton: {
//     backgroundColor: "rgba(255, 255, 255, 0.2)",
//     padding: 12,
//     borderRadius: 50,
//   },
//   syncButtonDisabled: {
//     backgroundColor: "rgba(255, 255, 255, 0.1)",
//   },
//   logoImage: {
//     width: 40,
//     height: 40,
//     borderRadius: 5,
//   },
// });

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#2563eb",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    width: 40,
    justifyContent: "center",
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  titleSection: {
    flex: 1,
    // Add alignItems: "flex-start" to align text to the start
    alignItems: "flex-start",
    justifyContent: "center", // Keep vertical centering
    paddingLeft: 12, // Add some spacing from back button
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
    // Add textAlign: "left" for explicit left alignment
    textAlign: "left",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#c7d2fe",
    opacity: 0.9,
    // Add textAlign: "left" for explicit left alignment
    textAlign: "left",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: 40, // Fixed width to balance the left side
    justifyContent: "flex-end",
  },
  syncButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 12,
    borderRadius: 50,
  },
  syncButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 5,
  },
});

export default CustomHeader;

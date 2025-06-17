import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";

const OfflineBanner = ({ onRefresh }) => {
  const [isConnected, setIsConnected] = useState(true);
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(-30);

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state) => {
      // setIsConnected(state.isConnected && state.isInternetReachable);
      setIsConnected(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Animation when connection status changes
    if (!isConnected) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -30,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isConnected]);

  if (isConnected) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.text}>Offline Mode - Using cached data</Text>

      {onRefresh && (
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={18} color="#fff" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#f59e0b",
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    flexDirection: "row",
  },
  text: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
    marginRight: 10,
  },
  refreshButton: {
    padding: 4,
  },
});

export default OfflineBanner;

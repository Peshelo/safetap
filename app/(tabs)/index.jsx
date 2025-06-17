import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
  Vibration,
  StyleSheet,
  Image,
  StatusBar,
  FlatList,
  RefreshControl,
  Dimensions,
} from "react-native";
import React, { useState, useEffect, use } from "react";
import { router, Stack } from "expo-router";
import { Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import pb from "../../lib/connection";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const { width, height } = Dimensions.get("window");

const Home = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userPhone, setUserPhone] = useState(null);
  const [newsArticles, setNewsArticles] = useState([]);
  // SOS state
  const [sosCountdown, setSosCountdown] = useState(3);
  const [isSosPressed, setIsSosPressed] = useState(false);
  const [userLocation, setUserLocation] = useState("");
  const [userCoords, setUserCoords] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchUserPhone = async () => {
    const savedInfo = await SecureStore.getItemAsync("userEmergencyInfo");
    const userInfo = JSON.parse(savedInfo);
    console.log("Fetched user info:", userInfo);
    if (userInfo) {
      setUserPhone(userInfo?.emergencyContact);
    }
  };

  const fetchNewsArticles = async () => {
    try {
      setLoading(true);
      const records = await pb.collection("news").getFullList({
        sort: "-created",
      });
      setNewsArticles(records);
    } catch (err) {
      setError("Failed to fetch news articles");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserPhone();
    getLocation();
    fetchNewsArticles();
  }, []);

  const getLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Location permission is required for SOS."
      );
      return;
    }

    try {
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setUserLocation(`${latitude},${longitude}`);
      setUserCoords({ latitude, longitude });
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Unable to get your current location");
    }
  };

  // SOS countdown effect
  useEffect(() => {
    let timer;
    if (isSosPressed && sosCountdown > 0) {
      timer = setTimeout(() => {
        setSosCountdown(sosCountdown - 1);
        Vibration.vibrate(500);
      }, 1000);
    } else if (sosCountdown === 0) {
      triggerSOS();
    }
    return () => clearTimeout(timer);
  }, [isSosPressed, sosCountdown]);

  const triggerSOS = async () => {
    const formData = new FormData();
    formData.append("title", "SOS Alert");
    formData.append("description", "Emergency SOS alert triggered.");
    formData.append("latitude", userLocation.split(",")[0]);
    formData.append("longitude", userLocation.split(",")[1]);
    formData.append("merchant", "oi2mnpx4rc6i655");
    formData.append("status", "Open");
    formData.append("priority", "red");

    try {

        const savedInfo = await SecureStore.getItemAsync("userEmergencyInfo");
    const userInfo = JSON.parse(savedInfo);
    console.log("Fetched user info:", userInfo);
      if (userInfo && userInfo?.emergencyContact) {
        formData.append("phoneNumber", userInfo?.emergencyContact);
      } else {
        Alert.alert(
          "Setup Contact to use SOS",
          "No emergency contact found. Please set it up in your profile.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Set up now",
              onPress: () => router.push("./about"),
              isPreferred: true,
            },
          ],
          { cancelable: true }
        );
        return;
      }

      if (!userLocation) {
        Alert.alert(
          "Error",
          "Unable to fetch your location. Please try again."
        );
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required for SOS."
        );
        return;
      }

      await pb.collection("cases").create(formData);
      Alert.alert(
        "SOS Sent!",
        `Emergency services have been alerted. Your location: ${userLocation}`
      );
    } catch (error) {
      Alert.alert("Error", "Unable to send SOS alert." + error);
    }

    setIsSosPressed(false);
    setSosCountdown(3);
  };

  const makeEmergencyCall = (number) => {
    const url = `tel:${number}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Could not make the call")
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNewsArticles();
    getLocation();
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetchNewsArticles();
      await getLocation();
    } catch (error) {
      Alert.alert("Error", "Failed to sync data. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const emergencyActions = [
    {
      title: "Police Hotline",
      subtitle: "Toll free",
      number: "08005462",
      icon: "shield-alt",
      color: "#2563eb",
      bgColor: "#eff6ff",
      path: null,
    },
    {
      title: "Emergency",
      subtitle: "Call Center",
      number: "911",
      icon: "phone",
      color: "#dc2626",
      bgColor: "#fef2f2",
      path: null,
    },
    {
      title: "Child Helpline",
      subtitle: "Toll free",
      number: "+263242255583",
      icon: "child",
      color: "#ea580c",
      bgColor: "#fff7ed",
      path: null,
    },
    {
      title: "Find Police Station",
      subtitle: "Get a list of police stations",
      number: null,
      icon: "arrow-right",
      color: "#059669",
      bgColor: "#ecfdf5",
      path: "(tabs)/contacts",
    },
  ];

  const additionalServices = [
    {
      title: "Press Releases",
      subtitle: "Official announcements and updates from ZRP",
      icon: "newspaper",
      color: "#7c3aed",
      bgColor: "#f3e8ff",
      path: "/press-release",
    },
    {
      title: "Traffic Violations",
      subtitle: "Check and pay traffic fines for your vehicle",
      icon: "car",
      color: "#dc2626",
      bgColor: "#fef2f2",
      path: "/traffic-violations",
    },
    {
      title: "Police Stations Map",
      subtitle: "Find nearby police stations",
      icon: "map",
      color: "#059669",
      bgColor: "#ecfdf5",
      path: "/maps",
    },
    {
      title: "Emergency Contacts",
      subtitle: "Important contact numbers",
      icon: "phone-alt",
      color: "#ea580c",
      bgColor: "#fff7ed",
      path: "(tabs)/contacts",
    },
  ];

  const renderNewsItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => router.push(`/news/${item.id}`)}
      className="mb-4"
    >
      <View className="bg-white rounded-xl overflow-hidden shadow-sm">
        {item.image && (
          <Image
            source={{ uri: pb.getFileUrl(item, item.image) }}
            className="w-full h-40"
            resizeMode="cover"
          />
        )}
        <View className="p-4">
          <Text className="text-lg font-semibold text-gray-900 mb-1">
            {item.title}
          </Text>
          <Text className="text-gray-500 text-sm mb-2">
            {item.description?.replace(/<[^>]*>/g, "").substring(0, 60)}...
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={14} color="#9ca3af" />
            <Text className="text-gray-400 text-xs ml-1">
              {new Date(item.created).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={customStyles.headerContainer}>
      <View style={customStyles.headerContent}>
        <View style={customStyles.titleSection}>
          <Text style={customStyles.headerTitle}>Services</Text>
          <Text style={customStyles.headerSubtitle}>
            Emergency services and resources
          </Text>
        </View>
        <View style={customStyles.headerRight}>
          {/* <TouchableOpacity
            onPress={handleSync}
            disabled={syncing}
            style={[
              customStyles.syncButton,
              syncing && customStyles.syncButtonDisabled,
            ]}
          >
            <MaterialIcons
              name="sync"
              size={20}
              color={syncing ? "#94a3b8" : "#fff"}
            />
          </TouchableOpacity> */}
          <Image
            source={require("../../assets/images/logo.jpg")}
            style={customStyles.logoImage}
          />
        </View>
      </View>
    </View>
  );

  return (
    <GestureHandlerRootView className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {renderHeader()}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 52 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#2563eb"]}
            tintColor="#2563eb"
          />
        }
      >
        <View className="px-5 pt-6">
          {/* Emergency Quick Access */}
          <View className="mb-8">
            <View
              className="flex-row flex-wrap justify-between h-fit"
              style={{ gap: 12 }}
            >
              {emergencyActions.map((action, index) => (
                <View key={index} className="w-[48%] h-fit">
                  {action.number ? (
                    <TouchableOpacity
                      onPress={() => makeEmergencyCall(action.number)}
                    >
                      <View
                        className="rounded-xl p-4 h-fit"
                        style={{ backgroundColor: action.color }}
                      >
                        <View className="flex-row items-center mb-3">
                          <View
                            className="w-10 h-10 rounded-lg items-center justify-center mr-3"
                            style={{ backgroundColor: action.bgColor + "50" }}
                          >
                            <FontAwesome5
                              name={action.icon}
                              size={18}
                              color={action.bgColor}
                            />
                          </View>
                          <View>
                            <Text className="text-base font-semibold text-white">
                              {action.title}
                            </Text>
                            <Text className="text-xs text-gray-50">
                              {action.subtitle}
                            </Text>
                          </View>
                        </View>
                        <Text
                          className="text-sm font-light"
                          style={{ color: action.bgColor }}
                        >
                          Call now
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => router.push(action.path)}>
                      <View
                        className="rounded-xl p-4 h-fit"
                        style={{ backgroundColor: action.color }}
                      >
                        <View className="flex-row justify-between items-center mb-3">
                          <View className="w-full">
                            <Text className="text-base font-semibold text-white">
                              {action.title}
                            </Text>
                            <Text className="text-xs text-gray-50">
                              {action.subtitle}
                            </Text>
                          </View>
                        </View>
                        <Text
                          className="text-sn font-bold"
                          style={{ color: action.bgColor }}
                        >
                          Police Stations
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* SOS Button Section */}
          <View className="mb-8">
            <Text className="text-2xl font-bold mb-5 text-gray-900">
              Emergency SOS
            </Text>
            <View className="items-center">
              <TouchableOpacity
                style={[
                  styles.sosButton,
                  isSosPressed && styles.sosButtonActive,
                ]}
                className="w-full"
                onPressIn={() => {
                  setIsSosPressed(true);
                  setSosCountdown(3);
                }}
                onPressOut={() => {
                  if (sosCountdown > 0) {
                    setIsSosPressed(false);
                    setSosCountdown(3);
                  }
                }}
                activeOpacity={1}
              >
                <Text style={styles.sosText}>SOS</Text>
                <Text style={styles.sosSubtext}>
                  {isSosPressed
                    ? `Keep holding for ${sosCountdown}s...`
                    : "Hold to activate"}
                </Text>
              </TouchableOpacity>
              {userLocation ? (
                <View className="text-gray-300 text-sm flex flex-row items-center justify-center space-x-3 mt-3 text-center">
                  <Ionicons name="location" size={15} color={"#808080"} />
                  <Text className="text-gray-500 ml-2">
                    Your location will be shared
                  </Text>
                </View>
              ) : (
                <Text className="text-gray-500 text-sm mt-3 text-center">
                  Fetching your location...
                </Text>
              )}
            </View>
          </View>

          {/* Additional Services Section */}
          <View className="mb-8">
            <Text className="text-2xl font-bold mb-5 text-gray-900">
              Services
            </Text>
            <View
              className="flex-row flex-wrap justify-between"
              style={{ gap: 12 }}
            >
              {additionalServices.map((service, index) => (
                <View key={index} className="w-[48%]">
                  <TouchableOpacity onPress={() => router.push(service.path)}>
                    <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <View
                        className="w-12 h-12 rounded-lg items-center justify-center mb-3"
                        style={{ backgroundColor: service.bgColor }}
                      >
                        <FontAwesome5
                          name={service.icon}
                          size={20}
                          color={service.color}
                        />
                      </View>
                      <Text className="text-base font-semibold text-gray-900 mb-1">
                        {service.title}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {service.subtitle}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  sosButton: {
    height: 180,
    borderRadius: 16,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  sosButtonActive: {
    backgroundColor: "#b91c1c",
    transform: [{ scale: 1.05 }],
  },
  sosText: {
    color: "white",
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 8,
  },
  sosSubtext: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
});

const customStyles = StyleSheet.create({
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
  titleSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#c7d2fe",
    opacity: 0.9,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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

export default Home;

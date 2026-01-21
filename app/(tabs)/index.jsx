import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
  StyleSheet,
  Image,
  StatusBar,
  RefreshControl,
  Dimensions,
  Platform,
} from "react-native";
import React, { useState, useEffect } from "react";
import { router, Stack } from "expo-router";
import { Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import pb from "../../lib/connection";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import CustomHeader from "../components/Header";
import NewsCard from "../components/NewsCard";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const Home = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userPhone, setUserPhone] = useState(null);
  const [newsArticles, setNewsArticles] = useState([]);
  const [userLocation, setUserLocation] = useState("");
  const [userCoords, setUserCoords] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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
      return;
    }

    try {
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setUserLocation(`${latitude},${longitude}`);
      setUserCoords({ latitude, longitude });
    } catch (error) {
      console.error("Error getting location:", error);
    }
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

  const getHumanFriendlyDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 1) {
      return "Just now";
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      if (date.getDate() === now.getDate()) {
        return "Today";
      } else {
        return "Yesterday";
      }
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  };

  const emergencyContacts = [
    {
      title: "Police Hotline",
      subtitle: "Toll free emergency line",
      number: "08005462",
      icon: "shield-alt",
    },
    {
      title: "Emergency",
      subtitle: "National call center",
      number: "911",
      icon: "phone",
    },
    {
      title: "Child Helpline",
      subtitle: "Child protection services",
      number: "+263242255583",
      icon: "child",
    },
  ];

  const services = [
    {
      title: "Press Releases",
      subtitle: "Official announcements and updates",
      icon: "newspaper",
      path: "/press-release",
    },
    {
      title: "Police Stations",
      subtitle: "Find nearby police stations",
      icon: "map-marker-alt",
      path: "/maps",
    },
  ];

  const renderNewsItem = ({ item }) => (
    <NewsCard
      item={item}
      onPress={(item) => router.push(`/press-release/${item.id}`)}
      showDescription={true}
      showTag={false}
      compact={false}
      showPreviewButton={true}
      cardStyle={{ marginBottom: 12 }}
    />
  );

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#1e40af" />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <CustomHeader
        title="ZRP SafeTap"
        subtitle="Zimbabwe Republic Police"
        showBackButton={false}
        showLogo={true}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#1e40af"]}
            tintColor="#1e40af"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Emergency Contacts Section */}
        <View className="px-5 pt-6">
          <View className="mb-8">
            <Text className="text-xl font-bold mb-4 text-gray-900">
              Emergency Contacts
            </Text>
            <View className="bg-white rounded-xl shadow-sm border border-gray-100">
              {emergencyContacts.map((contact, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => makeEmergencyCall(contact.number)}
                  className={`flex-row items-center px-4 py-3 ${
                    index < emergencyContacts.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                    <FontAwesome5
                      name={contact.icon}
                      size={16}
                      color="#1e40af"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      {contact.title}
                    </Text>
                    <Text className="text-sm text-gray-600">
                      {contact.subtitle}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-lg font-bold text-blue-600">
                      {contact.number}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-1">
                      Tap to call
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Services Section */}
          <View className="mb-8">
            <Text className="text-xl font-bold mb-4 text-gray-900">
              Services
            </Text>
            <View style={customStyles.servicesContainer}>
              {services.map((service, index) => (
                <View key={index} style={customStyles.serviceCardWrapper}>
                  <TouchableOpacity
                    onPress={() => router.push(service.path)}
                    style={customStyles.serviceCard}
                  >
                    <View className="w-12 h-12 rounded-lg bg-blue-50 items-center justify-center mb-3">
                      <FontAwesome5
                        name={service.icon}
                        size={20}
                        color="#1e40af"
                      />
                    </View>
                    <Text
                      className="text-base font-semibold text-gray-900 mb-1"
                      numberOfLines={2}
                      style={customStyles.serviceTitle}
                    >
                      {service.title}
                    </Text>
                    <Text
                      className="text-xs text-gray-600 leading-4"
                      numberOfLines={2}
                      style={customStyles.serviceSubtitle}
                    >
                      {service.subtitle}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* News Section */}
          {newsArticles.length > 0 && (
            <View className="mb-8">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-900">
                  Latest News
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/press-release")}
                  className="flex-row items-center"
                >
                  <Text className="text-blue-600 font-semibold text-sm mr-1">
                    View All
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#2563eb" />
                </TouchableOpacity>
              </View>
              {newsArticles.slice(0, 3).map((item) => (
                <NewsCard
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/press-release/${item.id}`)}
                  showDescription
                  showPreviewButton
                  cardStyle={{ marginBottom: 12 }}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const customStyles = StyleSheet.create({
  // New responsive service card styles
  servicesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  serviceCardWrapper: {
    width: "48%",
  },
  serviceCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    minHeight: 140, // Ensures uniform height
    justifyContent: "flex-start",
  },
  serviceTitle: {
    flexWrap: "wrap",
    flexShrink: 1,
  },
  serviceSubtitle: {
    flexWrap: "wrap",
    flexShrink: 1,
  },
});

export default Home;

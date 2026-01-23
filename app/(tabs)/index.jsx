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
  ImageBackground,
} from "react-native";
import React, { useState, useEffect } from "react";
import { router, Stack } from "expo-router";
import { Ionicons, FontAwesome5, MaterialIcons, FontAwesome } from "@expo/vector-icons";
import pb from "../../lib/connection";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import CustomHeader from "../components/Header";
import NewsCard from "../components/NewsCard";
import { SafeAreaView } from "react-native-safe-area-context";
import NewsSummaryCard from "../components/NewsSummaryCard";

const { width, height } = Dimensions.get("window");

const Home = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userPhone, setUserPhone] = useState(null);
  const [newsArticles, setNewsArticles] = useState([]);
  const [userLocation, setUserLocation] = useState("");
  const [userCoords, setUserCoords] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Campaigns data with images
  const campaigns = [
    {
      id: 1,
      title: "Community Safety",
      description: "Join us in making our communities safer",
      color: "#1E40AF",
      image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=200&fit=crop",
    },
    {
      id: 2,
      title: "Report Activity",
      description: "See something? Say something!",
      color: "#DC2626",
      image: "https://images.unsplash.com/photo-1589652717521-10c0d092dea9?w=400&h=200&fit=crop",
    },
    {
      id: 3,
      title: "Road Safety",
      description: "Drive safe, arrive safe",
      color: "#059669",
      image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=200&fit=crop",
    },
    {
      id: 4,
      title: "Crime Prevention",
      description: "Stay alert, prevent crime",
      color: "#8B5CF6",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=200&fit=crop",
    },
  ];

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

  // Emergency Contacts with solid colors
  const emergencyContacts = [
    {
      title: "Police Emergency",
      subtitle: "24/7 Hotline",
      number: "08005462",
      icon: "shield-alt",
      color: "#DC2626",
      bgColor: "#DC2626",
    },
    // {
    //   title: "911 Emergency",
    //   subtitle: "All Emergencies",
    //   number: "911",
    //   icon: "phone-alt",
    //   color: "#1E40AF",
    //   bgColor: "#1E40AF",
    // },
    {
      title: "Child Protection Unit",
      subtitle: "Toll Free Helpline",
      number: "+263242255583",
      icon: "child",
      color: "#059669",
      bgColor: "#059669",
    },
    // {
    //   title: "Nearby Police Station",
    //   subtitle: "Locate Nearby Police Stations",
    //   number: userPhone || "Add Contact",
    //   icon: "map",
    //   icon2: "map-marker-alt",
    //   color: "#7C3AED",
    //   bgColor: "#7C3AED",
    // },
  ];
    const emergencyContactsFull = [
    // {
    //   title: "Police Emergency",
    //   subtitle: "24/7 Hotline",
    //   number: "08005462",
    //   icon: "shield-alt",
    //   color: "#DC2626",
    //   bgColor: "#DC2626",
    // },
    // {
    //   title: "911 Emergency",
    //   subtitle: "All Emergencies",
    //   number: "911",
    //   icon: "phone-alt",
    //   color: "#1E40AF",
    //   bgColor: "#1E40AF",
    // },
    // {
    //   title: "Child Protection",
    //   subtitle: "Helpline",
    //   number: "+263242255583",
    //   icon: "child",
    //   color: "#059669",
    //   bgColor: "#059669",
    // },
    {
      title: "Nearby Police Station",
      subtitle: "Find Police Stations near you",
      number: userPhone || "Add Contact",
      path: "(tabs)/contacts",
      icon: "map",
      icon2: "map-marker-alt",
      color: "#7C3AED",
      bgColor: "#7C3AED",
    },
  ];

  const services = [
    {
      title: "Press Releases",
      subtitle: "Official announcements",
      icon: "newspaper",
      path: "/press-release",
      color: "#1E40AF",
      bgColor: "#DBEAFE",
    },
    {
      title: "Police Stations",
      subtitle: "Find nearby stations",
      icon: "map-marker-alt",
      path: "/maps",
      color: "#DC2626",
      bgColor: "#FEE2E2",
    },
    {
      title: "Emergency SOS",
      subtitle: "Quick emergency alert",
      icon: "bell",
      path: "/emergency",
      color: "#059669",
      bgColor: "#D1FAE5",
    },
    {
      title: "Report Crime",
      subtitle: "File online report",
      icon: "exclamation-triangle",
      path: "/report",
      color: "#D97706",
      bgColor: "#FEF3C7",
    },
  ];

  return (
    <View className="flex-1 bg-gray-100">
      <StatusBar barStyle="light-content" backgroundColor="#1e40af" />
      <Stack.Screen
        options={{
          headerShown: false
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
        contentContainerStyle={{ paddingBottom: 30 }}
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
        {/* Campaigns Banner */}
        <View style={styles.campaignsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}>
                <FontAwesome5 name="bullhorn" size={16} color="#1E40AF" />
              </View>
              <View className="flex flex-col">
                <Text style={styles.sectionTitle}>Safety Campaigns</Text>
                <Text style={styles.sectionSubtitle}>Stay informed, stay safe</Text>
              </View>
            </View>
          </View>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.campaignsScroll}
            contentContainerStyle={styles.campaignsContainer}
          >
            {campaigns.map((campaign) => (
              <TouchableOpacity
                key={campaign.id}
                style={styles.campaignCard}
                onPress={() => router.push(`/campaigns/${campaign.id}`)}
                activeOpacity={0.9}
              >
                <ImageBackground
                  source={{ uri: campaign.image }}
                  style={styles.campaignImage}
                  imageStyle={styles.campaignImageStyle}
                >
                  <View style={styles.campaignOverlay}>
                    <View style={styles.campaignContent}>
                      <View style={styles.campaignIconContainer}>
                        <FontAwesome5 name="bullhorn" size={18} color="#FFFFFF" />
                      </View>
                      <Text style={styles.campaignCardTitle}>{campaign.title}</Text>
                      <Text style={styles.campaignCardDescription}>{campaign.description}</Text>
                      <View style={styles.campaignArrow}>
                        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                      </View>
                    </View>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Section 1: Emergency Contacts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={[styles.sectionIcon, { backgroundColor: '#FEE2E2' }]}>
                <FontAwesome5 name="phone-alt" size={16} color="#DC2626" />
              </View>
              <View className="flex flex-col">
                <Text style={styles.sectionTitle}>Emergency Contacts</Text>
                <Text style={styles.sectionSubtitle}>Tap to call</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.emergencyGrid}>
            {emergencyContacts.map((contact, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => contact.number !== "Add Contact" ? makeEmergencyCall(contact.number) : router.push("/profile")}
                style={[
                  styles.emergencyCard,
                  { backgroundColor: contact.bgColor }
                ]}
              >
                <View style={styles.emergencyCardContent}>
                  <View style={styles.emergencyIconContainer}>
                    <FontAwesome5
                      name={contact.icon}
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.emergencyTextContainer}>
                    <Text style={styles.emergencyTitle} numberOfLines={1}>
                      {contact.title}
                    </Text>
                    <Text style={styles.emergencySubtitle} numberOfLines={1}>
                      {contact.subtitle}
                    </Text>
                  </View>
                  <View style={styles.callIndicator}>
                  
                    <FontAwesome5
                      name={contact?.icon2 ? contact?.icon2: "phone-alt"}
                      size={12}
                      color={contact.color}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
             {emergencyContactsFull.map((contact, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => router.push("/maps")}
                style={[
                  styles.emergencyCardFull,
                  { backgroundColor: contact.bgColor }
                ]}
              >
                <View style={styles.emergencyCardContent}>
                  <View style={styles.emergencyIconContainer}>
                    <FontAwesome5
                      name={contact.icon}
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.emergencyTextContainer}>
                    <Text style={styles.emergencyTitle} numberOfLines={1}>
                      {contact.title}
                    </Text>
                    <Text style={styles.emergencySubtitle} numberOfLines={1}>
                      {contact.subtitle}
                    </Text>
                  </View>
                  {/* <View style={styles.callIndicator}>
                  
                    <FontAwesome5
                      name={contact?.icon2 ? contact?.icon2: "phone-alt"}
                      size={12}
                      color={contact.color}
                    />
                  </View> */}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section 2: Find Police Stations Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={[styles.sectionIcon, { backgroundColor: '#DBEAFE' }]}>
                <FontAwesome5 name="search" size={16} color="#1E40AF" />
              </View>
              <View className="flex flex-col">
                <Text style={styles.sectionTitle}>Search Police Stations</Text>
                <Text style={styles.sectionSubtitle}>Find Police stations across Zimbabwe</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity
            onPress={() => router.push("(tabs)/contacts")}
            style={styles.findStationsCard}
          >
            <View style={styles.findStationsContent}>
              <View style={styles.findStationsIconContainer}>
                <FontAwesome5 name="search" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.findStationsTextContainer}>
                <Text style={styles.findStationsTitle}>
                  Find Police Stations
                </Text>
                <Text style={styles.findStationsSubtitle}>
                  Get police stations contact information and directions 
                </Text>
              </View>
              <View style={styles.findStationsArrow}>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 3: Quick Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={[styles.sectionIcon, { backgroundColor: '#D1FAE5' }]}>
                <FontAwesome5 name="tasks" size={16} color="#059669" />
              </View>
              <View className="flex flex-col">
                <Text style={styles.sectionTitle}>Quick Services</Text>
                <Text style={styles.sectionSubtitle}>Access essential tools</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.servicesGrid}>
            {services.map((service, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => router.push(service.path)}
                style={[
                  styles.serviceCard,
                  { backgroundColor: service.bgColor }
                ]}
              >
                <View style={[styles.serviceIcon, { backgroundColor: `${service.color}20` }]}>
                  <FontAwesome5
                    name={service.icon}
                    size={22}
                    color={service.color}
                  />
                </View>
                <Text style={styles.serviceTitle} numberOfLines={2}>
                  {service.title}
                </Text>
                <Text style={styles.serviceSubtitle} numberOfLines={2}>
                  {service.subtitle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section 4: Latest News */}
        {newsArticles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={[styles.sectionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <FontAwesome5 name="newspaper" size={16} color="#D97706" />
                </View>
                <View className="flex flex-col">
                  <Text style={styles.sectionTitle}>Latest News & Alerts</Text>
                  <Text style={styles.sectionSubtitle}>Stay updated with police news</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/press-release")}
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#2563eb" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.newsContainer}>
              {newsArticles.slice(0, 3).map((item) => (
                <NewsSummaryCard
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/press-release/${item.id}`)}
                  showDescription
                  showPreviewButton
                  cardStyle={styles.newsCard}
                />
              ))}
            </View>
          </View>
        )}

        {/* Safety Footer */}
        <View style={styles.safetyFooter}>
          <View style={styles.safetyContent}>
            <FontAwesome5 name="shield-alt" size={20} color="#1E40AF" />
            <Text style={styles.safetyText}>
              Your safety is our priority. Always know your nearest police station.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Campaigns Banner
  campaignsSection: {
    marginHorizontal: 5,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "lightgray",
  },
  campaignsScroll: {
    marginHorizontal: -15,
  },
  campaignsContainer: {
    paddingHorizontal: 15,
    paddingRight: 30,
  },
  campaignCard: {
    width: 280,
    height: 160,
    borderRadius: 5,
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  campaignImage: {
    width: '100%',
    height: '100%',
  },
  campaignImageStyle: {
    borderRadius: 5,
  },
  campaignOverlay: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 5,
    padding: 16,
    justifyContent: 'space-between',
  },
  campaignContent: {
    height: '100%',
    justifyContent: 'space-between',
  },
  campaignIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  campaignCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  campaignCardDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
    marginBottom: 10,
  },
  campaignArrow: {
    width: 28,
    height: 28,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },

  // Section Styling
  section: {
    marginHorizontal: 5,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "lightgray",
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Emergency Contacts
  emergencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  emergencyCard: {
    width: '48%',
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
    emergencyCardFull: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emergencyCardContent: {
    padding: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  emergencyIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emergencyTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emergencySubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    fontWeight: '500',
  },
  callIndicator: {
    width: 28,
    height: 28,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },

  // Find Police Stations Card
  findStationsCard: {
    backgroundColor: '#1E40AF',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  findStationsContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  findStationsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  findStationsTextContainer: {
    flex: 1,
  },
  findStationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  findStationsSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  findStationsArrow: {
    marginLeft: 8,
  },

  // Quick Services
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  serviceCard: {
    width: '48%',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    minHeight: 130,
    justifyContent: 'center',
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 18,
  },
  serviceSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },

  // News Section
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 2,
  },
  newsContainer: {
    gap: 10,
  },
  newsCard: {
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  // Safety Footer
  safetyFooter: {
    backgroundColor: '#F3F4F6',
    marginHorizontal: 5,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 5,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  safetyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  safetyText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
});

export default Home;
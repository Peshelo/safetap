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
  RefreshControl,
  Dimensions,
  ImageBackground,
} from "react-native";
import React, { useState, useEffect } from "react";
import { router } from "expo-router";
import { Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import pb from "../../lib/connection";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import SOSBottomSheet from "../components/SOSBottomSheet";
import { StatusBar } from "react-native";

const { width } = Dimensions.get("window");

const Home = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userPhone, setUserPhone] = useState(null);
  const [newsArticles, setNewsArticles] = useState([]);
  const [userLocation, setUserLocation] = useState("");
  const [userCoords, setUserCoords] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showSOSSheet, setShowSOSSheet] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState("");

  const fetchUserPhone = async () => {
    const savedInfo = await SecureStore.getItemAsync("userEmergencyInfo");
    const userInfo = JSON.parse(savedInfo);
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

  // 4 Quick Actions (as requested)
  const quickActions = [
    {
      title: "Make a Report",
      subtitle: "File crime or incident reports",
      icon: "file-alt",
      available: true,
      action: () => router.push("/report/crime"),
    },
        {
      title: "Latest News",
      subtitle: "Get latest news and press releases",
      icon: "newspaper",
      available: true,
      action: () => router.push("/press-release"),
    },
    {
      title: "Traffic Violations",
      subtitle: "Search traffic violations",
      icon: "car",
      available: false,
      action: () => showComingSoonAlert("Traffic Violations"),
    },
    {
      title: "Explore Services",
      subtitle: "Browse all police services",
      icon: "search",
      available: true,
      action: () => router.push("/services"),
    },



  ];

  // Police Services (moved from quick actions)
  const policeServices = [
    {
      title: "Police Report Follow up",
      description: "Track your report status",
      icon: "clipboard-check",
      available: false,
      action: () => showComingSoonAlert("Police Report Follow up"),
    },
        {
      title: "Report Accident",
      description: "Report traffic accidents",
      icon: "car-crash",
      available: false,
      action: () => router.push("/report/accident"),
    },
                {
      title: "Suggestion Box",
      description: "Leave a suggestion anounymously",
      icon: "archive",
      available: true,
      action: () => router.push("/report/complaint"),
    },
            {
      title: "ZRP On Social Media",
      description: "Follow ZRP online",
      icon: "share-alt",
      available: true,
      action: () => router.push("/(tabs)/about"),
    },
    {
      title: "About App",
      description: "Learn about SafeTap",
      icon: "info-circle",
      available: true,
      action: () => router.push("/about"),
    },

  ];

  // Emergency Contacts with solid colors
  const emergencyContacts = [
    {
      title: "Police Emergency",
      subtitle: "24/7 Hotline • 08005462",
      number: "08005462",
      icon: "shield-alt",
      bgColor: "#DC2626",
      textColor: "#FFFFFF",
      iconColor: "#FFFFFF",
    },
    {
      title: "Child Protection",
      subtitle: "Toll Free Helpline",
      number: "+263242255583",
      icon: "child",
      bgColor: "#059669",
      textColor: "#FFFFFF",
      iconColor: "#FFFFFF",
    },
    {
      title: "Traffic Police",
      subtitle: "Road emergencies",
      number: "08005463",
      icon: "car",
      bgColor: "#1D4ED8",
      textColor: "#FFFFFF",
      iconColor: "#FFFFFF",
    },
    {
      title: "Women's Desk",
      subtitle: "Gender-based violence",
      number: "08005464",
      icon: "female",
      bgColor: "#7C3AED",
      textColor: "#FFFFFF",
      iconColor: "#FFFFFF",
    },
  ];

  // Dummy image URLs for backgrounds
  const dummyImages = {
    policeStation: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    mapLocation: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
  };

  // News Skeleton Component
  const NewsSkeleton = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.newsHorizontalScroll}
      contentContainerStyle={styles.newsScrollContent}
    >
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.newsSkeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonDescription} />
            <View style={styles.skeletonMeta} />
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const showComingSoonAlert = (title) => {
    setComingSoonTitle(title);
    setShowComingSoon(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={'light-content'} backgroundColor={'#0d9488'}/>
      
      {/* Custom Header */}
      <View style={styles.customHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/logo-alternate.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.appName}>SafeTap</Text>
            <Text style={styles.appSubtitle}>Zimbabwe Republic Police</Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setShowSOSSheet(true)}
            style={styles.sosButton}
          >
            <Text style={styles.sosText}>SOS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("(tabs)/about")}
            style={styles.profileButton}
          >
            <Ionicons name="person" size={20} color="#1E3A8A" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#FBBF24"]}
            tintColor="#FBBF24"
          />
        }
        showsVerticalScrollIndicator={false}
      >

        {/* Police Station Features - Creative Side-by-Side Layout */}
        <View style={styles.stationFeaturesSection}>
          <View style={styles.stationFeaturesRow}>
            {/* Find Police Stations - Creative Design */}
            <TouchableOpacity
              onPress={() => router.push("(tabs)/contacts")}
              style={styles.findStationsCard}
              activeOpacity={0.9}
            >
              <ImageBackground
                source={require("../../assets/images/fallback.png")}
                style={styles.findStationsBackground}
                imageStyle={styles.findStationsImageStyle}
              >
                <View style={styles.findStationsOverlay}>
                  <View style={styles.findStationsIconCircle}>
                    <FontAwesome5 name="building" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.findStationsTitle}>
                    Police Station Directory
                  </Text>
                  <Text style={styles.findStationsSubtitle}>
                    Browse all stations with detailed contact information
                  </Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>

            {/* Locate Nearby Stations - Creative Design */}
            <TouchableOpacity
              onPress={() => router.push("/maps")}
              style={styles.locateStationsCard}
              activeOpacity={0.9}
            >
              <ImageBackground
                 source={require("../../assets/images/fallback.png")}
                style={styles.locateStationsBackground}
                imageStyle={styles.locateStationsImageStyle}
              >
                <View style={styles.locateStationsOverlay}>
                  <View style={styles.locateStationsIconCircle}>
                    <FontAwesome5 name="map-marked-alt" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.locateStationsTitle}>
                    Live Station Locator
                  </Text>
                  <Text style={styles.locateStationsSubtitle}>
                    Find nearest stations with directions & distance
                  </Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </View>
        </View>

        {/* Emergency Contacts - Solid Colors */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIcon}>
                <FontAwesome5 name="phone-alt" size={16} color="#DC2626" />
              </View>
              <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/emergency-contacts")}>
              <Text style={styles.viewAllText}>All Contacts</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.emergencyGrid}>
            {emergencyContacts.map((contact, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => makeEmergencyCall(contact.number)}
                style={[
                  styles.emergencyCard,
                  { backgroundColor: contact.bgColor }
                ]}
                activeOpacity={0.9}
              >
                <View style={styles.emergencyCardContent}>
                  <View style={styles.emergencyIconContainer}>
                    <FontAwesome5
                      name={contact.icon}
                      size={18}
                      color={contact.iconColor}
                    />
                  </View>
                  <View style={styles.emergencyTextContainer}>
                    <Text style={[styles.emergencyTitle, { color: contact.textColor }]} numberOfLines={1}>
                      {contact.title}
                    </Text>
                    <Text style={[styles.emergencySubtitle, { color: contact.textColor }]} numberOfLines={1}>
                      {contact.subtitle}
                    </Text>
                  </View>
                  <View style={styles.callButton}>
                    <FontAwesome5
                      name="phone-alt"
                      size={12}
                      color={contact.bgColor}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions Grid - 4 items as requested */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions:</Text>
          <View style={styles.servicesGrid}>
            {quickActions.map((service, index) => (
              <TouchableOpacity
                key={index}
                onPress={service.action}
                style={[styles.serviceCard, !service.available && styles.serviceCardDisabled]}
                activeOpacity={0.9}
                disabled={!service.available}
              >
                <View style={[styles.serviceIcon, { backgroundColor: service.available ? '#E0F2FE' : '#F3F4F6' }]}>
                  <FontAwesome5
                    name={service.icon}
                    size={18}
                    color={service.available ? "#1E3A8A" : "#9CA3AF"}
                  />
                </View>
                <Text style={[styles.serviceTitle, !service.available && styles.serviceTitleDisabled]} numberOfLines={2}>
                  {service.title}
                </Text>
                <Text style={[styles.serviceSubtitle, !service.available && styles.serviceSubtitleDisabled]} numberOfLines={2}>
                  {service.subtitle}
                </Text>
                {!service.available && (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Soon</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Police Services Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIcon}>
                <FontAwesome5 name="tasks" size={16} color="#1E3A8A" />
              </View>
              <Text style={styles.sectionTitle}>Police Services</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/services")}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.quickServicesContainer}>
            {policeServices.map((service, index) => (
              <TouchableOpacity
                key={index}
                onPress={service.action}
                style={[styles.quickServiceCard, !service.available && styles.quickServiceCardDisabled]}
                activeOpacity={0.9}
                disabled={!service.available}
              >
                <View style={styles.quickServiceContent}>
                  <View style={[styles.quickServiceIconContainer, !service.available && styles.quickServiceIconContainerDisabled]}>
                    <FontAwesome5
                      name={service.icon}
                      size={16}
                      color={service.available ? "#1E3A8A" : "#9CA3AF"}
                    />
                  </View>
                  <View style={styles.quickServiceTextContainer}>
                    <Text style={[styles.quickServiceTitle, !service.available && styles.quickServiceTitleDisabled]} numberOfLines={1}>
                      {service.title}
                    </Text>
                    <Text style={[styles.quickServiceDescription, !service.available && styles.quickServiceDescriptionDisabled]} numberOfLines={2}>
                      {service.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={service.available ? "#94A3B8" : "#D1D5DB"} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* News Section */}
        <View style={styles.sectionNews}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIcon}>
                <FontAwesome5 name="newspaper" size={16} color="#F59E0B" />
              </View>
              <Text style={styles.sectionTitle}>News & Press Release</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/press-release")}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {/* Loading State */}
          {loading ? (
            <NewsSkeleton />
          ) : newsArticles.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.newsHorizontalScroll}
              contentContainerStyle={styles.newsScrollContent}
            >
              {newsArticles.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(`/press-release/${item.id}`)}
                  style={styles.newsCard}
                  activeOpacity={0.9}
                >
                  <View style={styles.newsImageContainer}>
                    <Image 
                      source={item.file ? { uri: pb.files.getURL(item, item.file) } : require("../../assets/images/fallback.png")}
                      style={styles.newsImage}
                      defaultSource={require("../../assets/images/fallback.png")}
                    />
                  </View>
                  <View style={styles.newsContent}>
                    <View style={styles.newsHeader}>
                       <View style={styles.newsDateContainer}>
                        <Text style={styles.newsDate}>
                          {new Date(item.created).getDate()}/{new Date(item.created).getMonth() + 1}/{new Date(item.created).getFullYear()}
                        </Text>
                      </View>
                      <Text style={styles.newsTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                     
                    </View>
                    {item.description && (
                      <Text style={styles.newsDescription} numberOfLines={2}>
                        {item.description.replace(/<[^>]*>/g, "")}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noNewsContainer}>
              <Text style={styles.noNewsText}>No news articles available</Text>
            </View>
          )}
        </View>

        {/* Footer Note */}
        <View style={styles.footer}>
          <FontAwesome5 name="shield-alt" size={18} color="#1E3A8A" />
          <Text style={styles.footerText}>
            Your safety is our priority. Always know your nearest police station.
          </Text>
        </View>
      </ScrollView>

      <SOSBottomSheet
        visible={showSOSSheet}
        onClose={() => setShowSOSSheet(false)}
        onTriggerSOS={(locationCoords) => {
          console.log('SOS triggered with location:', locationCoords);
        }}
      />

      {/* Coming Soon Modal */}
      {showComingSoon && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="time" size={48} color="#F59E0B" />
            </View>
            
            <Text style={styles.modalTitle}>Coming Soon</Text>
            
            <Text style={styles.modalMessage}>
              {comingSoonTitle} is currently in development and will be available soon.
            </Text>
            
            <Text style={styles.modalSubtitle}>
              We're working hard to bring you this feature.
            </Text>
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowComingSoon(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f6f7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  
  // Custom Header Styles
  customHeader: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#D1D5DB",
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: "#1E3A8A",
    paddingTop: 55,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  logo: {
    width: 50,
    height: 50,
  },
  titleContainer: {
    flexDirection: 'column',
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  appSubtitle: {
    fontSize: 11,
    color: 'lightgray',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sosButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FBBF24',
  },

  // Police Station Features Section
  stationFeaturesSection: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  stationFeaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  
  // Find Police Stations Card
  findStationsCard: {
    flex: 1,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderBottomWidth: 3,
    borderBottomColor:'#FBBF24'
  },
  findStationsBackground: {
    width: '100%',
    height: '100%',
  },
  findStationsImageStyle: {
    borderRadius: 12,
  },
  findStationsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 58, 138, 0.85)',
    padding: 16,
    justifyContent: 'space-between',
  },
  findStationsIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  findStationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  findStationsSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 16,
    marginBottom: 10,
  },

  // Locate Stations Card
  locateStationsCard: {
    flex: 1,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderBottomWidth: 3,
    borderBottomColor:'#1E3A8A'
  },
  locateStationsBackground: {
    width: '100%',
    height: '100%',
  },
  locateStationsImageStyle: {
    borderRadius: 12,
  },
  locateStationsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(251, 191, 36, 0.85)',
    padding: 16,
    justifyContent: 'space-between',
  },
  locateStationsIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  locateStationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  locateStationsSubtitle: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.9)',
    lineHeight: 16,
    marginBottom: 10,
  },

  // Section Styles
  section: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionNews: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical:10,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    marginBottom: 5,
    fontWeight: '600',
    color: '#1E293B',
  },
  viewAllText: {
    color: '#1E3A8A',
    fontWeight: '500',
    fontSize: 13,
  },

  // Emergency Contacts
  emergencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  emergencyCard: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  emergencyCardContent: {
    padding: 14,
  },
  emergencyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emergencyTextContainer: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  emergencySubtitle: {
    fontSize: 11,
    opacity: 0.9,
    fontWeight: '500',
  },
  callButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Quick Actions Grid
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  serviceCardDisabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.7,
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
    lineHeight: 18,
  },
  serviceTitleDisabled: {
    color: '#9CA3AF',
  },
  serviceSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  serviceSubtitleDisabled: {
    color: '#D1D5DB',
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  comingSoonText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },

  // Police Services
  quickServicesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickServiceCard: {
    padding: 16,
  },
  quickServiceCardDisabled: {
    opacity: 0.6,
  },
  quickServiceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickServiceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickServiceIconContainerDisabled: {
    backgroundColor: '#F3F4F6',
  },
  quickServiceTextContainer: {
    flex: 1,
  },
  quickServiceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  quickServiceTitleDisabled: {
    color: '#9CA3AF',
  },
  quickServiceDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  quickServiceDescriptionDisabled: {
    color: '#D1D5DB',
  },

  // News Section - Horizontal Scroll
  newsHorizontalScroll: {
    marginHorizontal: -16,
  },
  newsScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  newsCard: {
    width: width * 0.65,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth:0.5,
    borderColor:"lightgray"
  },
  newsImageContainer: {
    width: '100%',
    height: 150,
    overflow: 'hidden',
  },
  newsImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius:5,
  },
  newsContent: {
    padding: 12,
  },
  newsHeader: {
    flexDirection: 'column',
    marginBottom: 4,
  },
  newsTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 18,
    marginRight: 8,
  },
  newsDateContainer: {

  },
  newsDate: {
    fontSize: 10,
  },
  newsDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  
  // News Skeleton
  newsSkeletonCard: {
    width: width * 0.65,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  skeletonImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#E5E7EB',
  },
  skeletonContent: {
    padding: 12,
  },
  skeletonTitle: {
    height: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
    width: '80%',
  },
  skeletonDescription: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
    width: '100%',
  },
  skeletonMeta: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    width: '40%',
  },

  // No News State
  noNewsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  noNewsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 30,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Home;
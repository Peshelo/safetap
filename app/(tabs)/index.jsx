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
import { Ionicons } from "../components/Icons";
import api from "../../lib/connection";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomHeader from "../components/Header";
import ArticleImage, { FALLBACK_IMAGE } from "../components/ArticleImage";

const { width } = Dimensions.get("window");

const COLORS = {
  navy: "#1E3A8A",
  navyLight: "#2D4FAA",
  yellow: "#FBBF24",
  yellowLight: "#FDE68A",
  red: "#DC2626",
  green: "#059669",
  bg: "#F1F5F9",
  white: "#FFFFFF",
  textDark: "#0F172A",
  textMid: "#475569",
  textLight: "#94A3B8",
  border: "#E2E8F0",
};

const formatArticleDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const Home = () => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [newsArticles, setNewsArticles] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState("");

  // Notice banner text — edit as needed
  const noticeBanner = "NOTICE: Please report any suspicious activity to your nearest police station immediately. Stay safe.";

  const fetchNewsArticles = async () => {
    try {
      setLoading(true);
      const records = await api.collection("news").getList(1, 4, { sort: "-created" });
      setNewsArticles(records.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNewsArticles();
  }, []);

  const makeEmergencyCall = (number) => {
    Linking.openURL(`tel:${number}`).catch(() =>
      Alert.alert("Error", "Could not make the call")
    );
  };

  const openWhatsApp = (number) => {
    // Strip leading + for WhatsApp URL format
    const cleaned = number.replace(/\D/g, "");
    Linking.openURL(`https://wa.me/${cleaned}`).catch(() =>
      Alert.alert("Error", "Could not open WhatsApp")
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNewsArticles();
  };

  const showComingSoonAlert = (title) => {
    setComingSoonTitle(title);
    setShowComingSoon(true);
  };

  const quickActions = [
    {
      title: "Press Release",
      subtitle: "Latest news & press releases",
      icon: "newspaper",
      action: () => router.push("/(tabs)/news"),
    },
    {
      title: "Suggestion Box",
      subtitle: "Leave feedback anonymously",
      icon: "archive",
      action: () => router.push("/report/complaint"),
    },
  ];

  const policeServices = [
    {
      title: "Explore Services",
      description: "Browse all police services",
      icon: "search",
      available: true,
      action: () => router.push("/(tabs)/services"),
    },
    {
      title: "Report Follow-up",
      description: "Track your report status",
      icon: "clipboard-check",
      available: false,
      action: () => showComingSoonAlert("Police Report Follow-up"),
    },
    {
      title: "ZRP on Social Media",
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
      action: () => router.push("/(tabs)/about"),
    },
  ];

  const emergencyContacts = [
    {
      title: "Police Emergency",
      subtitle: "24/7 Hotline",
      number: "+263242703631",
      icon: "shield-alt",
      bgColor: COLORS.red,
    },
  ];

  const NewsSkeleton = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.newsScrollContent}
    >
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.newsSkeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={{ padding: 12 }}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonDescription} />
          </View>
        </View>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

      <CustomHeader
        title="SafeTap"
        subtitle="Zimbabwe Republic Police"
        showLogo
        compact
        rightComponent={(
          <TouchableOpacity onPress={() => router.push("/(tabs)/about")} style={styles.profileButton}>
            <Ionicons name="settings" size={18} color={COLORS.navy} />
          </TouchableOpacity>
        )}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.yellow]}
            tintColor={COLORS.yellow}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Notice Banner */}
        <View style={styles.noticeBanner}>
          <Ionicons name="bullhorn" size={13} color={COLORS.navy} style={{ marginRight: 8, marginTop: 1 }} />
          <Text style={styles.noticeText} numberOfLines={2}>{noticeBanner}</Text>
        </View>

        {/* Station Cards */}
        <View style={styles.stationRow}>
          {/* Directory */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/contacts")}
            style={styles.stationCardWrapper}
            activeOpacity={0.88}
          >
            <ImageBackground
              source={require("../../assets/images/fallback.png")}
              style={styles.stationCardBg}
              imageStyle={styles.stationCardImageStyle}
            >
              <View style={styles.stationOverlayNavy}>
                <View style={styles.stationIconCircle}>
                  <Ionicons name="building" size={20} color={COLORS.white} />
                </View>
                <Text style={styles.stationCardTitle}>Police Station Directory</Text>
                <Text style={styles.stationCardSub}>Browse all stations with contact information</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>

          {/* Locate Nearby */}
          <TouchableOpacity
            onPress={() => router.push("/maps")}
            style={styles.stationCardWrapper}
            activeOpacity={0.88}
          >
            <ImageBackground
              source={require("../../assets/images/fallback.png")}
              style={styles.stationCardBg}
              imageStyle={styles.stationCardImageStyle}
            >
              <View style={styles.stationOverlayYellow}>
                <View style={[styles.stationIconCircle, { backgroundColor: "rgba(0,0,0,0.18)" }]}>
                  <Ionicons name="map-marked-alt" size={20} color={COLORS.navy} />
                </View>
                <Text style={[styles.stationCardTitle, { color: COLORS.navy }]}>Live Station Locator</Text>
                <Text style={[styles.stationCardSub, { color: "rgba(15,23,42,0.75)" }]}>Find nearest stations with directions & distance</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="phone-alt" size={13} color={COLORS.red} />
              <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(tabs)/contacts")}>
              <Text style={styles.viewAll}>All Contacts</Text>
            </TouchableOpacity>
          </View>

          {/* Emergency call cards */}
          <View style={styles.emergencyGrid}>
            {emergencyContacts.map((contact, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => makeEmergencyCall(contact.number)}
                style={[styles.emergencyCard, { backgroundColor: contact.bgColor }]}
                activeOpacity={0.88}
              >
                <View style={styles.emergencyIconWrap}>
                  <Ionicons name={contact.icon} size={16} color={COLORS.white} />
                </View>
                <Text style={styles.emergencyTitle}>{contact.title}</Text>
                <Text style={styles.emergencySubtitle}>{contact.subtitle}</Text>
                <View style={[styles.callBadge, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                  <Ionicons name="phone-alt" size={10} color={COLORS.white} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* WhatsApp — separate, distinct card */}
          <View style={styles.whatsappSection}>
            <View style={styles.whatsappLabelRow}>
              <View style={styles.whatsappDivider} />
              <Text style={styles.whatsappLabel}>Chat & Messaging</Text>
              <View style={styles.whatsappDivider} />
            </View>
            <TouchableOpacity
              onPress={() => openWhatsApp("+263712800197")}
              style={styles.whatsappCard}
              activeOpacity={0.88}
            >
              <View style={styles.whatsappIconWrap}>
                <Ionicons name="whatsapp" size={22} color={COLORS.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.whatsappTitle}>Chat on WhatsApp</Text>
                <Text style={styles.whatsappSub}>Talk to us on WhatsApp</Text>
              </View>
              <View style={styles.whatsappChevron}>
                <Ionicons name="arrow-forward" size={14} color="#25D366" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={item.action}
                style={styles.quickActionCard}
                activeOpacity={0.88}
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name={item.icon} size={17} color={COLORS.navy} />
                </View>
                <Text style={styles.quickActionTitle}>{item.title}</Text>
                <Text style={styles.quickActionSub}>{item.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

     

        {/* News */}
        <View style={styles.newsSection}>
          <View style={[styles.sectionHeader, { paddingHorizontal: 16 }]}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="newspaper" size={13} color={COLORS.yellow} />
              <Text style={styles.sectionTitle}>News & Press Releases</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(tabs)/news")}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <NewsSkeleton />
          ) : newsArticles.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.newsScrollContent}
            >
              {newsArticles.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(`/press-release/${item.id}`)}
                  style={styles.newsCard}
                  activeOpacity={0.88}
                >
                  <ArticleImage
                    source={
                      item.file
                        ? { uri: api.files.getURL(item, item.file) }
                        : FALLBACK_IMAGE
                    }
                    style={styles.newsImage}
                  />
                  <View style={styles.newsContent}>
                    <Text style={styles.newsDate}>
                      {formatArticleDate(item.created)}
                    </Text>
                    <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
                    {item.description && (
                      <Text style={styles.newsDesc} numberOfLines={2}>
                        {item.description.replace(/<[^>]*>/g, "")}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyNews}>
              <Text style={styles.emptyNewsText}>No news articles available</Text>
            </View>
          )}
        </View>

   {/* Police Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="tasks" size={13} color={COLORS.navy} />
              <Text style={styles.sectionTitle}>Police Services</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(tabs)/services")}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.servicesList}>
            {policeServices.map((service, index) => (
              <TouchableOpacity
                key={index}
                onPress={service.action}
                style={[
                  styles.serviceRow,
                  index < policeServices.length - 1 && styles.serviceRowBorder,
                  !service.available && { opacity: 0.5 },
                ]}
                activeOpacity={0.8}
                disabled={!service.available}
              >
                <View style={styles.serviceIconWrap}>
                  <Ionicons name={service.icon} size={14} color={service.available ? COLORS.navy : COLORS.textLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceTitle}>{service.title}</Text>
                  <Text style={styles.serviceDesc}>{service.description}</Text>
                </View>
                {service.available ? (
                  <Ionicons name="chevron-forward" size={15} color={COLORS.textLight} />
                ) : (
                  <View style={styles.soonBadge}>
                    <Text style={styles.soonText}>Soon</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-alt" size={16} color={COLORS.navy} />
          <Text style={styles.footerText}>
            Your safety is our priority. Always know your nearest police station.
          </Text>
        </View>
      </ScrollView>

      {/* Coming Soon Modal */}
      {showComingSoon && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons name="time-outline" size={44} color={COLORS.yellow} style={{ marginBottom: 12 }} />
            <Text style={styles.modalTitle}>Coming Soon</Text>
            <Text style={styles.modalMessage}>
              {comingSoonTitle} is currently in development and will be available soon.
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
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Header
  header: {
    backgroundColor: COLORS.navy,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  logoContainer: { width: 44, height: 44, marginRight: 10 },
  logo: { width: 44, height: 44 },
  appName: { fontSize: 17, fontWeight: "700", color: COLORS.white },
  appSubtitle: { fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 1 },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.yellowLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.yellow,
  },

  // Notice Banner
  noticeBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.yellowLight,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.yellow,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 8,
    padding: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.textDark,
    lineHeight: 18,
    fontWeight: "500",
  },

  // Station Cards
  stationRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    gap: 12,
  },
  stationCardWrapper: {
    flex: 1,
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
  },
  stationCardBg: {
    width: "100%",
    height: "100%",
  },
  stationCardImageStyle: {
    borderRadius: 14,
  },
  stationOverlayNavy: {
    flex: 1,
    backgroundColor: "rgba(30, 58, 138, 0.88)",
    padding: 16,
    justifyContent: "flex-start",
    borderBottomWidth: 3,
    borderBottomColor: COLORS.yellow,
  },
  stationOverlayYellow: {
    flex: 1,
    backgroundColor: "rgba(251, 191, 36, 0.88)",
    padding: 16,
    justifyContent: "flex-start",
    borderBottomWidth: 3,
    borderBottomColor: COLORS.navy,
  },
  stationIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  stationCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 5,
    lineHeight: 18,
  },
  stationCardSub: {
    fontSize: 11.5,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 16,
  },

  // Sections
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  sectionTitle: { fontSize: 15.5, fontWeight: "700", color: COLORS.textDark },
  viewAll: { fontSize: 13, color: COLORS.navy, fontWeight: "600" },

  // Emergency
  emergencyGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  emergencyCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    position: "relative",
    overflow: "hidden",
    minHeight: 110,
  },
  emergencyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emergencyTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 3,
  },
  emergencySubtitle: { fontSize: 11, color: "rgba(255,255,255,0.85)" },
  callBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  // WhatsApp — separate section
  whatsappSection: {
    marginTop: 4,
  },
  whatsappLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  whatsappDivider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  whatsappLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  whatsappCard: {
    backgroundColor: "#128C7E",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  whatsappIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  whatsappTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 3,
  },
  whatsappSub: {
    fontSize: 11.5,
    color: "rgba(255,255,255,0.8)",
  },
  whatsappChevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 4,
  },
  quickActionSub: { fontSize: 11.5, color: COLORS.textMid, lineHeight: 15 },

  // Police Services
  servicesList: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  serviceRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  serviceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  serviceTitle: { fontSize: 14, fontWeight: "600", color: COLORS.textDark },
  serviceDesc: { fontSize: 12, color: COLORS.textMid, marginTop: 2 },
  soonBadge: {
    backgroundColor: "#F1F5F9",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  soonText: { fontSize: 10, color: COLORS.textMid, fontWeight: "600" },

  // News
  newsSection: {
    backgroundColor: COLORS.white,
    paddingVertical: 14,
    marginBottom: 20,
  },
  newsScrollContent: { paddingHorizontal: 16, gap: 12 },
  newsCard: {
    width: width * 0.62,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  newsImage: { width: "100%", height: 140, resizeMode: "cover" },
  newsContent: { padding: 12 },
  newsDate: { fontSize: 10.5, color: COLORS.textLight, marginBottom: 5 },
  newsTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.textDark,
    lineHeight: 18,
    marginBottom: 5,
  },
  newsDesc: { fontSize: 12, color: COLORS.textMid, lineHeight: 16 },
  emptyNews: {
    padding: 24,
    alignItems: "center",
  },
  emptyNewsText: { fontSize: 13, color: COLORS.textLight },

  // Skeleton
  newsSkeletonCard: {
    width: width * 0.62,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skeletonImage: { width: "100%", height: 140, backgroundColor: "#E2E8F0" },
  skeletonTitle: {
    height: 14,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    marginBottom: 8,
    width: "75%",
  },
  skeletonDescription: {
    height: 12,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    width: "100%",
  },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    marginBottom: 30,
    borderColor: COLORS.border,
  },
  footerText: { flex: 1, fontSize: 12.5, color: COLORS.textMid, lineHeight: 17 },

  // Modal
  modalOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 28,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.textMid,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: COLORS.navy,
    paddingVertical: 13,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: { color: COLORS.white, fontSize: 15, fontWeight: "700" },
});

export default Home;

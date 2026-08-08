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
  Platform,
  ImageBackground,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { router } from "expo-router";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import api, { resolveMediaUrl } from "../../src/services/api";
import analyticsService from "../../src/services/analyticsService";
import { triggerStationCall } from "../../lib/callTrigger";
import AppHeader from "../../src/components/AppHeader";
import { colors, radius, spacing, typography, componentHeights, borders, elevation } from "../../src/constants/theme";
import { useAppTheme } from "../../src/context/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const triggerHaptic = () => {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
};

import { getRecentStations } from "../../src/services/recentStationsService";

const Home = () => {
  const { colors, isDark } = useAppTheme();
  const PATTERN_BG = require("../../assets/images/fallback.png");

  const [loading, setLoading] = useState(false);
  const [newsArticles, setNewsArticles] = useState([]);
  const [recentStations, setRecentStations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState("");

  const noticeBanner =
    "PUBLIC NOTICE: Verify online financial transactions to prevent fraud. Report suspicious activity to nearest ZRP Command.";

  const fetchNewsArticles = async () => {
    try {
      setLoading(true);
      const res = await api.publications.list({ is_published: true, page: 1, page_size: 10 });
      setNewsArticles(res.items || []);
    } catch (err) {
      console.log("Error fetching news:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadRecentStations = async () => {
    const list = await getRecentStations();
    setRecentStations(list);
  };

  useEffect(() => {
    analyticsService.trackFeature("Home Dashboard");
    fetchNewsArticles();
    loadRecentStations();
  }, []);

  const makeEmergencyCall = (number, title) => {
    triggerHaptic();
    triggerStationCall({ name: title, phone: number });
  };

  const openWhatsApp = (number) => {
    triggerHaptic();
    const cleaned = number.replace(/\D/g, "");
    Linking.openURL(`https://wa.me/${cleaned}`).catch(() =>
      Alert.alert("Error", "Could not open WhatsApp")
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNewsArticles();
    loadRecentStations();
  };

  const quickActions = [
    {
      title: "Press Release",
      subtitle: "Official ZRP releases",
      icon: "newspaper",
      iconLib: "ionicons",
      accentColor: "#1E3A8A",
      action: () => {
        triggerHaptic();
        router.push("(tabs)/news");
      },
    },
    {
      title: "Suggestion Box",
      subtitle: "Leave feedback anonymously",
      icon: "archive",
      iconLib: "ionicons",
      accentColor: "#059669",
      action: () => {
        triggerHaptic();
        router.push("/report/complaint");
      },
    },
  ];

  const policeServices = [
    {
      title: "Explore Services",
      description: "Browse all public police services",
      icon: "apps-outline",
      available: true,
      action: () => {
        triggerHaptic();
        router.push("(tabs)/services");
      },
    },
    {
      title: "Report Follow-up",
      description: "Track your report status",
      icon: "clipboard-outline",
      available: false,
      action: () => { setComingSoonTitle("Police Report Follow-up"); setShowComingSoon(true); },
    },
    {
      title: "ZRP on Social Media",
      description: "Follow official ZRP updates",
      icon: "share-social-outline",
      available: true,
      action: () => {
        triggerHaptic();
        router.push("(tabs)/about");
      },
    },
    {
      title: "About SafeTap",
      description: "Learn about this platform",
      icon: "information-circle-outline",
      available: true,
      action: () => {
        triggerHaptic();
        router.push("(tabs)/about");
      },
    },
  ];

  const emergencyContacts = [
    {
      title: "Police Emergency",
      subtitle: "24/7 National Command Hotline",
      number: "+263242703631",
      icon: "shield-checkmark",
      bgGradient: ["#DC2626", "#B91C1C"],
    },
  ];

  const HomeNewsCard = ({ item, router, triggerHaptic }) => {
    const [imgErr, setImgErr] = useState(false);
    const rawUrl = resolveMediaUrl(item?.cover_image_url || item?.file);
    const imgSrc = imgErr || !rawUrl ? require("../../assets/images/fallback.png") : { uri: rawUrl };

    return (
      <TouchableOpacity
        onPress={() => {
          triggerHaptic();
          router.push("(tabs)/news");
        }}
        style={[styles.newsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={0.85}
      >
        <Image
          source={imgSrc}
          style={styles.newsImage}
          onError={() => setImgErr(true)}
        />
        <View style={styles.newsContent}>
          <View style={styles.newsDateRow}>
            <Ionicons name="calendar-outline" size={11} color={colors.neutral[500]} />
            <Text style={styles.newsDate}>
              {item.published_at
                ? new Date(item.published_at).toLocaleDateString("en-GB")
                : "Latest"}
            </Text>
          </View>
          <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
          {item.summary ? (
            <Text style={styles.newsDesc} numberOfLines={2}>{item.summary}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const NewsSkeleton = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.newsScrollContent}
    >
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.newsSkeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={{ padding: 14 }}>
            <View style={[styles.skeletonLine, { width: "40%", height: 10, marginBottom: 8 }]} />
            <View style={[styles.skeletonLine, { width: "90%", marginBottom: 6 }]} />
            <View style={[styles.skeletonLine, { width: "70%" }]} />
          </View>
        </View>
      ))}
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="ZRP SafeTap"
        subtitle="Zimbabwe Republic Police"
        rightActions={[
          {
            iconName: "information-circle-outline",
            onPress: () => {
              triggerHaptic();
              router.push("(tabs)/about");
            },
          },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Sleek Executive Redesigned Notice Badge with Pattern Overlay */}
        {!noticeDismissed && (
          <ImageBackground
            source={PATTERN_BG}
            style={[styles.sleekNoticeCard, { backgroundColor: isDark ? colors.surface : "#FEFCE8", borderColor: isDark ? colors.border : "#FEF08A" }]}
            imageStyle={{ opacity: 0.08, resizeMode: "cover" }}
          >
            <View style={styles.noticeBadgeLeft}>
              <View style={styles.alertPulseDot} />
              <Ionicons name="warning-outline" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sleekNoticeHeading, { color: isDark ? "#FBBF24" : "#B45309" }]}>ZRP ALERT</Text>
              <Text style={[styles.sleekNoticeBody, { color: colors.textPrimary }]} numberOfLines={2}>
                {noticeBanner}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setNoticeDismissed(true)} style={styles.noticeDismissBtn}>
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </ImageBackground>
        )}

        {/* Hero Cards Row — Police Directory (Rich Blue + Brown Border) & Spatial Radar (Rich Brown + Blue Border) */}
        <View style={styles.heroRow}>
          <TouchableOpacity
            onPress={() => { triggerHaptic(); router.push("(tabs)/contacts"); }}
            style={[styles.heroCard, styles.heroCardBlueWithBrown]}
            activeOpacity={0.88}
          >
            <ImageBackground
              source={PATTERN_BG}
              style={styles.heroCardInner}
              imageStyle={{ opacity: 0.12, resizeMode: "cover" }}
            >
              <View style={styles.heroIconCircle}>
                <Ionicons name="call" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.heroCardTitle}>Police Stations</Text>
              <Text style={styles.heroCardSub}>Browse stations & contacts</Text>
              <View style={styles.heroArrow}>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </View>
            </ImageBackground>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { triggerHaptic(); router.push("/maps"); }}
            style={[styles.heroCard, styles.heroCardBrownWithBlue]}
            activeOpacity={0.88}
          >
            <ImageBackground
              source={PATTERN_BG}
              style={styles.heroCardInner}
              imageStyle={{ opacity: 0.12, resizeMode: "cover" }}
            >
              <View style={[styles.heroIconCircle, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                <Ionicons name="map" size={22} color="#FFFFFF" />
              </View>
              <Text style={[styles.heroCardTitle, { color: "#FFFFFF" }]}>Locate Stations</Text>
              <Text style={[styles.heroCardSub, { color: "rgba(255,255,255,0.9)" }]}>Find nearest police stations</Text>
              <View style={[styles.heroArrow, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </View>
            </ImageBackground>
          </TouchableOpacity>
        </View>

        {/* Recently Accessed Stations Section */}
        {recentStations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="time" size={16} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recently Accessed Stations</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("(tabs)/contacts")}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 4 }}>
              {recentStations.map((stn) => (
                <TouchableOpacity
                  key={stn.id}
                  style={[styles.recentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() =>
                    router.push({
                      pathname: "/contactDetails",
                      params: {
                        id: stn.id,
                        station: stn.name,
                        province: stn.province,
                        district: stn.district,
                        station_number: stn.phone,
                        whatsapp_number: stn.whatsapp,
                        latitude: stn.latitude,
                        longitude: stn.longitude,
                        address: stn.address || "",
                      },
                    })
                  }
                  activeOpacity={0.85}
                >
                  <View style={[styles.recentBadgeIcon, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="call" size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.recentName, { color: colors.textPrimary }]} numberOfLines={1}>{stn.name}</Text>
                  <Text style={[styles.recentSub, { color: colors.textMuted }]} numberOfLines={1}>{stn.province || "Zimbabwe"}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Emergency Contacts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionDot, { backgroundColor: colors.danger }]} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Emergency Hotlines</Text>
            </View>
            <TouchableOpacity
              onPress={() => { triggerHaptic(); router.push("(tabs)/contacts"); }}
              style={styles.viewAllBtn}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>All Contacts</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.emergencyGrid}>
            {emergencyContacts.map((contact, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => makeEmergencyCall(contact.number, contact.title)}
                style={[styles.emergencyCard, { backgroundColor: contact.bgGradient[0] }]}
                activeOpacity={0.88}
              >
                <ImageBackground
                  source={PATTERN_BG}
                  style={styles.emergencyCardInner}
                  imageStyle={{ opacity: 0.12, resizeMode: "cover" }}
                >
                  <View style={styles.emergencyIconWrap}>
                    <Ionicons name={contact.icon} size={20} color="#fff" />
                  </View>
                  <Text style={styles.emergencyTitle}>{contact.title}</Text>
                  <Text style={styles.emergencySubtitle}>{contact.subtitle}</Text>
                  <View style={styles.callBadge}>
                    <Ionicons name="call" size={11} color="#fff" />
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </View>

          {/* WhatsApp Card */}
          <TouchableOpacity
            onPress={() => openWhatsApp("+263712800197")}
            style={styles.whatsappCard}
            activeOpacity={0.88}
          >
            <ImageBackground
              source={PATTERN_BG}
              style={styles.whatsappCardInner}
              imageStyle={{ opacity: 0.1, resizeMode: "cover" }}
            >
              <View style={styles.whatsappIconWrap}>
                <FontAwesome5 name="whatsapp" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.whatsappTitle}>Official WhatsApp Helpline</Text>
                <Text style={styles.whatsappSub}>Chat directly with ZRP Command</Text>
              </View>
              <View style={styles.whatsappChevron}>
                <Ionicons name="arrow-forward" size={14} color="#25D366" />
              </View>
            </ImageBackground>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Actions</Text>
            </View>
          </View>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={item.action}
                style={[styles.quickActionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 7 }]}
                activeOpacity={0.88}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: `${item.accentColor}12`, borderRadius: 7 }]}>
                  <Ionicons name={item.icon} size={20} color={item.accentColor} />
                </View>
                <Text style={[styles.quickActionTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.quickActionSub, { color: colors.textMuted }]}>{item.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* News Feed */}
        <View style={[styles.newsSection, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.sectionHeader, { paddingHorizontal: spacing.screenPadding }]}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionDot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>News & Press Releases</Text>
            </View>
            <TouchableOpacity
              onPress={() => { triggerHaptic(); router.push("(tabs)/news"); }}
              style={styles.viewAllBtn}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
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
                <HomeNewsCard key={item.id} item={item} router={router} triggerHaptic={triggerHaptic} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyNews}>
              <Ionicons name="newspaper-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyNewsText, { color: colors.textMuted }]}>No publications currently available</Text>
            </View>
          )}
        </View>

        {/* Police Services List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionDot, { backgroundColor: "#059669" }]} />
              <Text style={styles.sectionTitle}>Police Services</Text>
            </View>
            <TouchableOpacity
              onPress={() => { triggerHaptic(); router.push("/services"); }}
              style={styles.viewAllBtn}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
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
                  <Ionicons
                    name={service.icon}
                    size={18}
                    color={service.available ? colors.primary : colors.neutral[400]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceTitle}>{service.title}</Text>
                  <Text style={styles.serviceDesc}>{service.description}</Text>
                </View>
                {service.available ? (
                  <Ionicons name="chevron-forward" size={16} color={colors.neutral[400]} />
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
          <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
          <Text style={styles.footerText}>Your safety is our priority</Text>
          <Text style={styles.footerSub}>© 2026 Zimbabwe Republic Police</Text>
        </View>
      </ScrollView>

      {/* Coming Soon Modal */}
      {showComingSoon && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="time" size={36} color={colors.warning} />
            </View>
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
  container: { flex: 1, backgroundColor: colors.neutral[50] },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  // Hero Cards Row Styles (Blue with Gold Border & Gold with Blue Border)
  heroRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.screenPadding,
    marginTop: spacing.screenPadding,
    marginBottom: spacing.section,
    gap: spacing.component,
  },
  heroCard: {
    flex: 1,
    height: 148,
    borderRadius: 12,
    overflow: "hidden",
  },
  heroCardBlueWithBrown: {
    backgroundColor: "#1E3A8A",
    borderBottomWidth: 4,
    borderBottomColor: "#C49A45",
  },
  heroCardBrownWithBlue: {
    backgroundColor: "#C49A45",
    borderBottomWidth: 4,
    borderBottomColor: "#1E3A8A",
  },
  heroCardInner: {
    flex: 1,
    padding: spacing.cardSpacing,
    position: "relative",
    justifyContent: "space-between",
  },
  heroIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  heroCardSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 15,
  },
  heroArrow: {
    position: "absolute",
    bottom: spacing.cardSpacing,
    right: spacing.cardSpacing,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Sleek Executive Notice Alert Badge
  sleekNoticeCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.screenPadding,
    marginTop: spacing.screenPadding,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    overflow: "hidden",
    gap: 10,
  },
  noticeBadgeLeft: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  alertPulseDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
  },
  sleekNoticeHeading: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  sleekNoticeBody: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  noticeDismissBtn: {
    padding: 4,
  },

  // Recently Accessed Stations Cards
  recentCard: {
    width: 140,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: "flex-start",
  },
  recentBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  recentName: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
    width: "100%",
  },
  recentSub: {
    fontSize: 10,
    fontWeight: "500",
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },

  // Promo Banner Card
  promoBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.section,
    padding: 16,
    borderRadius: 7,
    borderWidth: 1,
    gap: 12,
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  promoSub: {
    fontSize: 12,
  },
  promoActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 7,
  },
  promoActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  // Explore Nearby Stations Circle Avatars
  exploreCircleItem: {
    alignItems: "center",
    width: 76,
  },
  exploreAvatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  exploreName: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  exploreDist: {
    fontSize: 10,
    marginTop: 1,
  },

  // Sections
  section: {
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.section,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.component,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 16,
    color: colors.primary,
    fontWeight: "700",
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewAllText: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.primary,
  },

  // Emergency Cards
  emergencyGrid: {
    flexDirection: "row",
    gap: spacing.component,
    marginBottom: spacing.component,
  },
  emergencyCard: {
    flex: 1,
    borderRadius: 12,
    position: "relative",
    overflow: "hidden",
    minHeight: 118,
  },
  emergencyCardInner: {
    flex: 1,
    padding: spacing.cardSpacing,
    position: "relative",
    minHeight: 118,
    justifyContent: "space-between",
  },
  emergencyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 3,
  },
  emergencySubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  callBadge: {
    position: "absolute",
    top: spacing.cardSpacing,
    right: spacing.cardSpacing,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // WhatsApp
  whatsappCard: {
    backgroundColor: "#0E9F6E",
    borderRadius: 12,
    overflow: "hidden",
  },
  whatsappCardInner: {
    padding: spacing.cardSpacing,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.component,
  },
  whatsappIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  whatsappTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  whatsappSub: { fontSize: 12, color: "rgba(255,255,255,0.85)" },
  whatsappChevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: "row",
    gap: spacing.component,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.neutral.white,
    borderRadius: radius.xl,
    padding: spacing.cardSpacing,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.neutral[900],
    marginBottom: 3,
  },
  quickActionSub: { fontSize: 12, color: colors.neutral[500], lineHeight: 16 },

  // News
  newsSection: {
    backgroundColor: colors.neutral.white,
    paddingVertical: spacing.cardSpacing,
    marginBottom: spacing.section,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral[200],
  },
  newsScrollContent: {
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.component,
    paddingTop: 4,
  },
  newsCard: {
    width: SCREEN_WIDTH * 0.68,
    borderRadius: radius.xl,
    backgroundColor: colors.neutral.white,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  newsImage: { width: "100%", height: 130, resizeMode: "cover" },
  newsContent: { padding: spacing.cardSpacing },
  newsDateRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  newsDate: { fontSize: 11, color: colors.neutral[500], fontWeight: "500" },
  newsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.neutral[900],
    lineHeight: 18,
    marginBottom: 4,
  },
  newsDesc: { fontSize: 12, color: colors.neutral[600], lineHeight: 16 },
  emptyNews: {
    paddingVertical: 40,
    paddingHorizontal: spacing.screenPadding,
    alignItems: "center",
    gap: 10,
  },
  emptyNewsText: {
    fontSize: 13,
    color: colors.neutral[400],
    textAlign: "center",
  },

  // Skeleton
  newsSkeletonCard: {
    width: SCREEN_WIDTH * 0.68,
    height: 200,
    borderRadius: radius.xl,
    backgroundColor: colors.neutral[100],
    overflow: "hidden",
  },
  skeletonImage: { width: "100%", height: 120, backgroundColor: colors.neutral[200] },
  skeletonLine: {
    height: 12,
    backgroundColor: colors.neutral[200],
    borderRadius: 6,
    marginBottom: 6,
  },

  // Services List
  servicesList: {
    backgroundColor: colors.neutral.white,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.cardSpacing,
    gap: spacing.component,
    height: componentHeights.listTile,
  },
  serviceRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  serviceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.neutral[900],
    marginBottom: 2,
  },
  serviceDesc: { fontSize: 12, color: colors.neutral[500] },
  soonBadge: {
    backgroundColor: colors.neutral[100],
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  soonText: { fontSize: 11, fontWeight: "600", color: colors.neutral[400] },

  // Footer
  footer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 6,
  },
  footerText: { fontSize: 13, fontWeight: "600", color: colors.neutral[600] },
  footerSub: { fontSize: 11, color: colors.neutral[400] },

  // Modal
  modalOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(11, 18, 32, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.screenPadding,
  },
  modalBox: {
    backgroundColor: colors.neutral.white,
    borderRadius: radius.modal,
    padding: spacing.section,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    ...typography.subtitle,
    color: colors.neutral[900],
    marginBottom: 8,
    fontWeight: "700",
  },
  modalMessage: {
    ...typography.bodySmall,
    color: colors.neutral[600],
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: colors.primary,
    height: componentHeights.defaultButton,
    paddingHorizontal: 40,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

export default Home;
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  Alert,
  RefreshControl,
  Share,
  ImageBackground,
} from "react-native";
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import api from "../../src/services/api";
import analyticsService from "../../src/services/analyticsService";
import offlineContactService from "../../src/services/offlineContactService";
import { triggerStationCall } from "../../lib/callTrigger";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useNetworkStatus from "../hooks/useNetworkStatus";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppHeader from "../../src/components/AppHeader";
import { colors, radius, spacing, typography, componentHeights, borders } from "../../src/constants/theme";
import { useAppTheme } from "../../src/context/ThemeContext";

const zimbabweProvinces = {
  Harare: [
    "Harare Central","Harare South","Harare East","Harare West","Harare North",
    "Mbare","Highfield","Kuwadzana","Dzivarasekwa","Budiriro","Glen View","Epworth"
  ],
  Mashonaland_Central: [
    "Bindura","Guruve","Mazowe","Mbire","Mount Darwin","Muzarabani","Rushinga","Shamva","Centenary","Concession"
  ],
  Mashonaland_West: [
    "Chegutu","Hurungwe","Kariba","Makonde","Mhondoro-Ngezi","Zvimba","Sanyati","Kadoma","Chinhoyi","Raffingora","Banket"
  ],
  Mashonaland_East: [
    "Chikomba","Goromonzi","Marondera","Mudzi","Murehwa","Mutoko","Seke","UMP","Wedza","Hwedza","Macheke","Nyamapanda"
  ],
  Manicaland: [
    "Buhera","Chimanimani","Chipinge","Makoni","Mutare","Mutasa","Nyanga","Rusape","Penhalonga","Chipinge Town","Hauna","Cashel"
  ],
  Midlands: [
    "Chirumhanzu","Gokwe North","Gokwe South","Gweru","Kwekwe","Mberengwa","Shurugwi","Zvishavane","Redcliff","Mvuma","Lalapanzi","Shangani"
  ],
  Masvingo: [
    "Bikita","Chiredzi","Chivi","Gutu","Masvingo","Mwenezi","Zaka","Mashava","Ngundu","Rutenga","Triangle"
  ],
  Matabeleland_North: [
    "Binga","Bubi","Hwange","Lupane","Nkayi","Tsholotsho","Umguza","Victoria Falls","Kamativi","Dete"
  ],
  Matabeleland_South: [
    "Beitbridge","Bulilima","Gwanda","Insiza","Mangwe","Matobo","Umzingwane","Plumtree","Esigodini","Filabusi"
  ],
  Bulawayo: [
    "Bulawayo Central","Bulawayo South","Bulawayo East","Bulawayo West","Mpopoma",
    "Entumbane","Nkulumane","Cowdray Park","Luveve","Matshobana","Mabuthweni"
  ],
};

const CACHE_KEY = "safetap_stations_cache";
const PAGE_SIZE = 15;
const NAV_BOTTOM_PADDING = 64 + 14 + 16;

const EmergencyContacts = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isOnline = useNetworkStatus();
  const { colors, isDark } = useAppTheme();

  const [contacts, setContacts] = useState([]);
  const [displayedContacts, setDisplayedContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [districts, setDistricts] = useState([]);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalContacts, setTotalContacts] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const flatListRef = useRef(null);
  const searchTimeout = useRef(null);

  const hasActiveFilters = !!(searchTerm || selectedProvince || selectedDistrict);

  useEffect(() => { 
    analyticsService.trackFeature("Emergency Contacts");
    fetchFirstPage(); 
  }, []);

  useEffect(() => {
    if (selectedProvince) {
      setDistricts(zimbabweProvinces[selectedProvince] || []);
      setSelectedDistrict("");
    } else {
      setDistricts([]);
      setSelectedDistrict("");
    }
  }, [selectedProvince]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (searchTerm.trim() === "") {
      fetchFirstPage("", selectedProvince, selectedDistrict);
      return;
    }
    setIsSearching(true);
    searchTimeout.current = setTimeout(() => handleSearch(), 400);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchTerm]);

  const loadFromCache = async () => {
    try {
      const fullDir = await offlineContactService.getFullDirectoryOffline();
      if (fullDir && fullDir.length > 0) return fullDir;
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const saveToCache = async (data) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      await offlineContactService.saveFullDirectoryOffline(data);
    } catch (e) { console.log("Cache error", e); }
  };

  const fetchFirstPage = async (searchQuery = "", province = "", district = "") => {
    setLoading(true);
    try {
      let fromCache = false;
      let result;

      const params = { page: 1, page_size: PAGE_SIZE };
      if (searchQuery) params.search = searchQuery;
      if (province) params.province = province.replace(/_/g, " ");

      if (isOnline) {
        try {
          result = await api.policeStations.list(params);
        } catch {
          const cached = await loadFromCache();
          result = { items: cached || [], total: (cached || []).length };
          fromCache = true;
        }
      } else {
        const cached = await loadFromCache();
        result = { items: cached || [], total: (cached || []).length };
        fromCache = true;
      }

      const items = result.items || [];
      setContacts(items);
      setDisplayedContacts(items);
      setTotalContacts(result.total || items.length);
      setCurrentPage(1);
      setHasMore(items.length >= PAGE_SIZE);
      setUsingCachedData(fromCache);

      if (isOnline && !fromCache && !searchQuery && !province && items.length > 0) {
        await saveToCache(items);
      }
    } catch (e) {
      console.log("fetchFirstPage error:", e);
      setContacts([]);
      setDisplayedContacts([]);
      setTotalContacts(0);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const loadMoreContacts = async () => {
    if (!hasMore || loadingMore || isSearching) return;
    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const params = { page: nextPage, page_size: PAGE_SIZE };
      if (searchTerm) params.search = searchTerm;
      if (selectedProvince) params.province = selectedProvince.replace(/_/g, " ");

      const result = await api.policeStations.list(params);
      const newItems = result.items || [];
      const combined = [...displayedContacts, ...newItems];

      setDisplayedContacts(combined);
      setCurrentPage(nextPage);
      setHasMore(newItems.length >= PAGE_SIZE);
    } catch (e) {
      console.log("loadMore error:", e);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSearch = async () => {
    await fetchFirstPage(searchTerm.trim(), selectedProvince, selectedDistrict);
  };

  const applyFilters = async () => {
    await fetchFirstPage(searchTerm, selectedProvince, selectedDistrict);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedProvince("");
    setSelectedDistrict("");
    setShowFilters(false);
    fetchFirstPage();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFirstPage(searchTerm, selectedProvince, selectedDistrict);
    setRefreshing(false);
  };

  const formatText = (text) => {
    if (!text) return "";
    return text.replace(/_/g, " ");
  };

  const saveAllStationsOffline = async () => {
    try {
      setSavingAll(true);
      let allItems = displayedContacts;
      if (isOnline) {
        const res = await api.policeStations.list({ page: 1, page_size: 200 });
        if (res.items && res.items.length > 0) {
          allItems = res.items;
        }
      }
      await saveToCache(allItems);
      for (const item of allItems) {
        await offlineContactService.saveStationOffline({
          id: item.id,
          name: item.name,
          province: item.province,
          district: item.district,
          station_number: item.phone || item.station_number,
          whatsapp_number: item.whatsapp,
          latitude: item.latitude,
          longitude: item.longitude,
          address: item.address,
        });
      }
      Alert.alert(
        "Offline Storage Updated",
        `Successfully saved ${allItems.length} police stations for offline access anywhere in Zimbabwe.`,
        [{ text: "OK" }]
      );
    } catch (err) {
      console.log("saveAllStationsOffline error:", err);
      Alert.alert("Error", "Could not complete offline caching.");
    } finally {
      setSavingAll(false);
    }
  };

  const handleShareStation = async (item, e) => {
    e?.stopPropagation?.();
    try {
      const message = `ZRP Police Station: ${item.name}\nProvince: ${item.province || 'Zimbabwe'}\nDistrict: ${item.district || ''}\nPhone: ${item.phone || item.station_number || 'Emergency 999'}${item.whatsapp ? `\nWhatsApp: ${item.whatsapp}` : ''}\nLocation: https://maps.google.com/?q=${item.latitude},${item.longitude}`;
      await Share.share({
        title: `ZRP ${item.name}`,
        message,
      });
    } catch (error) {
      console.log('Share station error:', error);
    }
  };

  const PATTERN_BG = require("../../assets/images/fallback.png");

  const renderContactItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.contactCard, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      onPress={() =>
        router.push({
          pathname: "/contactDetails",
          params: {
            id: item.id,
            station: item.name,
            province: item.province,
            district: item.district,
            station_number: item.phone || item.station_number,
            whatsapp_number: item.whatsapp,
            latitude: item.latitude,
            longitude: item.longitude,
            address: item.address || "",
          },
        })
      }
      activeOpacity={0.7}
    >
      <View style={styles.contactCardInner}>
        <View style={styles.contactIconWrap}>
          <Image
            source={require("../../assets/images/logo-alternate.png")}
            style={[styles.logoImage, { backgroundColor: colors.sectionBg }]}
          />
        </View>

        <View style={styles.contactInfo}>
          <Text style={[styles.stationName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.district ? `${item.district}, ` : ""}{item.province || "Zimbabwe"}
          </Text>
        </View>

        <View style={{ paddingLeft: 8, justifyContent: "center" }}>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () =>
    loadingMore ? (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingMoreText, { color: colors.textMuted }]}>Loading more stations…</Text>
      </View>
    ) : null;

  const listBottomPadding = NAV_BOTTOM_PADDING + (insets.bottom > 0 ? insets.bottom : 0);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* App Bar (64dp) */}
      <AppHeader
        title="Find & Locate Police Station"
        subtitle="Zimbabwe Republic Police Directory"
        rightActions={[
          {
            iconName: savingAll ? "hourglass-outline" : "cloud-download-outline",
            onPress: saveAllStationsOffline,
          },
          ...(hasActiveFilters
            ? [{ iconName: "refresh-outline", onPress: resetFilters }]
            : [])
        ]}
      />

      {/* Search Bar section with subtle brand pattern overlay */}
      <ImageBackground source={PATTERN_BG} style={[styles.searchSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]} imageStyle={{ opacity: 0.05 }}>
        <View style={[styles.searchBar, { backgroundColor: colors.sectionBg, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search police stations..."
            placeholderTextColor={colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {isSearching || (loading && searchTerm) ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm("")}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setShowFilters((v) => !v)}>
              <Ionicons
                name={showFilters ? "options" : "options-outline"}
                size={20}
                color={showFilters || hasActiveFilters ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </ImageBackground>

      <View style={[styles.container, { backgroundColor: colors.pageBg }]}>
        {/* Status strip */}
        <View style={[styles.statusStrip, { backgroundColor: colors.sectionBg, borderBottomColor: colors.border }]}>
          <View style={styles.statusItem}>
            <Ionicons
              name={isOnline ? "wifi" : "cloud-offline"}
              size={13}
              color={isOnline ? colors.success : colors.textMuted}
            />
            <Text style={[styles.statusText, { color: isOnline ? colors.success : colors.textMuted }]}>
              {isOnline ? "System Online" : "Offline Access Ready"}
            </Text>
          </View>
          {displayedContacts.length > 0 && (
            <View style={styles.statusItem}>
              <Ionicons name="location" size={13} color={colors.primary} />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                {displayedContacts.length} / {totalContacts} Stations
              </Text>
            </View>
          )}
        </View>

        {/* Filter Panel */}
        {showFilters && (
          <View style={[styles.filtersPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.filtersHeader}>
              <Text style={[styles.filtersTitle, { color: colors.primary }]}>Filter Stations by Region</Text>
              <TouchableOpacity onPress={resetFilters} style={[styles.resetBtn, { backgroundColor: colors.sectionBg }]}>
                <MaterialIcons name="refresh" size={16} color={colors.primary} />
                <Text style={[styles.resetBtnText, { color: colors.primary }]}>Reset</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.filterLabel, { color: colors.primary }]}>Province</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
              <TouchableOpacity
                style={[styles.pill, { backgroundColor: colors.sectionBg, borderColor: colors.border }, !selectedProvince && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setSelectedProvince("")}
              >
                <Text style={[styles.pillText, { color: colors.textSecondary }, !selectedProvince && { color: "#FFFFFF" }]}>All</Text>
              </TouchableOpacity>
              {Object.keys(zimbabweProvinces).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.pill, { backgroundColor: colors.sectionBg, borderColor: colors.border }, selectedProvince === p && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setSelectedProvince(p)}
                >
                  <Text style={[styles.pillText, { color: colors.textSecondary }, selectedProvince === p && { color: "#FFFFFF" }]}>
                    {formatText(p)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={applyFilters}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* List Content */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#0052CC" />
            <Text style={styles.centeredText}>Loading police stations…</Text>
          </View>
        ) : displayedContacts.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="search-outline" size={48} color="#CBD5E0" />
            <Text style={styles.emptyTitle}>No police stations found</Text>
            <Text style={styles.emptySubtitle}>
              {hasActiveFilters ? "Try adjusting your search query or province filter" : "No station records available"}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity style={styles.emptyResetBtn} onPress={resetFilters}>
                <Text style={styles.emptyResetText}>Reset Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayedContacts}
            renderItem={renderContactItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMoreContacts}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#0052CC"]}
                tintColor="#0052CC"
              />
            }
            contentContainerStyle={{ paddingBottom: listBottomPadding }}
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: "#D97706",
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSub: {
    fontSize: 11,
    color: "#D97706",
    fontWeight: "600",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#2D3748",
    paddingVertical: 0,
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  statusStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F1F5F9",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  searchSection: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.component,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    height: componentHeights.search,
    borderRadius: radius.input,
    backgroundColor: colors.sectionBg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.cardSpacing,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  statusSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.micro,
    backgroundColor: colors.sectionBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  filtersPanel: {
    backgroundColor: colors.neutral.white,
    padding: spacing.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filtersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.component,
  },
  filtersTitle: {
    ...typography.subtitle,
    color: colors.primary,
    fontWeight: "700",
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.sectionBg,
    paddingHorizontal: spacing.component,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  resetBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
  filterLabel: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: spacing.micro,
  },
  pillScroll: { marginBottom: 4 },
  pill: {
    paddingHorizontal: spacing.cardSpacing,
    paddingVertical: 8,
    backgroundColor: colors.sectionBg,
    borderRadius: radius.chip,
    marginRight: spacing.micro,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  pillTextActive: {
    color: colors.neutral.white,
    fontWeight: "600",
  },
  applyBtn: {
    backgroundColor: colors.primary,
    height: componentHeights.defaultButton,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.cardSpacing,
  },
  applyBtnText: {
    ...typography.button,
    color: colors.neutral.white,
  },
  contactCard: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  contactCardInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  contactIconWrap: { marginRight: 12 },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.sectionBg,
  },
  contactInfo: { flex: 1, marginRight: 8 },
  contactMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 6,
  },
  badgeCode: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeCodeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },
  phoneSubText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  stationName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  locationText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconActionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    alignItems: "center",
  },
  callActionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  goldCodeBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#B45309",
  },

  callCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  footerLoader: {
    paddingVertical: spacing.cardSpacing,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  loadingMoreText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.section,
  },
  centeredText: {
    marginTop: spacing.component,
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginTop: spacing.cardSpacing,
    marginBottom: 6,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.screenPadding,
  },
  emptyResetBtn: {
    paddingHorizontal: spacing.screenPadding,
    height: componentHeights.smallButton,
    backgroundColor: colors.sectionBg,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyResetText: {
    ...typography.button,
    fontSize: 14,
    color: colors.primary,
  },
});

export default EmergencyContacts;
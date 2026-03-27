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
  Platform,
} from "react-native";
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import pb from "../../lib/connection";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import useNetworkStatus from "../hooks/useNetworkStatus";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

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

const CACHE_KEY            = "emergencyContacts";
const CACHE_TIMESTAMP_KEY  = "emergencyContactsTimestamp";
const CACHE_EXPIRY_TIME    = 24 * 60 * 60 * 1000;
const PAGE_SIZE            = 15;

// Bottom padding: floating pill (64) + margin from bottom (14) + safe area + breathing room
const NAV_BOTTOM_PADDING = 64 + 14 + 16;

const EmergencyContacts = () => {
  const router       = useRouter();
  const insets       = useSafeAreaInsets();
  const isOnline     = useNetworkStatus();

  const [contacts,          setContacts]          = useState([]);
  const [displayedContacts, setDisplayedContacts] = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [loadingMore,       setLoadingMore]       = useState(false);
  const [savingAll,         setSavingAll]         = useState(false);
  const [searchTerm,        setSearchTerm]        = useState("");
  const [selectedProvince,  setSelectedProvince]  = useState("");
  const [selectedDistrict,  setSelectedDistrict]  = useState("");
  const [districts,         setDistricts]         = useState([]);
  const [usingCachedData,   setUsingCachedData]   = useState(false);
  const [showFilters,       setShowFilters]       = useState(false);
  const [refreshing,        setRefreshing]        = useState(false);
  const [currentPage,       setCurrentPage]       = useState(1);
  const [hasMore,           setHasMore]           = useState(true);
  const [totalContacts,     setTotalContacts]     = useState(0);
  const [isSearching,       setIsSearching]       = useState(false);

  const flatListRef     = useRef(null);
  const searchTimeout   = useRef(null);

  const hasActiveFilters = !!(searchTerm || selectedProvince || selectedDistrict);

  useEffect(() => { fetchFirstPage(); }, []);

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
    searchTimeout.current = setTimeout(() => handleSearch(), 500);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchTerm]);

  // ─── Cache helpers ──────────────────────────────────────────────────────────
  const loadFromCache = async () => {
    try {
      const [raw, ts] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEY),
        AsyncStorage.getItem(CACHE_TIMESTAMP_KEY),
      ]);
      if (!raw || !ts) return null;
      const expired = Date.now() - parseInt(ts, 10) > CACHE_EXPIRY_TIME;
      if (!expired || !isOnline) return JSON.parse(raw);
      return null;
    } catch { return null; }
  };

  const saveToCache = async (data) => {
    try {
      await AsyncStorage.multiSet([
        [CACHE_KEY, JSON.stringify(data)],
        [CACHE_TIMESTAMP_KEY, Date.now().toString()],
      ]);
    } catch (e) { console.error("Cache save error", e); }
  };

  // ─── Save ALL contacts offline ──────────────────────────────────────────────
  const saveAllOffline = async () => {
    if (!isOnline) {
      Alert.alert("Offline", "You need an internet connection to download all contacts.");
      return;
    }
    try {
      setSavingAll(true);
      // Fetch every record (no pagination limit)
      const all = await pb.collection("contacts").getFullList({ sort: "station" });
      await saveToCache(all);
      Alert.alert(
        "Saved Offline",
        `${all.length} police stations saved. You can now browse them without internet.`
      );
    } catch (e) {
      console.error("Save all failed:", e);
      Alert.alert("Error", "Could not download all contacts. Please try again.");
    } finally {
      setSavingAll(false);
    }
  };

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const buildResultFromCache = async (searchQuery, province, district) => {
    const cached = await loadFromCache();
    if (!cached) return { items: [], totalItems: 0 };
    let data = cached;
    if (searchQuery) {
      const t = searchQuery.toLowerCase();
      data = data.filter(c =>
        c.station?.toLowerCase().includes(t) ||
        c.member_in_charge?.toLowerCase().includes(t) ||
        c.specialty?.toLowerCase().includes(t)
      );
    }
    if (province) data = data.filter(c => c.province === province);
    if (district) data = data.filter(c => c.district === district);
    return { items: data.slice(0, PAGE_SIZE), totalItems: data.length, _all: data };
  };

  const fetchFirstPage = async (searchQuery = "", province = "", district = "") => {
    setLoading(true);
    try {
      let fromCache = false;
      let resultList;

      if (isOnline) {
        try {
          const filters = [];
          if (searchQuery) filters.push(`(station~"${searchQuery}" || member_in_charge~"${searchQuery}" || specialty~"${searchQuery}")`);
          if (province)     filters.push(`province="${province}"`);
          if (district)     filters.push(`district="${district.toUpperCase()}"`);

          resultList = await pb.collection("contacts").getList(1, PAGE_SIZE, {
            sort: "station",
            ...(filters.length > 0 && { filter: filters.join(" && ") }),
          });
        } catch {
          const r = await buildResultFromCache(searchQuery, province, district);
          resultList = { items: r.items, totalItems: r.totalItems };
          fromCache = true;
        }
      } else {
        const r = await buildResultFromCache(searchQuery, province, district);
        resultList = { items: r.items, totalItems: r.totalItems };
        fromCache = true;
      }

      const items = resultList.items ?? [];
      setContacts(items);
      setDisplayedContacts(items);
      setTotalContacts(resultList.totalItems ?? items.length);
      setCurrentPage(1);
      setHasMore(items.length >= PAGE_SIZE && (resultList.totalItems ?? 0) > PAGE_SIZE);
      setUsingCachedData(fromCache);

      // Auto-cache first page when doing a clean unfiltered fetch
      if (isOnline && !fromCache && !searchQuery && !province && !district && items.length > 0) {
        await saveToCache(items);
      }
    } catch (e) {
      console.error("fetchFirstPage error:", e);
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

      if (hasActiveFilters) {
        const { _all = [] } = await buildResultFromCache(searchTerm, selectedProvince, selectedDistrict);
        const more = _all.slice(currentPage * PAGE_SIZE, nextPage * PAGE_SIZE);
        const next = [...displayedContacts, ...more];
        setDisplayedContacts(next);
        setCurrentPage(nextPage);
        setHasMore(next.length < _all.length);
      } else {
        let resultList;
        if (isOnline && !usingCachedData) {
          try {
            resultList = await pb.collection("contacts").getList(nextPage, PAGE_SIZE, { sort: "station" });
          } catch {
            const cached = await loadFromCache() ?? [];
            resultList = { items: cached.slice((nextPage - 1) * PAGE_SIZE, nextPage * PAGE_SIZE), totalItems: cached.length };
            setUsingCachedData(true);
          }
        } else {
          const cached = await loadFromCache() ?? [];
          resultList = { items: cached.slice((nextPage - 1) * PAGE_SIZE, nextPage * PAGE_SIZE), totalItems: cached.length };
        }
        const next = [...displayedContacts, ...(resultList.items ?? [])];
        setDisplayedContacts(next);
        setCurrentPage(nextPage);
        setHasMore(next.length < (resultList.totalItems ?? 0));
      }
    } catch (e) {
      console.error("loadMore error:", e);
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
    setShowFilters(false); // ← auto-close filter panel after applying
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

  const formatText = (text, upper = false) => {
    if (!text) return "";
    if (upper) return text.toUpperCase();
    return text.replace(/_/g, " ").split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────
  const renderContactItem = ({ item }) => (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={() => router.push({
        pathname: "/contactDetails",
        params: {
          id: item.id,
          station: item.station,
          province: item.province,
          district: item.district,
          station_number: item.station_number,
          whatsapp_number: item.whatsapp_number,
          member_in_charge: formatText(item.member_in_charge),
          member_in_charge_number: item.member_in_charge_number,
          specialty: formatText(item.specialty),
        },
      })}
      activeOpacity={0.8}
    >
      <View style={styles.contactIconWrap}>
        <Image
          source={require("../../assets/images/logo-alternate.png")}
          style={styles.logoImage}
        />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.stationName} numberOfLines={1}>{formatText(item.station)}</Text>
        <Text style={styles.locationText} numberOfLines={1}>
          {formatText(item.district, true)}, {formatText(item.province)}
        </Text>
        {item.member_in_charge && (
          <Text style={styles.inChargeText} numberOfLines={1}>{formatText(item.member_in_charge)}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
    </TouchableOpacity>
  );

  const renderFooter = () =>
    loadingMore ? (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#1E3A8A" />
        <Text style={styles.loadingMoreText}>Loading more stations…</Text>
      </View>
    ) : null;

  // Bottom padding accounts for the floating pill nav bar
  const listBottomPadding = NAV_BOTTOM_PADDING + (insets.bottom > 0 ? insets.bottom : 0);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerInner}>
          <View>
            <Text style={styles.headerTitle}>Police Stations</Text>
            <Text style={styles.headerSub}>Zimbabwe Republic Police</Text>
          </View>
          <View style={styles.headerActions}>
            {/* Save all offline */}
            <TouchableOpacity
              onPress={saveAllOffline}
              style={styles.headerBtn}
              disabled={savingAll}
            >
              {savingAll ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="cloud-download-outline" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            {/* Reset filters — only visible when filters are active */}
            {hasActiveFilters && (
              <TouchableOpacity onPress={resetFilters} style={styles.headerBtn}>
                <MaterialIcons name="filter-list-off" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search bar lives inside the header */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#718096" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search police stations…"
            placeholderTextColor="#A0AEC0"
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {isSearching || (loading && searchTerm) ? (
            <ActivityIndicator size="small" color="#1E3A8A" />
          ) : searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm("")}>
              <Ionicons name="close-circle" size={18} color="#CBD5E0" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setShowFilters(v => !v)}>
              <Ionicons
                name={showFilters ? "filter" : "filter-outline"}
                size={18}
                color={showFilters || hasActiveFilters ? "#1E3A8A" : "#718096"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.container}>
        {/* ── Status strip ── */}
        <View style={styles.statusStrip}>
          <View style={styles.statusItem}>
            <Ionicons
              name={isOnline ? "wifi" : "cloud-offline"}
              size={13}
              color={isOnline ? "#10B981" : "#9CA3AF"}
            />
            <Text style={[styles.statusText, { color: isOnline ? "#10B981" : "#9CA3AF" }]}>
              {isOnline ? "Online" : "Offline"}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <MaterialIcons
              name={usingCachedData ? "cached" : "cloud-done"}
              size={13}
              color="#1E3A8A"
            />
            <Text style={styles.statusText}>
              {usingCachedData ? "Cached" : "Live"}
            </Text>
          </View>
          {displayedContacts.length > 0 && (
            <View style={styles.statusItem}>
              <Ionicons name="location" size={13} color="#1E3A8A" />
              <Text style={styles.statusText}>
                {displayedContacts.length} / {totalContacts}
              </Text>
            </View>
          )}
        </View>

        {/* ── Filter panel ── */}
        {showFilters && (
          <View style={styles.filtersPanel}>
            <View style={styles.filtersHeader}>
              <Text style={styles.filtersTitle}>Filter Stations</Text>
              <TouchableOpacity onPress={resetFilters} style={styles.resetBtn}>
                <MaterialIcons name="refresh" size={16} color="#1E3A8A" />
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.filterLabel}>Province</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
              <TouchableOpacity
                style={[styles.pill, !selectedProvince && styles.pillActive]}
                onPress={() => setSelectedProvince("")}
              >
                <Text style={[styles.pillText, !selectedProvince && styles.pillTextActive]}>All</Text>
              </TouchableOpacity>
              {Object.keys(zimbabweProvinces).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.pill, selectedProvince === p && styles.pillActive]}
                  onPress={() => setSelectedProvince(p)}
                >
                  <Text style={[styles.pillText, selectedProvince === p && styles.pillTextActive]}>
                    {formatText(p)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedProvince && districts.length > 0 && (
              <>
                <Text style={[styles.filterLabel, { marginTop: 12 }]}>District</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                  <TouchableOpacity
                    style={[styles.pill, !selectedDistrict && styles.pillActive]}
                    onPress={() => setSelectedDistrict("")}
                  >
                    <Text style={[styles.pillText, !selectedDistrict && styles.pillTextActive]}>All</Text>
                  </TouchableOpacity>
                  {districts.map(d => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.pill, selectedDistrict === d && styles.pillActive]}
                      onPress={() => setSelectedDistrict(d)}
                    >
                      <Text style={[styles.pillText, selectedDistrict === d && styles.pillTextActive]}>
                        {formatText(d, true)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Content ── */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={styles.centeredText}>Loading police stations…</Text>
          </View>
        ) : displayedContacts.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="search-outline" size={48} color="#CBD5E0" />
            <Text style={styles.emptyTitle}>No stations found</Text>
            <Text style={styles.emptySubtitle}>
              {hasActiveFilters ? "Try adjusting your search or filters" : "No data available"}
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
                colors={["#1E3A8A"]}
                tintColor="#1E3A8A"
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
  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: "#1E3A8A",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  headerSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
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

  // Search bar inside header
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

  // ── Container ────────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // ── Status strip ─────────────────────────────────────────────────────────────
  statusStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 7,
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
    fontWeight: "500",
    color: "#4B5563",
  },

  // ── Filter panel ─────────────────────────────────────────────────────────────
  filtersPanel: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  filtersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  filtersTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  resetBtnText: {
    fontSize: 12,
    color: "#1E3A8A",
    fontWeight: "600",
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  pillScroll: {
    marginBottom: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pillActive: {
    backgroundColor: "#1E3A8A",
    borderColor: "#1E3A8A",
  },
  pillText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  pillTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  applyBtn: {
    backgroundColor: "#1E3A8A",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16,
  },
  applyBtnText: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // ── Contact card ─────────────────────────────────────────────────────────────
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  contactIconWrap: {
    marginRight: 12,
  },
  logoImage: {
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  contactInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  locationText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 2,
  },
  inChargeText: {
    fontSize: 11.5,
    color: "#1E3A8A",
    fontStyle: "italic",
  },

  // ── States ───────────────────────────────────────────────────────────────────
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  centeredText: {
    marginTop: 12,
    fontSize: 14,
    color: "#94A3B8",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#475569",
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyResetBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  emptyResetText: {
    fontSize: 14,
    color: "#1E3A8A",
    fontWeight: "600",
  },
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 12,
    color: "#94A3B8",
  },
});

export default EmergencyContacts;
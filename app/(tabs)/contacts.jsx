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
  StatusBar,
  StyleSheet,
  Dimensions,
  Alert,
  Modal,
  RefreshControl,
} from "react-native";
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import pb from "../../lib/connection";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import useNetworkStatus from "../hooks/useNetworkStatus";

const { width } = Dimensions.get("window");

// Updated Zimbabwe provinces and districts
const zimbabweProvinces = {
  Harare: [
    "Harare Central", "Harare South", "Harare East", "Harare West",
    "Harare North", "Mbare", "Highfield", "Kuwadzana", "Dzivarasekwa",
    "Budiriro", "Glen View", "Epworth"
  ],
  Mashonaland_Central: [
    "Bindura", "Guruve", "Mazowe", "Mbire", "Mount Darwin",
    "Muzarabani", "Rushinga", "Shamva", "Centenary", "Concession"
  ],
  Mashonaland_West: [
    "Chegutu", "Hurungwe", "Kariba", "Makonde", "Mhondoro-Ngezi",
    "Zvimba", "Sanyati", "Kadoma", "Chinhoyi", "Raffingora", "Banket"
  ],
  Mashonaland_East: [
    "Chikomba", "Goromonzi", "Marondera", "Mudzi", "Murehwa",
    "Mutoko", "Seke", "UMP", "Wedza", "Hwedza", "Macheke", "Nyamapanda"
  ],
  Manicaland: [
    "Buhera", "Chimanimani", "Chipinge", "Makoni", "Mutare",
    "Mutasa", "Nyanga", "Rusape", "Penhalonga", "Chipinge Town",
    "Hauna", "Cashel"
  ],
  Midlands: [
    "Chirumhanzu", "Gokwe North", "Gokwe South", "Gweru",
    "Kwekwe", "Mberengwa", "Shurugwi", "Zvishavane", "Redcliff",
    "Mvuma", "Lalapanzi", "Shangani"
  ],
  Masvingo: [
    "Bikita", "Chiredzi", "Chivi", "Gutu", "Masvingo",
    "Mwenezi", "Zaka", "Mashava", "Ngundu", "Rutenga", "Triangle"
  ],
  Matabeleland_North: [
    "Binga", "Bubi", "Hwange", "Lupane", "Nkayi",
    "Tsholotsho", "Umguza", "Victoria Falls", "Kamativi", "Dete"
  ],
  Matabeleland_South: [
    "Beitbridge", "Bulilima", "Gwanda", "Insiza", "Mangwe",
    "Matobo", "Umzingwane", "Plumtree", "Esigodini", "Filabusi"
  ],
  Bulawayo: [
    "Bulawayo Central", "Bulawayo South", "Bulawayo East",
    "Bulawayo West", "Mpopoma", "Entumbane", "Nkulumane",
    "Cowdray Park", "Luveve", "Matshobana", "Mabuthweni"
  ],
  Matebebeland: [
    "All Districts"
  ]
};

const CACHE_KEY = "emergencyContacts";
const CACHE_TIMESTAMP_KEY = "emergencyContactsTimestamp";
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours
const PAGE_SIZE = 15;

const EmergencyContacts = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [displayedContacts, setDisplayedContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
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
  const searchTimeoutRef = useRef(null);
  const isOnline = useNetworkStatus();

  useEffect(() => {
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

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.trim() === "") {
      // If search is cleared, reset to original filtered contacts
      if (selectedProvince || selectedDistrict) {
        fetchFirstPage("", selectedProvince, selectedDistrict);
      } else {
        fetchFirstPage();
      }
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch();
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const loadFromCache = async () => {
    try {
      const cachedContacts = await AsyncStorage.getItem(CACHE_KEY);
      const cacheTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (cachedContacts && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp, 10);
        const now = Date.now();

        if (now - timestamp < CACHE_EXPIRY_TIME) {
          return JSON.parse(cachedContacts);
        } else if (!isOnline) {
          return JSON.parse(cachedContacts);
        }
      }
      return null;
    } catch (error) {
      console.error("Error loading from cache:", error);
      return null;
    }
  };

  const saveToCache = async (data) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  };

  const fetchFirstPage = async (searchQuery = "", province = "", district = "") => {
    setLoading(true);
    try {
      const queryParams = {
        sort: "station",
        page: 1,
        perPage: PAGE_SIZE,
      };

      // Build filter query
      let filterQuery = "";
      const filters = [];
      
      if (searchQuery) {
        filters.push(`(station~"${searchQuery}" || member_in_charge~"${searchQuery}" || specialty~"${searchQuery}")`);
      }
      
      if (province) {
        filters.push(`province="${province}"`);
      }
      
      if (district) {
        filters.push(`district="${district}"`);
      }
      
      if (filters.length > 0) {
        filterQuery = filters.join(" && ");
        queryParams.filter = filterQuery;
      }

      let resultList;
      let fromCache = false;
      
      if (isOnline) {
        try {
          // Try to fetch from API when online
          resultList = await pb.collection("contacts").getList(
            queryParams.page,
            queryParams.perPage,
            queryParams
          );
        } catch (error) {
          console.log("API fetch failed, trying cache...", error);
          // If API fails, try cache
          const cachedData = await loadFromCache();
          if (cachedData) {
            fromCache = true;
            // Filter cached data locally
            let filteredData = cachedData;
            
            if (searchQuery) {
              const term = searchQuery.toLowerCase();
              filteredData = filteredData.filter(
                (contact) =>
                  contact.station?.toLowerCase().includes(term) ||
                  contact.member_in_charge?.toLowerCase().includes(term) ||
                  contact.specialty?.toLowerCase().includes(term)
              );
            }
            
            if (province) {
              filteredData = filteredData.filter(
                (contact) => contact.province === province
              );
            }
            
            if (district) {
              filteredData = filteredData.filter(
                (contact) => contact.district === district
              );
            }
            
            resultList = {
              items: filteredData.slice(0, PAGE_SIZE),
              totalItems: filteredData.length,
              page: 1,
              perPage: PAGE_SIZE,
              totalPages: Math.ceil(filteredData.length / PAGE_SIZE)
            };
          } else {
            resultList = { items: [], totalItems: 0, page: 1, perPage: PAGE_SIZE, totalPages: 0 };
          }
        }
      } else {
        // When offline, try cache
        const cachedData = await loadFromCache();
        if (cachedData) {
          fromCache = true;
          // Filter cached data locally
          let filteredData = cachedData;
          
          if (searchQuery) {
            const term = searchQuery.toLowerCase();
            filteredData = filteredData.filter(
              (contact) =>
                contact.station?.toLowerCase().includes(term) ||
                contact.member_in_charge?.toLowerCase().includes(term) ||
                contact.specialty?.toLowerCase().includes(term)
            );
          }
          
          if (province) {
            filteredData = filteredData.filter(
              (contact) => contact.province === province
            );
          }
          
          if (district) {
            filteredData = filteredData.filter(
              (contact) => contact.district === district
            );
          }
          
          resultList = {
            items: filteredData.slice(0, PAGE_SIZE),
            totalItems: filteredData.length,
            page: 1,
            perPage: PAGE_SIZE,
            totalPages: Math.ceil(filteredData.length / PAGE_SIZE)
          };
        } else {
          resultList = { items: [], totalItems: 0, page: 1, perPage: PAGE_SIZE, totalPages: 0 };
        }
      }

      const newContacts = resultList.items;
      setContacts(newContacts);
      setFilteredContacts(newContacts);
      setDisplayedContacts(newContacts);
      setTotalContacts(resultList.totalItems);
      setCurrentPage(1);
      setHasMore(newContacts.length >= PAGE_SIZE && resultList.totalItems > PAGE_SIZE);
      setUsingCachedData(fromCache);

      if (isOnline && newContacts.length > 0 && !searchQuery && !province && !district && !fromCache) {
        await saveToCache(newContacts);
      }

    } catch (error) {
      console.error("Failed to fetch first page:", error);
      // Don't show error, just set empty state
      setContacts([]);
      setFilteredContacts([]);
      setDisplayedContacts([]);
      setTotalContacts(0);
      setUsingCachedData(false);
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
      const startIndex = currentPage * PAGE_SIZE;
      
      if (searchTerm || selectedProvince || selectedDistrict) {
        // For filtered data, load more from current filtered set
        const allFilteredData = await getAllFilteredData();
        const moreContacts = allFilteredData.slice(startIndex, startIndex + PAGE_SIZE);
        
        const newContacts = [...displayedContacts, ...moreContacts];
        setDisplayedContacts(newContacts);
        setCurrentPage(nextPage);
        setHasMore(allFilteredData.length > newContacts.length);
      } else {
        // For non-filtered data, fetch from API or cache
        const queryParams = {
          sort: "station",
          page: nextPage,
          perPage: PAGE_SIZE,
        };

        let resultList;
        if (isOnline && !usingCachedData) {
          try {
            resultList = await pb.collection("contacts").getList(
              queryParams.page,
              queryParams.perPage,
              queryParams
            );
          } catch (error) {
            console.log("API fetch failed for more contacts, using cache...");
            const cachedData = await loadFromCache();
            if (cachedData) {
              const startIdx = (nextPage - 1) * PAGE_SIZE;
              const endIdx = startIdx + PAGE_SIZE;
              resultList = {
                items: cachedData.slice(startIdx, endIdx),
                totalItems: cachedData.length,
                page: nextPage,
                perPage: PAGE_SIZE,
                totalPages: Math.ceil(cachedData.length / PAGE_SIZE)
              };
              setUsingCachedData(true);
            } else {
              resultList = { items: [], totalItems: 0, page: nextPage, perPage: PAGE_SIZE, totalPages: 0 };
            }
          }
        } else {
          const cachedData = await loadFromCache();
          if (cachedData) {
            const startIdx = (nextPage - 1) * PAGE_SIZE;
            const endIdx = startIdx + PAGE_SIZE;
            resultList = {
              items: cachedData.slice(startIdx, endIdx),
              totalItems: cachedData.length,
              page: nextPage,
              perPage: PAGE_SIZE,
              totalPages: Math.ceil(cachedData.length / PAGE_SIZE)
            };
            setUsingCachedData(true);
          } else {
            resultList = { items: [], totalItems: 0, page: nextPage, perPage: PAGE_SIZE, totalPages: 0 };
          }
        }

        const newContacts = [...contacts, ...resultList.items];
        setContacts(newContacts);
        setFilteredContacts(newContacts);
        setDisplayedContacts(newContacts);
        setCurrentPage(nextPage);
        setHasMore(newContacts.length < resultList.totalItems);

        if (isOnline && resultList.items.length > 0 && !usingCachedData) {
          await saveToCache(newContacts);
        }
      }

    } catch (error) {
      console.error("Failed to load more:", error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const getAllFilteredData = async () => {
    // Get all filtered data from cache or API
    const cachedData = await loadFromCache();
    if (cachedData) {
      let filteredData = cachedData;
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredData = filteredData.filter(
          (contact) =>
            contact.station?.toLowerCase().includes(term) ||
            contact.member_in_charge?.toLowerCase().includes(term) ||
            contact.specialty?.toLowerCase().includes(term)
        );
      }
      
      if (selectedProvince) {
        filteredData = filteredData.filter(
          (contact) => contact.province === selectedProvince
        );
      }
      
      if (selectedDistrict) {
        filteredData = filteredData.filter(
          (contact) => contact.district === selectedDistrict
        );
      }
      
      return filteredData;
    }
    
    // If no cache, return current filtered contacts
    return filteredContacts;
  };

  const handleSearch = async () => {
    const query = searchTerm.trim();
    await fetchFirstPage(query, selectedProvince, selectedDistrict);
  };

  const applyFilters = async () => {
    await fetchFirstPage(searchTerm, selectedProvince, selectedDistrict);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedProvince("");
    setSelectedDistrict("");
    fetchFirstPage();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFirstPage(searchTerm, selectedProvince, selectedDistrict);
    setRefreshing(false);
  };

  const formatText = (text, isDistrict = false) => {
    if (!text) return "";
    
    // Convert to uppercase for districts when searching
    if (isDistrict && (searchTerm || selectedProvince || selectedDistrict)) {
      return text.toUpperCase();
    }
    
    // Normal formatting for other cases
    return text
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

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
      <View style={styles.contactIcon}>
        <Image
          source={require("../../assets/images/logo-alternate.png")}
          style={styles.logoImage}
        />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.stationName} numberOfLines={1}>
          {formatText(item.station)}
        </Text>
        <Text style={styles.locationText} numberOfLines={1}>
          {formatText(item.district, true)}, {formatText(item.province)}
        </Text>
        {item.member_in_charge && (
          <Text style={styles.inChargeText} numberOfLines={1}>
            {formatText(item.member_in_charge)}
          </Text>
        )}
      </View>
      <View style={styles.contactArrow}>
        <Ionicons name="chevron-forward" size={20} color="#a0aec0" />
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#1E3A8A" />
        <Text style={styles.loadingMoreText}>Loading more stations...</Text>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Simple Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Police Stations</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#718096" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search police stations..."
              placeholderTextColor="#a0aec0"
              value={searchTerm}
              onChangeText={setSearchTerm}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {(isSearching || loading) ? (
              <ActivityIndicator size="small" color="#1E3A8A" />
            ) : searchTerm ? (
              <TouchableOpacity onPress={() => setSearchTerm("")}>
                <Ionicons name="close-circle" size={20} color="#cbd5e0" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
                <Ionicons 
                  name="filter" 
                  size={20} 
                  color={showFilters ? "#1E3A8A" : "#718096"} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Status Bar */}
        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            <Ionicons 
              name={isOnline ? "wifi" : "cloud-offline"} 
              size={14} 
              color={isOnline ? "#10B981" : "#6B7280"} 
            />
            <Text style={[styles.statusText, { color: isOnline ? "#10B981" : "#6B7280" }]}>
              {isOnline ? "Online" : "Offline"}
            </Text>
          </View>
          
          <View style={styles.statusItem}>
            <MaterialIcons 
              name={usingCachedData ? "cached" : "cloud-done"} 
              size={14} 
              color="#1E3A8A" 
            />
            <Text style={styles.statusText}>
              {usingCachedData ? "Cached Data" : "Live Data"}
            </Text>
          </View>
          
          {displayedContacts.length > 0 && (
            <View style={styles.statusItem}>
              <Ionicons name="location" size={14} color="#1E3A8A" />
              <Text style={styles.statusText}>
                {displayedContacts.length} of {totalContacts}
              </Text>
            </View>
          )}
        </View>

        {/* Filters Panel */}
        {showFilters && (
          <View style={styles.filtersPanel}>
            <Text style={styles.filterLabel}>Filter by Province</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
            >
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  !selectedProvince && styles.filterPillActive,
                ]}
                onPress={() => setSelectedProvince("")}
              >
                <Text style={[
                  styles.filterPillText,
                  !selectedProvince && styles.filterPillTextActive,
                ]}>
                  All
                </Text>
              </TouchableOpacity>
              {Object.keys(zimbabweProvinces).map((province) => (
                <TouchableOpacity
                  key={province}
                  style={[
                    styles.filterPill,
                    selectedProvince === province && styles.filterPillActive,
                  ]}
                  onPress={() => setSelectedProvince(province)}
                >
                  <Text style={[
                    styles.filterPillText,
                    selectedProvince === province && styles.filterPillTextActive,
                  ]}>
                    {formatText(province)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedProvince && districts.length > 0 && (
              <>
                <Text style={[styles.filterLabel, { marginTop: 12 }]}>Filter by District</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterScroll}
                >
                  <TouchableOpacity
                    style={[
                      styles.filterPill,
                      !selectedDistrict && styles.filterPillActive,
                    ]}
                    onPress={() => setSelectedDistrict("")}
                  >
                    <Text style={[
                      styles.filterPillText,
                      !selectedDistrict && styles.filterPillTextActive,
                    ]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {districts.map((district) => (
                    <TouchableOpacity
                      key={district}
                      style={[
                        styles.filterPill,
                        selectedDistrict === district && styles.filterPillActive,
                      ]}
                      onPress={() => setSelectedDistrict(district)}
                    >
                      <Text style={[
                        styles.filterPillText,
                        selectedDistrict === district && styles.filterPillTextActive,
                      ]}>
                        {formatText(district, true)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={styles.loadingText}>Loading police stations...</Text>
          </View>
        ) : displayedContacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color="#cbd5e0" />
            <Text style={styles.emptyTitle}>No stations found</Text>
            <Text style={styles.emptySubtitle}>
              {searchTerm || selectedProvince || selectedDistrict
                ? "Try adjusting your search or filters"
                : "No data available"}
            </Text>
            {(searchTerm || selectedProvince || selectedDistrict) && (
              <TouchableOpacity style={styles.emptyButton} onPress={clearFilters}>
                <Text style={styles.emptyButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayedContacts}
            renderItem={renderContactItem}
            keyExtractor={(item) => item.id}
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
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  // Simple Header
  header: {
    backgroundColor: "#1E3A8A",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerRight: {
    width: 40,
  },

  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  searchContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7fafc",
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#2d3748",
    paddingVertical: 8,
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
    color: "#4B5563",
  },
  filtersPanel: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4a5568",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#f7fafc",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterPillActive: {
    backgroundColor: "#1E3A8A",
    borderColor: "#1E3A8A",
  },
  filterPillText: {
    fontSize: 13,
    color: "#718096",
    fontWeight: "500",
  },
  filterPillTextActive: {
    color: "#fff",
  },
  applyButton: {
    backgroundColor: "#1E3A8A",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  applyButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  listContainer: {
    paddingBottom: 20,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    // marginHorizontal: 16,
    // marginTop: 8,
    padding: 14,
    // borderRadius: 10,
    borderWidth: 0.4,
    borderColor: "#e2e8f0",
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 1 },
    // shadowOpacity: 0.05,
    // shadowRadius: 2,
    elevation: 1,
  },
  contactIcon: {
    marginRight: 12,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  contactInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2d3748",
    marginBottom: 2,
  },
  locationText: {
    fontSize: 12,
    color: "#718096",
    marginBottom: 2,
    fontWeight: "500",
  },
  inChargeText: {
    fontSize: 11,
    color: "#1E3A8A",
    fontStyle: "italic",
  },
  contactArrow: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#718096",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4a5568",
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#a0aec0",
    textAlign: "center",
    marginBottom: 16,
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#f7fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyButtonText: {
    fontSize: 14,
    color: "#1E3A8A",
    fontWeight: "600",
  },
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  loadingMoreText: {
    fontSize: 12,
    color: "#718096",
    marginLeft: 8,
  },
});

export default EmergencyContacts;
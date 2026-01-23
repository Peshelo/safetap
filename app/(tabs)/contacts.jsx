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
import CustomHeader from "../components/Header";
import { useNavigation } from "@react-navigation/native";
import useNetworkStatus from "../hooks/useNetworkStatus";

const { width } = Dimensions.get("window");

// Zimbabwe provinces and districts
const zimbabweProvinces = {
  Bulawayo: ["Bulawayo"],
  Harare: ["Harare"],
  Manicaland: [
    "Buhera",
    "Chimanimani",
    "Chipinge",
    "Makoni",
    "Mutare",
    "Mutasa",
    "Nyanga",
  ],
  "Mashonaland Central": [
    "Bindura",
    "Guruve",
    "Mazowe",
    "Mbire",
    "Mount Darwin",
    "Muzarabani",
    "Rushinga",
    "Shamva",
  ],
  "Mashonaland East": [
    "Chikomba",
    "Goromonzi",
    "Marondera",
    "Mudzi",
    "Murehwa",
    "Mutoko",
    "Seke",
    "UMP",
    "Wedza",
  ],
  "Mashonaland West": [
    "Chegutu",
    "Hurungwe",
    "Kariba",
    "Makonde",
    "Mhondoro-Ngezi",
    "Zvimba",
    "Sanyati",
    "Kadoma",
  ],
  Masvingo: [
    "Bikita",
    "Chiredzi",
    "Chivi",
    "Gutu",
    "Masvingo",
    "Mwenezi",
    "Zaka",
  ],
  "Matabeleland North": [
    "Binga",
    "Bubi",
    "Hwange",
    "Lupane",
    "Nkayi",
    "Tsholotsho",
    "Umguza",
  ],
  "Matabeleland South": [
    "Beitbridge",
    "Bulilima",
    "Gwanda",
    "Insiza",
    "Mangwe",
    "Matobo",
    "Umzingwane",
  ],
  Midlands: [
    "Chirumhanzu",
    "Gokwe North",
    "Gokwe South",
    "Gweru",
    "Kwekwe",
    "Mberengwa",
    "Shurugwi",
    "Zvishavane",
  ],
};

const CACHE_KEY = "emergencyContacts";
const CACHE_TIMESTAMP_KEY = "emergencyContactsTimestamp";
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours
const PAGE_SIZE = 15; // Load 15 contacts at a time

const EmergencyContacts = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [displayedContacts, setDisplayedContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
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
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showNotFoundForm, setShowNotFoundForm] = useState(false);
  const [stationName, setStationName] = useState("");
  const [stationProvince, setStationProvince] = useState("");
  const [stationDistrict, setStationDistrict] = useState("");
  const [stationContact, setStationContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const flatListRef = useRef(null);
  const isOnline = useNetworkStatus();

  useEffect(() => {
    fetchFirstPage();
  }, []);

  useEffect(() => {
    if (isOnline && contacts.length > 0) {
      refreshDataIfNeeded();
    }
  }, [isOnline]);

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
    applyFilters();
  }, [searchTerm, selectedProvince, selectedDistrict, contacts]);

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

  const fetchFirstPage = async () => {
    setLoading(true);
    try {
      // Try to load from cache first
      const cachedData = await loadFromCache();
      
      if (cachedData) {
        setContacts(cachedData);
        setFilteredContacts(cachedData);
        setDisplayedContacts(cachedData.slice(0, PAGE_SIZE));
        setTotalContacts(cachedData.length);
        setUsingCachedData(true);
        setHasMore(cachedData.length > PAGE_SIZE);
      }

      // If online, fetch fresh data
      if (isOnline) {
        const resultList = await pb.collection("contacts").getList(1, PAGE_SIZE, {
          sort: "station",
        });

        const newContacts = resultList.items;
        setContacts(newContacts);
        setFilteredContacts(newContacts);
        setDisplayedContacts(newContacts);
        setTotalContacts(resultList.totalItems);
        setUsingCachedData(false);
        setCurrentPage(1);
        setHasMore(resultList.totalItems > PAGE_SIZE);

        await saveToCache(newContacts);
      } else if (!cachedData) {
        Alert.alert(
          "Offline Mode",
          "Connect to internet to load police stations. You can search cached data if available.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Failed to fetch first page:", error);
      if (!isOnline && !contacts.length) {
        Alert.alert(
          "Connection Error",
          "Unable to load police stations. Please check your connection.",
          [{ text: "OK" }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMoreContacts = async () => {
    if (!hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      
      if (isOnline) {
        const resultList = await pb.collection("contacts").getList(
          nextPage,
          PAGE_SIZE,
          { sort: "station" }
        );

        const newContacts = [...contacts, ...resultList.items];
        setContacts(newContacts);
        setFilteredContacts(newContacts);
        setDisplayedContacts(newContacts.slice(0, nextPage * PAGE_SIZE));
        setCurrentPage(nextPage);
        setHasMore(resultList.totalItems > newContacts.length);

        await saveToCache(newContacts);
      } else {
        // Load more from cache
        const cachedData = await loadFromCache();
        if (cachedData) {
          const startIndex = currentPage * PAGE_SIZE;
          const endIndex = startIndex + PAGE_SIZE;
          const moreContacts = cachedData.slice(0, endIndex);
          
          setDisplayedContacts(moreContacts);
          setCurrentPage(nextPage);
          setHasMore(cachedData.length > moreContacts.length);
        }
      }
    } catch (error) {
      console.error("Failed to load more:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const downloadAllContacts = async () => {
    if (!isOnline) {
      Alert.alert(
        "No Internet",
        "You need internet connection to download all contacts."
      );
      return;
    }

    setDownloadModalVisible(true);
    setDownloading(true);

    try {
      const allContacts = await pb.collection("contacts").getFullList({
        sort: "station",
      });

      setContacts(allContacts);
      setFilteredContacts(allContacts);
      setDisplayedContacts(allContacts);
      setTotalContacts(allContacts.length);
      setHasMore(false);
      setUsingCachedData(false);

      await saveToCache(allContacts);

      Alert.alert(
        "Success",
        `Downloaded all ${allContacts.length} contacts for offline use.`
      );
    } catch (error) {
      console.error("Failed to download all contacts:", error);
      Alert.alert("Error", "Failed to download all contacts.");
    } finally {
      setDownloading(false);
      setDownloadModalVisible(false);
    }
  };

  const applyFilters = () => {
    let results = contacts;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        (contact) =>
          contact.station.toLowerCase().includes(term) ||
          (contact.member_in_charge &&
            contact.member_in_charge.toLowerCase().includes(term)) ||
          (contact.specialty && contact.specialty.toLowerCase().includes(term))
      );
    }

    if (selectedProvince) {
      results = results.filter(
        (contact) => contact.province === selectedProvince
      );
    }

    if (selectedDistrict) {
      results = results.filter(
        (contact) => contact.district === selectedDistrict
      );
    }

    setFilteredContacts(results);
    setDisplayedContacts(results.slice(0, currentPage * PAGE_SIZE));
    setHasMore(results.length > displayedContacts.length);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedProvince("");
    setSelectedDistrict("");
  };

  const handleRefresh = async () => {
    if (!isOnline) {
      Alert.alert(
        "Offline",
        "Connect to internet to refresh data. You're viewing cached contacts."
      );
      return;
    }

    setRefreshing(true);
    await fetchFirstPage();
    setRefreshing(false);
  };

  const refreshDataIfNeeded = async () => {
    try {
      const cacheTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp, 10);
        const now = Date.now();

        if (now - timestamp > 60 * 60 * 1000) {
          await fetchFirstPage();
        }
      }
    } catch (error) {
      console.error("Error checking cache timestamp:", error);
    }
  };

  const formatText = (text) => {
    if (!text) return "";
    // Replace underscores with spaces and capitalize first letter of each word
    return text
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleSubmitStationRequest = async () => {
    if (!stationName.trim()) {
      Alert.alert("Error", "Please enter the police station name");
      return;
    }

    if (!stationProvince) {
      Alert.alert("Error", "Please select a province");
      return;
    }

    setSubmitting(true);
    try {
      // Here you would typically send this to your backend
      // For now, we'll simulate the submission
      const data = {
        station_name: stationName,
        province: stationProvince,
        district: stationDistrict,
        contact_number: stationContact,
        status: "pending",
        created: new Date().toISOString(),
      };

      console.log("Station request submitted:", data);
      
      Alert.alert(
        "Request Submitted",
        `Thank you! We've received your request for "${stationName}" in ${stationProvince}. We'll add it to our database soon.`,
        [
          {
            text: "OK",
            onPress: () => {
              setShowNotFoundForm(false);
              resetForm();
            }
          }
        ]
      );

      // In a real app, you would send this to your backend:
      // await pb.collection('station_requests').create(data);

    } catch (error) {
      console.error("Error submitting request:", error);
      Alert.alert("Error", "Failed to submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStationName("");
    setStationProvince("");
    setStationDistrict("");
    setStationContact("");
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
          {formatText(item.district)}, {formatText(item.province)}
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
        <ActivityIndicator size="small" color="#4a6da7" />
        <Text style={styles.loadingMoreText}>Loading more stations...</Text>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />

      <CustomHeader
        title="Police Stations"
        subtitle="Find police stations nationwide"
        showBackButton={true}
        onBack={() => navigation.goBack()}
        showLogo={false}
      />

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
            />
            {searchTerm ? (
              <TouchableOpacity onPress={() => setSearchTerm("")}>
                <Ionicons name="close-circle" size={20} color="#cbd5e0" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
                <Ionicons 
                  name="filter" 
                  size={20} 
                  color={showFilters ? "#4a6da7" : "#718096"} 
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Status Bar */}
          <View style={styles.statusBar}>
            {!isOnline ? (
              <View style={styles.statusItem}>
                <MaterialIcons name="signal-wifi-off" size={14} color="#e53e3e" />
                <Text style={[styles.statusText, { color: "#e53e3e" }]}>
                  Offline
                </Text>
              </View>
            ) : usingCachedData ? (
              <View style={styles.statusItem}>
                <MaterialIcons name="cached" size={14} color="#d69e2e" />
                <Text style={[styles.statusText, { color: "#d69e2e" }]}>
                  Cached • <Text style={styles.refreshLink} onPress={handleRefresh}>Refresh</Text>
                </Text>
              </View>
            ) : null}
            
            {contacts.length > 0 && (
              <View style={styles.statusItem}>
                <Ionicons name="location" size={14} color="#4a6da7" />
                <Text style={styles.statusText}>
                  {displayedContacts.length} of {totalContacts} shown
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Filters Panel */}
        {showFilters && (
          <View style={styles.filtersPanel}>
            <View style={styles.filterRow}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Province</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                        {province}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {selectedProvince && (
                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>District</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                          {district}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Ionicons name="close" size={16} color="#718096" />
                <Text style={styles.clearButtonText}>Clear Filters</Text>
              </TouchableOpacity>
              
              {isOnline && (
                <TouchableOpacity 
                  style={styles.downloadButton}
                  onPress={downloadAllContacts}
                >
                  <Ionicons name="download-outline" size={16} color="#4a6da7" />
                  <Text style={styles.downloadButtonText}>Download All</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Results */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a6da7" />
            <Text style={styles.loadingText}>Loading police stations...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayedContacts}
            renderItem={renderContactItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMoreContacts}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#4a6da7"]}
                tintColor="#4a6da7"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color="#cbd5e0" />
                <Text style={styles.emptyTitle}>No stations found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchTerm || selectedProvince || selectedDistrict
                    ? "Try adjusting your search or filters"
                    : "Connect to internet to load stations"}
                </Text>
                {(searchTerm || selectedProvince || selectedDistrict) && (
                  <TouchableOpacity style={styles.emptyButton} onPress={clearFilters}>
                    <Text style={styles.emptyButtonText}>Clear Search & Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            ListHeaderComponent={
              <TouchableOpacity 
                style={styles.notFoundButton}
                onPress={() => setShowNotFoundForm(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color="#4a6da7" />
                <Text style={styles.notFoundButtonText}>Can't find a police station?</Text>
              </TouchableOpacity>
            }
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      {/* "Can't Find" Form Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showNotFoundForm}
        onRequestClose={() => setShowNotFoundForm(false)}
      >
        <View style={styles.formModalOverlay}>
          <View style={styles.formModalContent}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Request a Police Station</Text>
              <TouchableOpacity 
                onPress={() => setShowNotFoundForm(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#718096" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.formDescription}>
                Help us improve our database by submitting police stations that are not listed.
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Police Station Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter station name"
                  value={stationName}
                  onChangeText={setStationName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Province *</Text>
                <View style={styles.formSelect}>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Select province"
                    value={stationProvince}
                    onChangeText={setStationProvince}
                  />
                  <ScrollView horizontal style={styles.provinceScroll}>
                    {Object.keys(zimbabweProvinces).map((province) => (
                      <TouchableOpacity
                        key={province}
                        style={[
                          styles.provincePill,
                          stationProvince === province && styles.provincePillActive,
                        ]}
                        onPress={() => setStationProvince(province)}
                      >
                        <Text style={[
                          styles.provincePillText,
                          stationProvince === province && styles.provincePillTextActive,
                        ]}>
                          {province}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {stationProvince && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>District (Optional)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter district"
                    value={stationDistrict}
                    onChangeText={setStationDistrict}
                  />
                  {zimbabweProvinces[stationProvince] && (
                    <ScrollView horizontal style={styles.districtScroll}>
                      {zimbabweProvinces[stationProvince].map((district) => (
                        <TouchableOpacity
                          key={district}
                          style={[
                            styles.districtPill,
                            stationDistrict === district && styles.districtPillActive,
                          ]}
                          onPress={() => setStationDistrict(district)}
                        >
                          <Text style={[
                            styles.districtPillText,
                            stationDistrict === district && styles.districtPillTextActive,
                          ]}>
                            {district}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Contact Number (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter contact number"
                  value={stationContact}
                  onChangeText={setStationContact}
                  keyboardType="phone-pad"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmitStationRequest}
                disabled={submitting || !stationName || !stationProvince}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                    <Text style={styles.submitButtonText}>Submit Request</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.formNote}>
                Your submission will be reviewed and added to our database within 24-48 hours.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Download Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={downloadModalVisible}
        onRequestClose={() => setDownloadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#4a6da7" />
            <Text style={styles.modalText}>
              {downloading ? "Downloading all contacts..." : "Processing..."}
            </Text>
            <Text style={styles.modalSubtext}>
              This may take a moment depending on your connection
            </Text>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
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
    marginTop: 8,
    paddingHorizontal: 4,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    color: "#718096",
    marginLeft: 4,
  },
  refreshLink: {
    color: "#4a6da7",
    fontWeight: "600",
  },
  filtersPanel: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterGroup: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4a5568",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#f7fafc",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterPillActive: {
    backgroundColor: "#4a6da7",
    borderColor: "#4a6da7",
  },
  filterPillText: {
    fontSize: 13,
    color: "#718096",
    fontWeight: "500",
  },
  filterPillTextActive: {
    color: "#fff",
  },
  filterActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    fontSize: 13,
    color: "#718096",
    marginLeft: 4,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#f0f4ff",
    borderRadius: 6,
  },
  downloadButtonText: {
    fontSize: 13,
    color: "#4a6da7",
    fontWeight: "600",
    marginLeft: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  notFoundButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f4ff",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#4a6da7",
    borderStyle: "dashed",
  },
  notFoundButtonText: {
    fontSize: 14,
    color: "#4a6da7",
    fontWeight: "600",
    marginLeft: 8,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
  },
  inChargeText: {
    fontSize: 11,
    color: "#4a6da7",
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
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 20,
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
    color: "#4a6da7",
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
  // Form Modal Styles
  formModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  formModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2d3748",
  },
  closeButton: {
    padding: 4,
  },
  formScroll: {
    padding: 20,
  },
  formDescription: {
    fontSize: 14,
    color: "#718096",
    marginBottom: 20,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4a5568",
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: "#f7fafc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#2d3748",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  formSelect: {
    marginBottom: 8,
  },
  provinceScroll: {
    marginTop: 8,
  },
  provincePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f7fafc",
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  provincePillActive: {
    backgroundColor: "#4a6da7",
    borderColor: "#4a6da7",
  },
  provincePillText: {
    fontSize: 12,
    color: "#718096",
  },
  provincePillTextActive: {
    color: "#fff",
  },
  districtScroll: {
    marginTop: 8,
  },
  districtPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#f7fafc",
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  districtPillActive: {
    backgroundColor: "#4a6da7",
    borderColor: "#4a6da7",
  },
  districtPillText: {
    fontSize: 11,
    color: "#718096",
  },
  districtPillTextActive: {
    color: "#fff",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4a6da7",
    padding: 16,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  formNote: {
    fontSize: 12,
    color: "#a0aec0",
    textAlign: "center",
    fontStyle: "italic",
  },
  // Download Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    width: width * 0.8,
  },
  modalText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d3748",
    marginTop: 16,
    marginBottom: 8,
  },
  modalSubtext: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
  },
});

export default EmergencyContacts;
import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Picker } from "@react-native-picker/picker";
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
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const EmergencyContacts = () => {
  const navigation = useNavigation();
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [districts, setDistricts] = useState([]);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const router = useRouter();

  // Use the custom network status hook
  const isOnline = useNetworkStatus();

  // Load contacts from cache or API
  useEffect(() => {
    loadData();
  }, []);

  // React to network status changes
  useEffect(() => {
    if (isOnline && contacts.length > 0) {
      // When coming back online, try to refresh data
      refreshDataIfNeeded();
    }
  }, [isOnline]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Always try to load from cache first
      const cachedData = await loadFromCache();

      if (cachedData) {
        setContacts(cachedData);
        setFilteredContacts(cachedData);
        setUsingCachedData(true);
      }

      // If online, try to fetch fresh data
      if (isOnline) {
        await fetchContacts();
      } else if (!cachedData) {
        Alert.alert(
          "No Internet Connection",
          "No cached data available. Please connect to the internet to load police station contacts.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load contacts. Please try again.", [
        { text: "OK" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // const loadFromCache = async () => {
  //   try {
  //     const cachedContacts = await AsyncStorage.getItem(CACHE_KEY);
  //     const cacheTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);

  //     if (cachedContacts && cacheTimestamp) {
  //       const timestamp = parseInt(cacheTimestamp, 10);
  //       const now = Date.now();

  //       // Check if cache is still valid (within 24 hours)
  //       if (now - timestamp < CACHE_EXPIRY_TIME) {
  //         return JSON.parse(cachedContacts);
  //       } else {
  //         // Cache is expired, but we can still use it if offline
  //         if (!isOnline) {
  //           return JSON.parse(cachedContacts);
  //         }
  //       }
  //     }

  //     return null;
  //   } catch (error) {
  //     console.error("Error loading from cache:", error);
  //     return null;
  //   }
  // };

  // const saveToCache = async (data) => {
  //   try {
  //     await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  //     await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  //   } catch (error) {
  //     console.error("Error saving to cache:", error);
  //   }
  // };

  const loadFromCache = async () => {
    try {
      console.log("Attempting to load from cache...");
      const cachedContacts = await AsyncStorage.getItem(CACHE_KEY);
      const cacheTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (cachedContacts && cacheTimestamp) {
        console.log("Found cached data");
        const timestamp = parseInt(cacheTimestamp, 10);
        const now = Date.now();

        if (now - timestamp < CACHE_EXPIRY_TIME) {
          console.log("Cache is valid");
          return JSON.parse(cachedContacts);
        } else {
          console.log("Cache is expired");
          if (!isOnline) {
            console.log("Using expired cache because offline");
            return JSON.parse(cachedContacts);
          }
        }
      }

      console.log("No valid cache available");
      return null;
    } catch (error) {
      console.error("Error loading from cache:", error);
      return null;
    }
  };

  const saveToCache = async (data) => {
    try {
      console.log("Saving data to cache...");
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log("Data saved to cache successfully");
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  };

  const fetchContacts = async () => {
    if (!isOnline) {
      return;
    }

    setSyncing(true);
    try {
      const records = await pb.collection("contacts").getFullList();
      setContacts(records);
      setFilteredContacts(records);
      setUsingCachedData(false);

      // Save to cache
      await saveToCache(records);
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
      // Alert.alert(
      //   "Sync Error",
      //   "Failed to sync contacts from server. Using cached data if available.",
      //   [{ text: "OK" }]
      // );
      console.log("Sync Error: Using cached data due to sync error");
    } finally {
      setSyncing(false);
    }
  };

  const refreshDataIfNeeded = async () => {
    try {
      const cacheTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp, 10);
        const now = Date.now();

        // If cache is older than 1 hour, refresh automatically
        if (now - timestamp > 60 * 60 * 1000) {
          await fetchContacts();
        }
      }
    } catch (error) {
      console.error("Error checking cache timestamp:", error);
    }
  };

  const handleRefresh = async () => {
    if (!isOnline) {
      Alert.alert(
        "No Internet Connection",
        "Cannot refresh data while offline. Connect to the internet and try again.",
        [{ text: "OK" }]
      );
      return;
    }

    await fetchContacts();
  };

  // Update districts when province changes
  useEffect(() => {
    if (selectedProvince) {
      setDistricts(zimbabweProvinces[selectedProvince] || []);
      setSelectedDistrict("");
    } else {
      setDistricts([]);
      setSelectedDistrict("");
    }
  }, [selectedProvince]);

  // Apply filters when any filter changes
  useEffect(() => {
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
  }, [searchTerm, selectedProvince, selectedDistrict, contacts]);

  const handleContactPress = (contact) => {
    router.push({
      pathname: "/contactDetails",
      params: {
        id: contact.id,
        station: contact.station,
        province: contact.province,
        district: contact.district,
        station_number: contact.station_number,
        whatsapp_number: contact.whatsapp_number,
        member_in_charge: contact.member_in_charge,
        member_in_charge_number: contact.member_in_charge_number,
        specialty: contact.specialty,
      },
    });
  };

  const renderContactItem = ({ item }) => (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={() => handleContactPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.contactIcon}>
        {/* <FontAwesome5 name="building" size={16} color="#4a6da7" /> */}
        <Image source={require("../../assets/images/logo.jpg")} style={{ width: 50, height: 50,objectFit:'contain' }} />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.stationName}>{item.station}</Text>
        <Text style={styles.locationText}>
          {item.province} • {item.district}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#a0aec0" />
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <CustomHeader
        title="Police Stations"
        // subtitle="Search and Discover Police Stations"
        showBackButton={true}
        onBack={() => navigation.goBack()}
        showLogo={false}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search and Filters */}
        <View style={styles.filterContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search stations..."
            placeholderTextColor="#a0aec0"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />

          <View style={styles.pickerRow}>
            <View style={[styles.pickerContainer, { marginRight: 10 }]}>
              <Picker
                selectedValue={selectedProvince}
                onValueChange={setSelectedProvince}
                style={styles.picker}
                dropdownIconColor="#718096"
              >
                <Picker.Item label="All Provinces" value="" />
                {Object.keys(zimbabweProvinces).map((province) => (
                  <Picker.Item
                    key={province}
                    label={province}
                    value={province}
                  />
                ))}
              </Picker>
            </View>

            {selectedProvince && (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedDistrict}
                  onValueChange={setSelectedDistrict}
                  style={styles.picker}
                  dropdownIconColor="#718096"
                >
                  <Picker.Item label="All Districts" value="" />
                  {districts.map((district) => (
                    <Picker.Item
                      key={district}
                      label={district}
                      value={district}
                    />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          {/* Network Status Banner */}
          {!isOnline && (
            <View style={styles.offlineBanner}>
              <MaterialIcons name="signal-wifi-off" size={16} color="#fff" />
              <Text style={styles.offlineText}>
                Offline Mode - Showing cached data
              </Text>
            </View>
          )}

          {/* Cache Status Banner */}
          {isOnline && usingCachedData && (
            <View style={styles.cacheStatusBanner}>
              <MaterialIcons name="cached" size={16} color="#2d3748" />
              <Text style={styles.cacheStatusText}>Showing cached data</Text>
              <TouchableOpacity
                onPress={handleRefresh}
                style={styles.refreshButton}
              >
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a6da7" />
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {filteredContacts.length}{" "}
                {filteredContacts.length === 1 ? "Station" : "Stations"}
              </Text>
              {syncing && (
                <View style={styles.syncingContainer}>
                  <ActivityIndicator
                    size="small"
                    color="#4a6da7"
                    style={{ marginLeft: 8 }}
                  />
                  <Text style={styles.syncingText}>Syncing...</Text>
                </View>
              )}
            </View>

            {filteredContacts.length === 0 ? (
              <View style={styles.emptyState}>
                <FontAwesome5 name="building" size={40} color="#cbd5e0" />
                <Text style={styles.emptyText}>No stations found</Text>
                <Text style={styles.emptySubtext}>
                  Try adjusting your search filters
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredContacts}
                renderItem={renderContactItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
          </View>
        )}
      </ScrollView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  contentContainer: {
    paddingBottom: 32,
  },
  filterContainer: {
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: {
    height: 48,
    paddingHorizontal: 16,
    backgroundColor: "#f7fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 16,
    color: "#2d3748",
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    backgroundColor: "#f7fafc",
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    color: "#2d3748",
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e53e3e",
    padding: 8,
    borderRadius: 4,
    marginTop: 12,
  },
  offlineText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 12,
  },
  cacheStatusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7fafc",
    padding: 8,
    borderRadius: 4,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cacheStatusText: {
    color: "#2d3748",
    marginLeft: 8,
    fontSize: 12,
    flex: 1,
  },
  refreshButton: {
    backgroundColor: "#4a6da7",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
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
  resultsContainer: {
    paddingHorizontal: 16,
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2d3748",
    flex: 1,
  },
  syncingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  syncingText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#718096",
  },
  contactCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
  },
  contactIcon: {
    // backgroundColor: "#ebf2ff",
    padding: 5,
    borderRadius: 8,
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d3748",
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    color: "#718096",
  },
  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#4a5568",
    marginTop: 16,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#a0aec0",
    marginTop: 4,
  },
});

export default EmergencyContacts;
